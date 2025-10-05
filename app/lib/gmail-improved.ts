import { google, gmail_v1 } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'

interface EmailFetchOptions {
  query?: string
  maxResults?: number
  pageToken?: string
  batchSize?: number
}

interface BatchEmailResult {
  messages: gmail_v1.Schema$Message[]
  nextPageToken?: string | null
  totalProcessed: number
}

export class ImprovedGmailClient {
  private oauth2Client: OAuth2Client
  private gmail: gmail_v1.Gmail

  constructor(accessToken: string, refreshToken?: string) {
    // Align with the Gmail OAuth flow configuration
    this.oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/gmail/callback`
    )

    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    })

    // Set up automatic token refresh
    this.oauth2Client.on('tokens', (tokens) => {
      if (tokens.refresh_token) {
        // Store the new refresh token
        console.log('New refresh token received')
      }
      this.oauth2Client.setCredentials(tokens)
    })

    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client })
  }

  /**
   * Fetch emails with pagination support
   */
  async fetchEmailsPaginated(options: EmailFetchOptions): Promise<BatchEmailResult> {
    const {
      query = this.getDefaultQuery(),
      maxResults = 500,  // Increased to fetch 3 months of emails including non-transaction emails
      pageToken,
      batchSize = 10
    } = options

    try {
      // List messages with pagination
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults,
        pageToken,
      })

      if (!response.data.messages) {
        return {
          messages: [],
          nextPageToken: null,
          totalProcessed: 0
        }
      }

      // Process messages in batches
      const messages = await this.fetchMessageBatch(
        response.data.messages.map(m => m.id!),
        batchSize
      )

      return {
        messages,
        nextPageToken: response.data.nextPageToken,
        totalProcessed: messages.length
      }
    } catch (error) {
      console.error('Error fetching emails:', error)
      throw error
    }
  }

  /**
   * Fetch multiple messages in parallel batches
   */
  private async fetchMessageBatch(
    messageIds: string[],
    batchSize: number
  ): Promise<gmail_v1.Schema$Message[]> {
    const results: gmail_v1.Schema$Message[] = []

    // Process in chunks to avoid overwhelming the API
    for (let i = 0; i < messageIds.length; i += batchSize) {
      const chunk = messageIds.slice(i, i + batchSize)
      const batchPromises = chunk.map(id =>
        this.fetchSingleMessage(id).catch(err => {
          console.error(`Failed to fetch message ${id}:`, err)
          return null
        })
      )

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults.filter(Boolean) as gmail_v1.Schema$Message[])

      // Rate limiting: wait 100ms between batches
      if (i + batchSize < messageIds.length) {
        await this.delay(100)
      }
    }

    return results
  }

  /**
   * Fetch a single message with error handling
   */
  private async fetchSingleMessage(messageId: string): Promise<gmail_v1.Schema$Message | null> {
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      })
      return response.data
    } catch (error: any) {
      if (error.code === 429) {
        // Rate limit hit, wait and retry
        await this.delay(2000)
        return this.fetchSingleMessage(messageId)
      }
      throw error
    }
  }

  /**
   * Get history of changes since a specific historyId
   */
  async getIncrementalChanges(startHistoryId: string): Promise<gmail_v1.Schema$History[]> {
    try {
      const response = await this.gmail.users.history.list({
        userId: 'me',
        startHistoryId,
        historyTypes: ['messageAdded'],
        maxResults: 500  // Increased for 3-month incremental sync
      })

      return response.data.history || []
    } catch (error) {
      // Propagate 404 so caller can clear history and fallback to full sync
      const code: any = (error as any)?.code || (error as any)?.response?.status
      if (code === 404) {
        const err = new Error('HISTORY_OUT_OF_RANGE') as any
        err.code = 404
        throw err
      }
      console.error('Error fetching history:', error)
      return []
    }
  }

  /**
   * Get the latest history ID for future incremental syncs
   */
  async getLatestHistoryId(): Promise<string | null> {
    try {
      const response = await this.gmail.users.getProfile({ userId: 'me' })
      return response.data.historyId || null
    } catch (error) {
      console.error('Error getting history ID:', error)
      return null
    }
  }

  /**
   * Check and refresh token if needed
   */
  async checkAndRefreshToken(): Promise<boolean> {
    try {
      const tokenInfo = await this.oauth2Client.getAccessToken()
      if (!tokenInfo.token) {
        return false
      }
      return true
    } catch (error) {
      console.error('Token refresh failed:', error)
      return false
    }
  }

  private getDefaultQuery(): string {
    // Default query for shopping sites - used when no custom query is provided
    return '(from:amazon.co.jp OR from:rakuten.co.jp OR from:yahoo.co.jp OR from:amazon.com OR from:"Amazon" OR from:"楽天" OR from:"Yahoo") newer_than:90d'
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Parse email content with improved structure
 */
export function parseEmailContentImproved(message: gmail_v1.Schema$Message) {
  const headers = message.payload?.headers || []
  const headerMap = new Map(headers.map(h => [h.name?.toLowerCase(), h.value]))

  const from = headerMap.get('from') || ''
  const subject = headerMap.get('subject') || ''
  const date = headerMap.get('date') || ''
  const messageId = headerMap.get('message-id') || message.id || ''

  // Extract body with better handling
  const bodies = {
    text: '',
    html: '',
    attachments: [] as Array<{ filename: string, mimeType: string, size: number }>
  }

  const decodeData = (data: string): string => {
    try {
      // Handle base64url variants used by Gmail
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

  const extractBody = (part: gmail_v1.Schema$MessagePart): void => {
    if (!part) return

    // Handle text/plain
    if (part.mimeType === 'text/plain' && part.body?.data) {
      bodies.text += decodeData(part.body.data)
    }

    // Handle text/html
    else if (part.mimeType === 'text/html' && part.body?.data) {
      bodies.html += decodeData(part.body.data)
    }

    // Handle attachments
    else if (part.filename && part.body?.attachmentId) {
      bodies.attachments.push({
        filename: part.filename,
        mimeType: part.mimeType || 'application/octet-stream',
        size: part.body.size || 0
      })
    }

    // Recursively process parts
    if (part.parts) {
      part.parts.forEach(extractBody)
    }
  }

  if (message.payload) {
    extractBody(message.payload)
  }

  // Fallback: sometimes body is directly on payload
  if (!bodies.text && !bodies.html && message.payload?.body?.data) {
    const raw = message.payload.body.data as unknown as string
    bodies.text = decodeData(raw)
  }

  // Fallback: derive text from HTML when text/plain is missing
  if (!bodies.text && bodies.html) {
    const html = bodies.html
    const text = html
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
    bodies.text = text
  }

  return {
    id: message.id,
    threadId: message.threadId,
    labelIds: message.labelIds || [],
    from,
    subject,
    date: new Date(date),
    bodyText: bodies.text,
    bodyHtml: bodies.html,
    snippet: message.snippet || '',
    attachments: bodies.attachments,
    historyId: message.historyId,
    internalDate: message.internalDate ? new Date(parseInt(message.internalDate)) : null
  }
}
