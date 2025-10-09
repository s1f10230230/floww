import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase-server'
import Imap from 'imap'
import { simpleParser } from 'mailparser'
import crypto from 'crypto'
import { parseEmailV2 } from '@/app/lib/email-parser-v2'

const ENCRYPTION_KEY = process.env.IMAP_ENCRYPTION_KEY || 'your-32-char-secret-key-here!!'
const ALGORITHM = 'aes-256-cbc'

function decrypt(text: string): string {
  const parts = text.split(':')
  const iv = Buffer.from(parts.shift()!, 'hex')
  const encryptedText = parts.join(':')
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv)
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

export async function POST(request: Request) {
  const startTime = Date.now()
  const errors: string[] = []

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get IMAP configuration
    const { data: profile } = await supabase
      .from('profiles')
      .select('imap_email, imap_password_encrypted, imap_host, imap_port, imap_enabled')
      .eq('id', user.id)
      .single()

    if (!profile?.imap_enabled || !profile.imap_password_encrypted) {
      return NextResponse.json({
        error: 'IMAP not configured. Please set up IMAP in settings.'
      }, { status: 400 })
    }

    const password = decrypt(profile.imap_password_encrypted)

    // Fetch emails via IMAP
    const emails = await fetchEmailsViaImap(
      profile.imap_email!,
      password,
      profile.imap_host!,
      profile.imap_port || 993
    )

    console.log(`Fetched ${emails.length} emails via IMAP`)

    let processedCount = 0
    let newTransactionsCount = 0

    // Process each email
    for (const email of emails) {
      try {
        const messageId = `imap:${email.messageId || email.date?.getTime() || Date.now()}`

        // Check if email already processed
        const { data: existingEmail } = await supabase
          .from('emails')
          .select('id')
          .eq('user_id', user.id)
          .eq('gmail_message_id', messageId)
          .single()

        if (existingEmail) continue

        // Save email to database
        const { data: savedEmail } = await supabase
          .from('emails')
          .insert({
            user_id: user.id,
            gmail_message_id: messageId,
            sender: email.from?.text || '',
            subject: email.subject || '',
            snippet: email.text?.substring(0, 200),
            body_text: email.text,
            body_html: email.html || email.textAsHtml,
            received_at: email.date?.toISOString() || new Date().toISOString(),
            is_processed: false
          })
          .select()
          .single()

        if (!savedEmail) continue

        // Parse email for transactions
        const emailContent = `${email.subject}\n${email.text}`
        const parsedData = parseEmailV2(emailContent, email.from?.text || '')

        // Debug: Log email structure and parse result
        console.log('Email parsed:', {
          from: email.from?.text,
          subject: email.subject,
          hasText: !!email.text,
          textLength: email.text?.length || 0,
          textPreview: email.text?.substring(0, 200),
          hasHtml: !!email.html,
          parsedTransactions: parsedData.transactions?.length || 0
        })

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

            if (transaction) newTransactionsCount++
          }
        }

        // Mark email as processed
        await supabase
          .from('emails')
          .update({ is_processed: true })
          .eq('id', savedEmail.id)

        processedCount++

      } catch (error: any) {
        console.error('Error processing email:', error)
        errors.push(`Error: ${error.message}`)
      }
    }

    const processingTime = Date.now() - startTime

    return NextResponse.json({
      success: true,
      totalFetched: emails.length,
      totalProcessed: processedCount,
      newTransactions: newTransactionsCount,
      errors,
      processingTimeMs: processingTime
    })

  } catch (error: any) {
    console.error('[sync-emails-imap] Error:', error)

    // Return detailed error information
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to sync IMAP emails',
      errorDetails: {
        name: error.name,
        stack: error.stack?.split('\n').slice(0, 3).join('\n')
      }
    }, { status: 500 })
  }
}

function fetchEmailsViaImap(
  user: string,
  password: string,
  host: string,
  port: number
): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user,
      password,
      host,
      port,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    })

    const emails: any[] = []

    imap.once('ready', () => {
      imap.openBox('INBOX', true, (err, box) => {
        if (err) {
          imap.end()
          return reject(err)
        }

        // Fetch last 90 days of emails
        const since = new Date()
        since.setDate(since.getDate() - 90)

        const searchCriteria = ['ALL', ['SINCE', since]]

        imap.search(searchCriteria, (err, uids) => {
          if (err) {
            imap.end()
            return reject(err)
          }

          if (!uids || uids.length === 0) {
            imap.end()
            return resolve([])
          }

          // Limit to 50 emails to avoid timeout (Vercel 10s limit)
          const recentUids = uids.slice(-50)
          console.log(`Found ${uids.length} emails, fetching last ${recentUids.length}`)

          const fetch = imap.fetch(recentUids, { bodies: '' })

          fetch.on('message', (msg) => {
            msg.on('body', (stream) => {
              simpleParser(stream, (err, parsed) => {
                if (!err && parsed) {
                  emails.push(parsed)
                }
              })
            })
          })

          fetch.once('error', (err) => {
            imap.end()
            reject(err)
          })

          fetch.once('end', () => {
            imap.end()
            resolve(emails)
          })
        })
      })
    })

    imap.once('error', (err) => {
      reject(err)
    })

    imap.connect()
  })
}
