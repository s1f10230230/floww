import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase-server'
import { ImprovedGmailClient, parseEmailContentImproved } from '@/app/lib/gmail-improved'
import { parseEmailV2, detectSubscriptionsV2 } from '@/app/lib/email-parser-v2'
import { parseEmail, detectSubscription } from '@/app/lib/parser'
import { extractCreditCardTransactions, registerCardFromTransaction } from '@/app/lib/credit-card-extractor'

interface ProcessedEmailResult {
  totalFetched: number
  totalProcessed: number
  newTransactions: number
  errors: string[]
  hasMore: boolean
  nextPageToken?: string
}

/**
 * Improved email sync endpoint with:
 * - Batch processing
 * - Pagination support
 * - Better error handling
 * - Token refresh
 * - Incremental sync capability
 */
export async function POST(request: Request) {
  const startTime = Date.now()
  const errors: string[] = []

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body for pagination
    const body = await request.json().catch(() => ({}))
    const { pageToken, maxResults = 500, incrementalSync = false } = body  // Increased default to 500 for 3-month data

    // Get user's tokens
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('gmail_access_token, gmail_refresh_token, last_sync_history_id')
      .eq('id', user.id)
      .single()

    const { data: { session } } = await supabase.auth.getSession()

    const accessToken = profile?.gmail_access_token || session?.provider_token
    const refreshToken = profile?.gmail_refresh_token || session?.provider_refresh_token

    if (!accessToken) {
      return NextResponse.json({
        error: 'Gmail not connected. Please logout and login again with Gmail permissions.'
      }, { status: 400 })
    }

    // Initialize improved Gmail client
    const gmailClient = new ImprovedGmailClient(accessToken, refreshToken)

    // Check token validity
    const isTokenValid = await gmailClient.checkAndRefreshToken()
    if (!isTokenValid) {
      return NextResponse.json({
        error: 'Token expired. Please re-authenticate.'
      }, { status: 401 })
    }

    // Build email query + runtime filters
    const { emailQuery, issuerFilters } = await buildEmailQueryWithFilters(supabase, user.id)

    let messages: any[] = []
    let nextPageToken: string | null | undefined = null

    // Incremental sync using history API
    if (incrementalSync && profile?.last_sync_history_id) {
      try {
        const history = await gmailClient.getIncrementalChanges(profile.last_sync_history_id)
        messages = history
          .flatMap(h => h.messagesAdded || [])
          .map(m => m.message)
          .filter(Boolean)

        console.log(`Incremental sync: found ${messages.length} new messages`)
      } catch (error) {
        console.warn('Incremental sync failed, falling back to full sync:', error)
        errors.push('Incremental sync failed, using full sync')
      }
    }

    // Full sync with pagination
    if (messages.length === 0) {
      const result = await gmailClient.fetchEmailsPaginated({
        query: emailQuery,
        maxResults,
        pageToken,
        batchSize: 10
      })

      messages = result.messages
      nextPageToken = result.nextPageToken
      console.log(`Fetched ${messages.length} emails (page token: ${pageToken || 'first page'})`)
    }

    // Get existing email IDs to avoid duplicates
    const existingEmailIds = await getExistingEmailIds(supabase, user.id, messages.map(m => m.id))

    // Process emails in batches
    const batchSize = 20
    const transactions: any[] = []
    const processedEmails: any[] = []

    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize)
      const batchResults = await processBatchEmails(
        batch,
        existingEmailIds,
        supabase,
        user.id,
        errors,
        issuerFilters
      )

      transactions.push(...batchResults.transactions)
      processedEmails.push(...batchResults.processedEmails)

      console.log(`Processed batch ${Math.floor(i / batchSize) + 1}: ${batchResults.transactions.length} transactions`)
    }

    // Update last sync history ID for next incremental sync
    if (messages.length > 0) {
      const latestHistoryId = await gmailClient.getLatestHistoryId()
      if (latestHistoryId) {
        await supabase
          .from('profiles')
          .update({ last_sync_history_id: latestHistoryId })
          .eq('id', user.id)
      }
    }

    // Detect and save subscriptions
    if (transactions.length > 0) {
      await detectAndSaveSubscriptions(supabase, user.id)
    }

    const processingTime = Date.now() - startTime

    return NextResponse.json({
      success: true,
      data: {
        totalFetched: messages.length,
        totalProcessed: processedEmails.length,
        newTransactions: transactions.length,
        hasMore: !!nextPageToken,
        nextPageToken,
        processingTime: `${processingTime}ms`,
        errors: errors.length > 0 ? errors : undefined
      },
      message: `${messages.length}件のメールから${transactions.length}件の取引を処理しました`
    })

  } catch (error: any) {
    console.error('Sync error:', error)
    return NextResponse.json({
      error: 'Failed to sync emails',
      details: error.message,
      errors
    }, { status: 500 })
  }
}

/**
 * Build optimized email query based on user's registered cards
 */
async function buildEmailQuery(supabase: any, userId: string): Promise<string> {
  const { data: userIssuers } = await supabase
    .from('user_card_issuers')
    .select('*, card_issuers(*)')
    .eq('user_id', userId)

  // Build query ONLY from user's registered card issuers
  if (!userIssuers || userIssuers.length === 0) {
    // If no cards registered, return empty query (no emails will be fetched)
    return 'newer_than:90d subject:"カード利用のお知らせ"' // Very restrictive fallback
  }

  const issuerQueries = userIssuers
    .map((ui: any) => {
      const issuer = ui.card_issuers
      if (issuer?.email_domain) {
        return `from:${issuer.email_domain}`
      }
      if (issuer?.email_keywords && issuer.email_keywords.length > 0) {
        return issuer.email_keywords.map((k: string) => `from:"${k}"`).join(' OR ')
      }
      return null
    })
    .filter(Boolean)

  if (issuerQueries.length === 0) {
    return 'newer_than:90d subject:"カード利用のお知らせ"' // Fallback
  }

  // Only user-selected card issuers, NO default Amazon/Rakuten/Yahoo
  const emailQuery = `(${issuerQueries.join(' OR ')}) newer_than:90d`

  return emailQuery
}

/**
 * Build email query with include/exclude and return aggregated runtime filters
 */
async function buildEmailQueryWithFilters(supabase: any, userId: string): Promise<{ emailQuery: string, issuerFilters: AggregatedFilters }> {
  const { data: userIssuers } = await supabase
    .from('user_card_issuers')
    .select('*, card_issuers(id, name, email_domain, email_keywords, include_from_domains, exclude_from_domains, include_subject_keywords, exclude_subject_keywords)')
    .eq('user_id', userId)

  const includeFromDomains = new Set<string>()
  const excludeFromDomains = new Set<string>()
  const includeSubjects = new Set<string>()
  const excludeSubjects = new Set<string>(['キャンペーン','アンケート','通信','ニュース','ポイント進呈','プレゼント','抽選','特別価格','クーポン','エントリー','Spot Mail'])

  if (!userIssuers || userIssuers.length === 0) {
    return {
      emailQuery: 'newer_than:90d subject:"カード利用のお知らせ"',
      issuerFilters: { includeFromDomains, excludeFromDomains, includeSubjects: new Set<string>(['カード利用のお知らせ','速報版','ご請求']), excludeSubjects }
    }
  }

  const issuerQueries: string[] = []

  userIssuers.forEach((ui: any) => {
    const issuer = ui.card_issuers
    if (!issuer) return

    ;(issuer.include_from_domains || []).forEach((d: string) => includeFromDomains.add(String(d).toLowerCase()))
    ;(issuer.exclude_from_domains || []).forEach((d: string) => excludeFromDomains.add(String(d).toLowerCase()))
    ;(issuer.include_subject_keywords || []).forEach((k: string) => includeSubjects.add(String(k)))
    ;(issuer.exclude_subject_keywords || []).forEach((k: string) => excludeSubjects.add(String(k)))

    const parts: string[] = []

    const froms = issuer.include_from_domains && issuer.include_from_domains.length > 0
      ? issuer.include_from_domains
      : (issuer.email_domain ? [issuer.email_domain] : [])

    if (froms.length > 0) {
      const fromGroup = froms.map((d: string) => `from:${d}`).join(' OR ')
      parts.push(froms.length > 1 ? `(${fromGroup})` : fromGroup)
    } else if (issuer.email_keywords && issuer.email_keywords.length > 0) {
      const kwGroup = issuer.email_keywords.map((k: string) => `from:\"${k}\"`).join(' OR ')
      parts.push(`(${kwGroup})`)
    }

    if (issuer.include_subject_keywords && issuer.include_subject_keywords.length > 0) {
      const subjInc = issuer.include_subject_keywords.map((k: string) => `subject:\"${k}\"`).join(' OR ')
      parts.push(`(${subjInc})`)
    }

    if (issuer.exclude_from_domains && issuer.exclude_from_domains.length > 0) {
      issuer.exclude_from_domains.forEach((d: string) => parts.push(`-from:${d}`))
    }

    if (issuer.exclude_subject_keywords && issuer.exclude_subject_keywords.length > 0) {
      issuer.exclude_subject_keywords.forEach((k: string) => parts.push(`-subject:\"${k}\"`))
    }

    if (parts.length > 0) {
      issuerQueries.push(parts.join(' '))
    }
  })

  if (issuerQueries.length === 0) {
    return {
      emailQuery: 'newer_than:90d subject:"カード利用のお知らせ"',
      issuerFilters: { includeFromDomains, excludeFromDomains, includeSubjects, excludeSubjects }
    }
  }

  const emailQuery = `(${issuerQueries.map(q => `(${q})`).join(' OR ')}) newer_than:90d`
  return { emailQuery, issuerFilters: { includeFromDomains, excludeFromDomains, includeSubjects, excludeSubjects } }
}

/**
 * Get existing email IDs to avoid duplicate processing
 */
async function getExistingEmailIds(
  supabase: any,
  userId: string,
  messageIds: string[]
): Promise<Set<string>> {
  const { data: existingEmails } = await supabase
    .from('emails')
    .select('gmail_message_id')
    .eq('user_id', userId)
    .in('gmail_message_id', messageIds)

  return new Set(existingEmails?.map((e: any) => e.gmail_message_id) || [])
}

/**
 * Process a batch of emails concurrently
 */
interface AggregatedFilters {
  includeFromDomains: Set<string>
  excludeFromDomains: Set<string>
  includeSubjects: Set<string>
  excludeSubjects: Set<string>
}

function parseDomain(from: string): string | null {
  const m = from?.match(/<([^>]+)>/)
  const email = m ? m[1] : (from?.includes('@') ? from : '')
  const dm = email?.match(/@([^>\s]+)/)
  return dm ? dm[1].toLowerCase() : null
}

function shouldParseEmail(from: string, subject: string, filters: AggregatedFilters): boolean {
  const sub = (subject || '').toLowerCase()
  const domain = (parseDomain(from || '') || '').toLowerCase()

  if (domain && filters.excludeFromDomains.has(domain)) return false
  for (const ex of filters.excludeSubjects) {
    if (ex && sub.includes(ex.toLowerCase())) return false
  }

  if (filters.includeSubjects.size > 0) {
    for (const inc of filters.includeSubjects) {
      if (inc && sub.includes(inc.toLowerCase())) return true
    }
    return false
  }

  return true
}

async function processBatchEmails(
  messages: any[],
  existingEmailIds: Set<string>,
  supabase: any,
  userId: string,
  errors: string[],
  issuerFilters: AggregatedFilters
): Promise<{ transactions: any[], processedEmails: any[] }> {
  const transactions: any[] = []
  const processedEmails: any[] = []

  for (const message of messages) {
    try {
      const parsed = parseEmailContentImproved(message)

      // Skip non-transactional emails using issuer filters
      if (!shouldParseEmail(parsed.from || '', parsed.subject || '', issuerFilters)) {
        continue
      }

      // Skip if already processed
      if (existingEmailIds.has(parsed.id!)) {
        continue
      }

      processedEmails.push({ from: parsed.from, subject: parsed.subject })

      // Save email to database
      const { data: savedEmail, error: emailError } = await supabase
        .from('emails')
        .insert({
          user_id: userId,
          gmail_message_id: parsed.id,
          sender: parsed.from,
          subject: parsed.subject,
          snippet: parsed.snippet,
          body_text: parsed.bodyText,
          body_html: parsed.bodyHtml,
          received_at: parsed.date,
          is_processed: false
        })
        .select()
        .single()

      if (emailError) {
        errors.push(`Failed to save email ${parsed.id}: ${emailError.message}`)
        continue
      }

      // Parse transactions - try new parser first
      const { transactions: parsedTransactions, metadata } = parseEmailV2(
        parsed.from,
        parsed.subject,
        parsed.bodyText,
        parsed.bodyHtml,
        parsed.date
      )

      let transactionsToSave = parsedTransactions

      // Try credit card extractor
      if (parsedTransactions.length === 0) {
        const creditCardTxs = extractCreditCardTransactions(
          parsed.from,
          parsed.subject,
          parsed.bodyText,
          parsed.bodyHtml
        )

        if (creditCardTxs.length > 0) {
          transactionsToSave = creditCardTxs.map(tx => ({
            merchant: tx.merchant,
            amount: tx.amount,
            itemName: tx.merchant,
            date: tx.date,
            category: tx.category,
            cardLast4: tx.cardLast4,
            cardBrand: tx.cardBrand
          }))

          // Auto-register credit cards
          for (const tx of creditCardTxs) {
            if (tx.cardLast4) {
              await registerCardFromTransaction(supabase, userId, tx.cardLast4, tx.cardBrand)
            }
          }
        }
      }

      // Fallback to old parser if needed
      if (transactionsToSave.length === 0) {
        const oldTransaction = parseEmail(parsed.from, parsed.bodyText, parsed.bodyHtml)
        if (oldTransaction) {
          transactionsToSave = [oldTransaction]
        }
      }

      // Save transactions
      for (const transaction of transactionsToSave) {
        const { data: savedTransaction, error: txError } = await supabase
          .from('transactions')
          .insert({
            user_id: userId,
            email_id: savedEmail.id,
            merchant: transaction.merchant,
            amount: transaction.amount,
            currency: 'JPY',
            category: transaction.category,
            item_name: transaction.itemName,
            transaction_date: transaction.date,
            is_subscription: transaction.isSubscription || false,
            card_last4: transaction.cardLast4,
            card_brand: transaction.cardBrand
          })
          .select()
          .single()

        if (txError) {
          errors.push(`Failed to save transaction for email ${parsed.id}: ${txError.message}`)
        } else if (savedTransaction) {
          transactions.push(savedTransaction)
        }
      }

      // Mark email as processed
      if (transactionsToSave.length > 0) {
        await supabase
          .from('emails')
          .update({
            is_processed: true,
            email_type: metadata.emailType,
            confidence_score: metadata.confidence
          })
          .eq('id', savedEmail.id)
      }

    } catch (error: any) {
      errors.push(`Error processing message: ${error.message}`)
      console.error('Error processing message:', error)
    }
  }

  return { transactions, processedEmails }
}

/**
 * Detect and save subscriptions from all transactions
 */
async function detectAndSaveSubscriptions(supabase: any, userId: string): Promise<void> {
  const { data: allTransactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('transaction_date', { ascending: false })

  if (!allTransactions) return

  const subscriptionsV2 = detectSubscriptionsV2(allTransactions)
  const subscriptions = subscriptionsV2.size > 0 ? subscriptionsV2 : detectSubscription(allTransactions)

  for (const [key, subscription] of subscriptions) {
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('service_name', subscription.serviceName)
      .eq('amount', subscription.amount)
      .single()

    if (!existing) {
      await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          service_name: subscription.serviceName,
          amount: subscription.amount,
          currency: 'JPY',
          billing_cycle: subscription.billingCycle,
          last_detected_date: subscription.lastDetected,
          first_detected_date: subscription.firstDetected,
          transaction_count: subscription.transactionCount,
          status: 'active'
        })
    } else {
      await supabase
        .from('subscriptions')
        .update({
          last_detected_date: subscription.lastDetected,
          transaction_count: subscription.transactionCount,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
    }
  }
}
