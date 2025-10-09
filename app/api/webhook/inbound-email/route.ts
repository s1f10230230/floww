import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/app/lib/supabase-server'
import { parseEmailV2 } from '@/app/lib/email-parser-v2'
import crypto from 'crypto'

// SendGrid Inbound Parse Webhook
export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data from SendGrid
    const formData = await request.formData()

    // Extract email data
    const from = formData.get('from') as string
    const to = formData.get('to') as string
    const subject = formData.get('subject') as string
    const text = formData.get('text') as string
    const html = formData.get('html') as string
    const envelope = JSON.parse(formData.get('envelope') as string || '{}')

    // Extract user ID from recipient email (user-{userId}@parse.yourdomain.com)
    const toMatch = to.match(/user-([a-f0-9-]+)@/)
    if (!toMatch) {
      return NextResponse.json({ error: 'Invalid recipient format' }, { status: 400 })
    }

    const userId = toMatch[1]

    // Simple validation: Check if sender is from known card companies
    // SendGrid Inbound Parse doesn't support signature verification
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

    const isFromCardIssuer = knownCardIssuers.some(domain =>
      from.toLowerCase().includes(domain)
    )

    if (!isFromCardIssuer) {
      console.log(`[Inbound Email] Ignored non-card email from: ${from}`)
      return NextResponse.json({
        success: true,
        message: 'Not a card company email'
      })
    }

    // Save to database
    const supabase = createServiceClient()

    // Create unique message ID
    const messageId = `webhook:${Date.now()}:${crypto.randomBytes(8).toString('hex')}`

    // Save email
    const { data: savedEmail } = await supabase
      .from('emails')
      .insert({
        user_id: userId,
        gmail_message_id: messageId,
        sender: from,
        subject: subject || '(no subject)',
        snippet: text?.substring(0, 200),
        body_text: text,
        body_html: html,
        received_at: new Date().toISOString(),
        is_processed: false
      })
      .select()
      .single()

    if (!savedEmail) {
      return NextResponse.json({ error: 'Failed to save email' }, { status: 500 })
    }

    // Parse for transactions
    const emailContent = `${subject}\n${text}`
    const parsedData = parseEmailV2(emailContent, from)

    let transactionCount = 0
    if (parsedData.transactions && parsedData.transactions.length > 0) {
      for (const txn of parsedData.transactions) {
        const { data: transaction } = await supabase
          .from('transactions')
          .insert({
            user_id: userId,
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

        if (transaction) transactionCount++
      }
    }

    // Mark as processed
    await supabase
      .from('emails')
      .update({ is_processed: true })
      .eq('id', savedEmail.id)

    console.log(`[Inbound Email] Processed: from=${from}, userId=${userId}, transactions=${transactionCount}`)

    return NextResponse.json({
      success: true,
      emailId: savedEmail.id,
      transactions: transactionCount
    })

  } catch (error: any) {
    console.error('[Inbound Email Webhook] Error:', error)
    return NextResponse.json({
      error: error.message || 'Failed to process inbound email'
    }, { status: 500 })
  }
}