import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase-server'
import { simpleParser } from 'mailparser'
import { parseEmailV2 } from '@/app/lib/email-parser-v2'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Check file size (Vercel Hobby plan limit: 4.5MB)
    const maxSize = 4 * 1024 * 1024 // 4MB (conservative to avoid Vercel 4.5MB limit)
    if (file.size > maxSize) {
      return NextResponse.json({
        error: `ファイルサイズが大きすぎます（最大4MB）。現在: ${(file.size / 1024 / 1024).toFixed(2)}MB。大きいファイルは分割してください。`
      }, { status: 400 })
    }

    // Read file content
    const buffer = Buffer.from(await file.arrayBuffer())
    const content = buffer.toString('utf-8')

    // Known card issuer domains for filtering
    const knownCardIssuers = [
      'rakuten-card.co.jp',
      'smbc-card.com',
      'jcb.co.jp',
      'aeon.co.jp',
      'saisoncard.co.jp',
      'eposcard.co.jp',
      'lifecard.co.jp',
      'orico.co.jp'
    ]

    let emailsProcessed = 0
    let newTransactions = 0
    let duplicates = 0

    // Parse MBOX format (multiple emails separated by "From " lines)
    const emailBlocks = content.split(/\nFrom /).filter(block => block.trim())

    for (const block of emailBlocks) {
      try {
        // Add back "From " prefix if it was split off
        const emailText = block.startsWith('From ') ? block : 'From ' + block

        // Parse email
        const parsed = await simpleParser(emailText)

        const from = parsed.from?.text || ''

        // Filter: Only card company emails
        const isFromCardIssuer = knownCardIssuers.some(domain =>
          from.toLowerCase().includes(domain)
        )

        if (!isFromCardIssuer) continue

        // Create unique message ID
        const messageId = parsed.messageId || `import:${Date.now()}:${crypto.randomBytes(8).toString('hex')}`

        // Check for duplicates
        const { data: existing } = await supabase
          .from('emails')
          .select('id')
          .eq('user_id', user.id)
          .eq('gmail_message_id', messageId)
          .single()

        if (existing) {
          duplicates++
          continue
        }

        // Save email
        const { data: savedEmail } = await supabase
          .from('emails')
          .insert({
            user_id: user.id,
            gmail_message_id: messageId,
            sender: from,
            subject: parsed.subject || '',
            snippet: parsed.text?.substring(0, 200),
            body_text: parsed.text,
            body_html: parsed.html || parsed.textAsHtml,
            received_at: parsed.date?.toISOString() || new Date().toISOString(),
            is_processed: false
          })
          .select()
          .single()

        if (!savedEmail) continue

        // Parse for transactions
        const emailContent = `${parsed.subject}\n${parsed.text}`
        const parsedData = parseEmailV2(emailContent, from)

        if (parsedData.transactions && parsedData.transactions.length > 0) {
          for (const txn of parsedData.transactions) {
            const { data: transaction } = await supabase
              .from('transactions')
              .insert({
                user_id: user.id,
                email_id: savedEmail.id,
                merchant: txn.merchant,
                amount: txn.amount,
                currency: 'JPY',
                transaction_date: txn.date,
                item_name: txn.itemName,
                is_subscription: false
              })
              .select()
              .single()

            if (transaction) newTransactions++
          }
        }

        // Mark as processed
        await supabase
          .from('emails')
          .update({ is_processed: true })
          .eq('id', savedEmail.id)

        emailsProcessed++

      } catch (emailError) {
        console.error('Error parsing individual email:', emailError)
        continue
      }
    }

    return NextResponse.json({
      success: true,
      emailsProcessed,
      newTransactions,
      duplicates
    })

  } catch (error: any) {
    console.error('[MBOX Import] Error:', error)
    return NextResponse.json({
      error: error.message || 'Failed to import emails'
    }, { status: 500 })
  }
}