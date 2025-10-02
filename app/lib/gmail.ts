import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'

export function getGmailClient(accessToken: string, refreshToken?: string) {
  // Use the same client ID/secret and redirect as the Gmail OAuth flow
  const oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/gmail/callback`
  )

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  })

  return google.gmail({ version: 'v1', auth: oauth2Client })
}

export async function fetchEmails(
  accessToken: string,
  refreshToken?: string,
  query?: string
) {
  // If no custom query provided, use default for shopping sites
  if (!query) {
    query = '(from:amazon.co.jp OR from:rakuten.co.jp OR from:yahoo.co.jp OR from:amazon.com OR from:"Amazon" OR from:"楽天" OR from:"Yahoo") newer_than:90d'
  }
  const gmail = getGmailClient(accessToken, refreshToken)

  try {
    // List messages matching the query
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 500,  // Increased to fetch 3 months of emails
    })

    if (!response.data.messages) {
      return []
    }

    // Fetch full message details for each message
    const messages = await Promise.all(
      response.data.messages.map(async (message) => {
        const fullMessage = await gmail.users.messages.get({
          userId: 'me',
          id: message.id!,
          format: 'full',
        })
        return fullMessage.data
      })
    )

    return messages
  } catch (error) {
    console.error('Error fetching emails:', error)
    throw error
  }
}

export function parseEmailContent(message: any) {
  const headers = message.payload?.headers || []
  const from = headers.find((h: any) => h.name === 'From')?.value || ''
  const subject = headers.find((h: any) => h.name === 'Subject')?.value || ''
  const date = headers.find((h: any) => h.name === 'Date')?.value || ''

  // Extract body text
  let bodyText = ''
  let bodyHtml = ''

  const decodeData = (data: string): string => {
    try {
      const normalized = data.replace(/-/g, '+').replace(/_/g, '/')
      const pad = normalized.length % 4
      const padded = normalized + (pad ? '='.repeat(4 - pad) : '')
      return Buffer.from(padded, 'base64').toString('utf-8')
    } catch {
      try {
        return Buffer.from(data, 'base64').toString('utf-8')
      } catch {
        return ''
      }
    }
  }

  const extractBody = (part: any): void => {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      bodyText += decodeData(part.body.data)
    } else if (part.mimeType === 'text/html' && part.body?.data) {
      bodyHtml += decodeData(part.body.data)
    }

    if (part.parts) {
      part.parts.forEach(extractBody)
    }
  }

  if (message.payload) {
    extractBody(message.payload)
  }

  if (!bodyText && !bodyHtml && message.payload?.body?.data) {
    const raw = message.payload.body.data as string
    bodyText = decodeData(raw)
  }

  if (!bodyText && bodyHtml) {
    const text = bodyHtml
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|tr)>/gi, '\n')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
    bodyText = text
  }

  return {
    id: message.id,
    from,
    subject,
    date: new Date(date),
    bodyText,
    bodyHtml,
    snippet: message.snippet,
  }
}
