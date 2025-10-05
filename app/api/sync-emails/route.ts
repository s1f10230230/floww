import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase-server'
import { fetchEmails } from '@/app/lib/gmail'
import { parseEmailContentImproved } from '@/app/lib/gmail-improved'
import { parseEmail, detectSubscription } from '@/app/lib/parser'
import { parseEmailV2, detectSubscriptionsV2 } from '@/app/lib/email-parser-v2'
import { parseMails, type RawMail } from '@/app/lib/email/pipeline'

export async function POST(request: Request) {
  try {
    const isDev = process.env.NODE_ENV !== 'production' || process.env.SHOW_PARSE_CONFIDENCE === '1'
    // Get current user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's tokens from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('gmail_access_token, gmail_refresh_token')
      .eq('id', user.id)
      .maybeSingle()

    console.log('Profile data:', profile)
    console.log('Profile error:', profileError)

    // For now, use the session's provider_token if profile tokens are not available
    const { data: { session } } = await supabase.auth.getSession()

    let accessToken = profile?.gmail_access_token || session?.provider_token
    let refreshToken = profile?.gmail_refresh_token || session?.provider_refresh_token

    if (!accessToken) {
      return NextResponse.json({
        error: 'Gmail連携が必要です。一度ログアウトして、再度ログインしてください。',
        needsReauth: true
      }, { status: 400 })
    }

    // Get user's registered card issuers
    const { data: userIssuers } = await supabase
      .from('user_card_issuers')
      .select('*, card_issuers(id, name, email_domain, email_keywords, include_from_domains, exclude_from_domains, include_subject_keywords, exclude_subject_keywords)')
      .eq('user_id', user.id)

    // Build query ONLY from user's registered card issuers
    if (!userIssuers || userIssuers.length === 0) {
      return NextResponse.json({
        error: 'カード会社が登録されていません。/cards ページでカード会社を選択してください。'
      }, { status: 400 })
    }

    // Build aggregated filters from issuers (subject/from based)
    interface AggregatedFilters { includeFromDomains: Set<string>; excludeFromDomains: Set<string>; includeSubjects: Set<string>; excludeSubjects: Set<string> }
    const includeFromDomains = new Set<string>()
    const excludeFromDomains = new Set<string>()
    const includeSubjects = new Set<string>()
    const excludeSubjects = new Set<string>(['キャンペーン','アンケート','通信','ニュース','ポイント進呈','プレゼント','抽選','特別価格','クーポン','エントリー','Spot Mail'])

    userIssuers.forEach((ui: any) => {
      const issuer = ui.card_issuers
      if (!issuer) return
      ;(issuer.include_from_domains || []).forEach((d: string) => includeFromDomains.add(String(d).toLowerCase()))
      ;(issuer.exclude_from_domains || []).forEach((d: string) => excludeFromDomains.add(String(d).toLowerCase()))
      ;(issuer.include_subject_keywords || []).forEach((k: string) => includeSubjects.add(String(k)))
      ;(issuer.exclude_subject_keywords || []).forEach((k: string) => excludeSubjects.add(String(k)))
    })
    const issuerFilters: AggregatedFilters = { includeFromDomains, excludeFromDomains, includeSubjects, excludeSubjects }
    const parseDomain = (from: string): string | null => {
      const m = from?.match(/<([^>]+)>/)
      const email = m ? m[1] : (from?.includes('@') ? from : '')
      const dm = email?.match(/@([^>\s]+)/)
      return dm ? dm[1].toLowerCase() : null
    }
    const shouldParseEmail = (from: string, subject: string): boolean => {
      const sub = (subject || '').toLowerCase()
      const domain = (parseDomain(from || '') || '').toLowerCase()
      if (domain && issuerFilters.excludeFromDomains.has(domain)) return false
      for (const ex of issuerFilters.excludeSubjects) {
        if (ex && sub.includes(ex.toLowerCase())) return false
      }
      if (issuerFilters.includeSubjects.size > 0) {
        for (const inc of issuerFilters.includeSubjects) {
          if (inc && sub.includes(inc.toLowerCase())) return true
        }
        return false
      }
      return true
    }

    const issuerQueries = userIssuers
      .map(ui => {
        const issuer = ui.card_issuers
        if (!issuer) return null

        const froms = issuer.include_from_domains && issuer.include_from_domains.length > 0
          ? issuer.include_from_domains
          : (issuer.email_domain ? [issuer.email_domain] : [])

        if (froms.length > 0) {
          const fromGroup = froms.map((d: string) => `from:${d}`).join(' OR ')
          return froms.length > 1 ? `(${fromGroup})` : fromGroup
        }

        // Use keywords if no domain
        if (issuer?.email_keywords && issuer.email_keywords.length > 0) {
          return issuer.email_keywords.map((k: string) => `from:"${k}"`).join(' OR ')
        }
        return null
      })
      .filter(Boolean) as string[]

    if (issuerQueries.length === 0) {
      return NextResponse.json({
        error: 'カード会社が正しく設定されていません。'
      }, { status: 400 })
    }

    // Only user-selected card issuers, NO default Amazon/Rakuten/Yahoo
    const emailQuery = `(${issuerQueries.join(' OR ')}) newer_than:90d`
    console.log('[sync-emails] emailQuery:', emailQuery)

    // Fetch emails from Gmail
    const messages = await fetchEmails(
      accessToken,
      refreshToken,
      emailQuery
    )

    console.log(`Found ${messages.length} emails`)

    const transactions = []
    const processedEmails = []
    const devParsedInfo: any[] = []

    // Process each email
    for (const message of messages) {
      const parsed = parseEmailContentImproved(message)

      // Log sender for debugging
      console.log(`Processing email from: ${parsed.from}, Subject: ${parsed.subject}`)

      // Skip non-transactional/marketing emails
      if (!shouldParseEmail(parsed.from || '', parsed.subject || '')) {
        continue
      }

      // Check if email already exists
      const { data: existingEmail } = await supabase
        .from('emails')
        .select('id')
        .eq('gmail_message_id', parsed.id)
        .single()

      if (!existingEmail) {
        processedEmails.push({ from: parsed.from, subject: parsed.subject })
        // Save email to database
        const { data: savedEmail, error: emailError } = await supabase
          .from('emails')
          .insert({
            user_id: user.id,
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

        if (!emailError && savedEmail) {
          // Multi-layer pipeline first
          const rawMail: RawMail = {
            id: parsed.id || '',
            subject: parsed.subject || '',
            text: parsed.bodyText,
            html: parsed.bodyHtml,
            internalDate: parsed.date ? parsed.date.getTime() : undefined as any
          }
          const pipelineTx = await parseMails([rawMail], { allowFuzzy: true })

          let transactionsToSave: any[] = pipelineTx.map(t => ({
            merchant: t.merchant,
            amount: t.amount,
            itemName: undefined,
            date: new Date(t.date),
            category: 'その他',
            isSubscription: t.prelimSubscription || false,
            cardLast4: undefined,
            cardBrand: undefined
          }))

          let usedParser: 'pipeline' | 'v2' | 'legacy' | 'none' = 'none'
          let confValues: number[] = []
          if (pipelineTx.length > 0) {
            usedParser = 'pipeline'
            confValues = pipelineTx.map(t => t.confidence || 0)
          }

          // If pipeline found nothing, try unified parser
          if (transactionsToSave.length === 0) {
            const { transactions: parsedTransactions, metadata } = parseEmailV2(
              parsed.from,
              parsed.subject,
              parsed.bodyText,
              parsed.bodyHtml,
              parsed.date
            )
            transactionsToSave = parsedTransactions

            // If still nothing, try old parser
            if (parsedTransactions.length === 0) {
              const oldTransaction = parseEmail(parsed.from, parsed.bodyText, parsed.bodyHtml)
              if (oldTransaction) {
                transactionsToSave = [oldTransaction]
                usedParser = 'legacy'
              }
            } else {
              usedParser = 'v2'
              if (typeof (metadata as any)?.confidence === 'number') {
                confValues = [Number((metadata as any).confidence)]
              }
            }
          }

          if (isDev) {
            devParsedInfo.push({
              from: parsed.from,
              subject: parsed.subject,
              parser: usedParser,
              confidences: confValues,
              txCount: transactionsToSave.length
            })
          }

          // Save all found transactions
          for (const transaction of transactionsToSave) {
            const { data: savedTransaction } = await supabase
              .from('transactions')
              .insert({
                user_id: user.id,
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

            if (savedTransaction) {
              transactions.push(savedTransaction)
            }
          }

          // Mark email as processed if we found transactions
          if (transactionsToSave.length > 0) {
            await supabase
              .from('emails')
              .update({
                is_processed: true
              })
              .eq('id', savedEmail.id)
          }
        }
      }
    }

    // Detect subscriptions from transactions
    if (transactions.length > 0) {
      const { data: allTransactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: false })

      if (allTransactions) {
        // Normalize DB rows to parser-friendly shape
        const detectionTx = allTransactions.map((t: any) => ({
          merchant: t.merchant,
          amount: Number(t.amount),
          date: t.transaction_date ? new Date(t.transaction_date) : new Date()
        }))

        // Try new subscription detection first
        const subscriptionsV2 = detectSubscriptionsV2(detectionTx)
        const subscriptions = subscriptionsV2.size > 0 ? subscriptionsV2 : detectSubscription(detectionTx)

        // Save detected subscriptions
        for (const [key, subscription] of subscriptions) {
          // Check if subscription already exists
          const { data: existing } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('user_id', user.id)
            .eq('service_name', subscription.serviceName)
            .eq('amount', subscription.amount)
            .single()

          if (!existing) {
            await supabase
              .from('subscriptions')
              .insert({
                user_id: user.id,
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
            // Update existing subscription
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
    }

    return NextResponse.json({
      success: true,
      processed: transactions.length,
      message: `${messages.length}件のメールから${transactions.length}件の取引を処理しました`,
      details: {
        totalEmails: messages.length,
        processedEmails: processedEmails.length,
        transactions: transactions.length,
        samples: processedEmails.slice(0, 5) // 最初の5件のサンプルを返す
      },
      dev: isDev ? devParsedInfo.slice(0, 20) : undefined
    })

  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { error: 'Failed to sync emails' },
      { status: 500 }
    )
  }
}
