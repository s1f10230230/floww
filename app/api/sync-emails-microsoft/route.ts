import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase-server'
import { parseEmailV2 } from '@/app/lib/email-parser-v2'

interface MicrosoftMessage {
  id: string
  subject: string
  from: {
    emailAddress: {
      address: string
      name?: string
    }
  }
  receivedDateTime: string
  bodyPreview: string
  body: {
    contentType: string
    content: string
  }
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

    // Get Microsoft tokens
    const { data: profile } = await supabase
      .from('profiles')
      .select('microsoft_access_token, microsoft_refresh_token, microsoft_token_expiry')
      .eq('id', user.id)
      .single()

    if (!profile?.microsoft_access_token) {
      return NextResponse.json({
        error: 'Microsoft not connected. Please login with Microsoft.'
      }, { status: 400 })
    }

    // Check if token is expired and refresh if needed
    let accessToken = profile.microsoft_access_token
    if (profile.microsoft_token_expiry && new Date(profile.microsoft_token_expiry) < new Date()) {
      // Refresh token
      const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: process.env.AZURE_CLIENT_ID!,
          client_secret: process.env.AZURE_CLIENT_SECRET!,
          refresh_token: profile.microsoft_refresh_token!,
          grant_type: 'refresh_token',
          scope: 'https://graph.microsoft.com/Mail.Read offline_access'
        })
      })

      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json()
        accessToken = tokenData.access_token

        // Update tokens in database
        await supabase
          .from('profiles')
          .update({
            microsoft_access_token: accessToken,
            microsoft_token_expiry: new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
          })
          .eq('id', user.id)
      } else {
        return NextResponse.json({
          error: 'Token expired. Please re-authenticate with Microsoft.'
        }, { status: 401 })
      }
    }

    // Fetch messages from Microsoft Graph API
    // Get messages from the last 90 days
    const messagesResponse = await fetch(
      'https://graph.microsoft.com/v1.0/me/messages?$top=100&$orderby=receivedDateTime desc',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }
    )

    if (!messagesResponse.ok) {
      const errorText = await messagesResponse.text()
      console.error('Microsoft Graph API error:', errorText)
      return NextResponse.json({
        error: 'Failed to fetch Microsoft emails'
      }, { status: 500 })
    }

    const messagesData = await messagesResponse.json()
    const messages: MicrosoftMessage[] = messagesData.value || []

    console.log(`Fetched ${messages.length} messages from Microsoft Graph API`)

    let processedCount = 0
    let newTransactionsCount = 0

    // Process each message
    for (const message of messages) {
      try {
        const sender = message.from?.emailAddress?.address || ''
        const subject = message.subject || ''
        const receivedAt = new Date(message.receivedDateTime).toISOString()

        // Check if email already processed
        const { data: existingEmail } = await supabase
          .from('emails')
          .select('id')
          .eq('user_id', user.id)
          .eq('gmail_message_id', `microsoft:${message.id}`)
          .single()

        if (existingEmail) {
          continue // Skip already processed
        }

        const bodyText = message.body?.contentType === 'text'
          ? message.body.content
          : message.bodyPreview

        // Save email to database
        const { data: savedEmail, error: emailError } = await supabase
          .from('emails')
          .insert({
            user_id: user.id,
            gmail_message_id: `microsoft:${message.id}`,
            sender,
            subject,
            snippet: message.bodyPreview,
            body_text: bodyText,
            body_html: message.body?.contentType === 'html' ? message.body.content : null,
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
    console.error('[sync-emails-microsoft] Error:', error)
    return NextResponse.json({
      error: error.message || 'Failed to sync Microsoft emails'
    }, { status: 500 })
  }
}
