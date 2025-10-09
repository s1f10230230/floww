import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase-server'
import { parseEmailV2, detectSubscriptionsV2 } from '@/app/lib/email-parser-v2'
import { extractCreditCardTransactions } from '@/app/lib/credit-card-extractor'

interface YahooMessage {
  id: string
  from: { email: string; name?: string }[]
  subject: string
  date: number
  snippet?: string
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

    // Get Yahoo tokens
    const { data: profile } = await supabase
      .from('profiles')
      .select('yahoo_access_token, yahoo_refresh_token, yahoo_token_expiry')
      .eq('id', user.id)
      .single()

    if (!profile?.yahoo_access_token) {
      return NextResponse.json({
        error: 'Yahoo not connected. Please login with Yahoo.'
      }, { status: 400 })
    }

    // Check if token is expired and refresh if needed
    let accessToken = profile.yahoo_access_token
    if (profile.yahoo_token_expiry && new Date(profile.yahoo_token_expiry) < new Date()) {
      // Refresh token
      const tokenResponse = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${process.env.YAHOO_CLIENT_ID}:${process.env.YAHOO_CLIENT_SECRET}`).toString('base64')}`
        },
        body: new URLSearchParams({
          refresh_token: profile.yahoo_refresh_token!,
          grant_type: 'refresh_token'
        })
      })

      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json()
        accessToken = tokenData.access_token

        // Update tokens in database
        await supabase
          .from('profiles')
          .update({
            yahoo_access_token: accessToken,
            yahoo_token_expiry: new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
          })
          .eq('id', user.id)
      } else {
        return NextResponse.json({
          error: 'Token expired. Please re-authenticate with Yahoo.'
        }, { status: 401 })
      }
    }

    // Fetch messages from Yahoo Mail API
    // Yahoo Mail API endpoint - fetch messages from last 90 days
    const messagesResponse = await fetch(
      'https://api.mail.yahoo.com/ws/v3/mailboxes/@/messages?startInfo=0&numInfo=100',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }
    )

    if (!messagesResponse.ok) {
      const errorText = await messagesResponse.text()
      console.error('Yahoo Mail API error:', errorText)
      return NextResponse.json({
        error: 'Failed to fetch Yahoo emails'
      }, { status: 500 })
    }

    const messagesData = await messagesResponse.json()
    const messages: YahooMessage[] = messagesData.messages || []

    console.log(`Fetched ${messages.length} messages from Yahoo Mail`)

    let processedCount = 0
    let newTransactionsCount = 0

    // Process each message
    for (const message of messages) {
      try {
        const sender = message.from[0]?.email || ''
        const subject = message.subject || ''
        const receivedAt = new Date(message.date * 1000).toISOString()

        // Check if email already processed
        const { data: existingEmail } = await supabase
          .from('emails')
          .select('id')
          .eq('user_id', user.id)
          .eq('gmail_message_id', `yahoo:${message.id}`)
          .single()

        if (existingEmail) {
          continue // Skip already processed
        }

        // Fetch full message content
        const messageResponse = await fetch(
          `https://api.mail.yahoo.com/ws/v3/mailboxes/@/messages/${message.id}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Accept': 'application/json'
            }
          }
        )

        if (!messageResponse.ok) {
          errors.push(`Failed to fetch message ${message.id}`)
          continue
        }

        const fullMessage = await messageResponse.json()
        const bodyText = fullMessage.text || fullMessage.html || message.snippet || ''

        // Save email to database
        const { data: savedEmail, error: emailError } = await supabase
          .from('emails')
          .insert({
            user_id: user.id,
            gmail_message_id: `yahoo:${message.id}`,
            sender,
            subject,
            snippet: message.snippet,
            body_text: bodyText,
            body_html: fullMessage.html,
            received_at: receivedAt,
            is_processed: false
          })
          .select()
          .single()

        if (emailError || !savedEmail) {
          errors.push(`Failed to save email ${message.id}`)
          continue
        }

        // Parse email for transactions
        const emailContent = `${subject}\n${bodyText}`
        const parsedData = parseEmailV2(emailContent, sender)

        if (parsedData.transactions && parsedData.transactions.length > 0) {
          // Extract and save transactions
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

            if (transaction) {
              newTransactionsCount++
            }
          }
        }

        // Mark email as processed
        await supabase
          .from('emails')
          .update({ is_processed: true })
          .eq('id', savedEmail.id)

        processedCount++

      } catch (error: any) {
        console.error(`Error processing message ${message.id}:`, error)
        errors.push(`Error: ${error.message}`)
      }
    }

    const processingTime = Date.now() - startTime

    return NextResponse.json({
      success: true,
      totalFetched: messages.length,
      totalProcessed: processedCount,
      newTransactions: newTransactionsCount,
      errors,
      processingTimeMs: processingTime
    })

  } catch (error: any) {
    console.error('[sync-emails-yahoo] Error:', error)
    return NextResponse.json({
      error: error.message || 'Failed to sync Yahoo emails'
    }, { status: 500 })
  }
}
