// Unified email parser with comprehensive support for Japanese e-commerce and credit cards

import { parseAmazonEmail, isAmazonEmail } from './email-parsers/amazon'
import { parseRakutenEmail, isRakutenEmail } from './email-parsers/rakuten'
import {
  parseRakutenCardEmail,
  parseSMBCCardEmail,
  parseJCBCardEmail,
  parseAeonCardEmail,
  parseSaisonCardEmail,
  isCreditCardEmail
} from './email-parsers/credit-card'

export interface ParsedTransaction {
  merchant: string
  amount: number
  itemName?: string
  date: Date
  category?: string
  cardLast4?: string
  cardBrand?: string
  orderNumber?: string
  points?: number
  isSubscription?: boolean
}

export interface EmailMetadata {
  from: string
  subject: string
  date: Date
  emailType?: 'order' | 'credit_card' | 'subscription' | 'notification' | 'unknown'
  confidence?: number
}

// Text normalization helpers
function toHalfWidth(input: string): string {
  // Convert full-width digits/symbols to half-width to stabilize regex
  return input.replace(/[！-～]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
              .replace(/　/g, ' ')
}

function normalizeText(input: string): string {
  return toHalfWidth(input)
    .replace(/\r/g, '\n')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+\n/g, '\n')
}

function parseEmailAddress(from: string): { name?: string, email?: string, domain?: string } {
  const match = from.match(/\s*"?([^"<]*)"?\s*<([^>]+)>/) || from.match(/([^\s<@]+@[^\s>]+)/)
  if (!match) return { name: from?.trim() || undefined }
  if (match.length === 2) {
    const email = match[1]
    return { email, domain: email.split('@')[1]?.toLowerCase() }
  }
  const name = match[1]?.trim()
  const email = match[2]?.trim()
  return { name, email, domain: email?.split('@')[1]?.toLowerCase() }
}

// Yahoo Shopping parser
function parseYahooEmail(from: string, subject: string, bodyText: string, bodyHtml: string): ParsedTransaction | null {
  try {
    // Check if it's a Yahoo Shopping order
    const isOrderEmail =
      subject.includes('ご注文') ||
      subject.includes('Yahoo!ショッピング') ||
      subject.includes('PayPayモール') ||
      bodyText.includes('注文番号')

    if (!isOrderEmail) return null

    // Amount patterns for Yahoo
    const amountPatterns = [
      /お支払い金額[:：]\s*([￥¥]?)\s?([\d,]+)\s*円/,
      /商品合計[:：]\s*([￥¥]?)\s?([\d,]+)\s*円/,
      /合計金額[:：]\s*([￥¥]?)\s?([\d,]+)\s*円/,
      /総額[:：]\s*([￥¥]?)\s?([\d,]+)\s*円/
    ]

    let amount = 0
    for (const pattern of amountPatterns) {
      const match = bodyText.match(pattern) || bodyHtml.match(pattern)
      if (match) {
        amount = parseInt((match[2] || match[1]).replace(/[,￥¥]/g, ''))
        if (amount > 0) break
      }
    }

    if (amount === 0) return null

    // Extract store name
    let storeName = 'Yahoo!ショッピング'
    const storePattern = /ストア名[:：]\s*(.+?)(?:\n|\r)/
    const storeMatch = bodyText.match(storePattern)
    if (storeMatch) {
      storeName = storeMatch[1].trim()
    }

    // Extract order number
    let orderNumber: string | undefined
    const orderPattern = /注文番号[:：]\s*([\d-]+)/
    const orderMatch = bodyText.match(orderPattern)
    if (orderMatch) {
      orderNumber = orderMatch[1]
    }

    return {
      merchant: `Yahoo! - ${storeName}`,
      amount,
      date: new Date(),
      category: 'ショッピング',
      orderNumber
    }
  } catch (error) {
    console.error('Error parsing Yahoo email:', error)
    return null
  }
}

// Mercari parser
function parseMercariEmail(from: string, subject: string, bodyText: string, bodyHtml: string): ParsedTransaction | null {
  try {
    const isMercariEmail =
      from.includes('mercari') ||
      subject.includes('メルカリ') ||
      subject.includes('購入') ||
      bodyText.includes('メルカリ')

    if (!isMercariEmail) return null

    const amountPatterns = [
      /支払い金額[:：]\s*¥([\d,]+)/,
      /購入金額[:：]\s*¥([\d,]+)/,
      /¥([\d,]+)\s*(?:で購入|をお支払い)/
    ]

    let amount = 0
    for (const pattern of amountPatterns) {
      const match = bodyText.match(pattern) || bodyHtml.match(pattern)
      if (match) {
        amount = parseInt(match[1].replace(/,/g, ''))
        break
      }
    }

    if (amount === 0) return null

    // Extract item name
    let itemName: string | undefined
    const itemPattern = /商品名[:：]\s*(.+?)(?:\n|\r)/
    const itemMatch = bodyText.match(itemPattern)
    if (itemMatch) {
      itemName = itemMatch[1].trim()
    }

    return {
      merchant: 'メルカリ',
      amount,
      itemName,
      date: new Date(),
      category: 'フリマアプリ'
    }
  } catch (error) {
    console.error('Error parsing Mercari email:', error)
    return null
  }
}

// ZOZOTOWN parser
function parseZozoEmail(from: string, subject: string, bodyText: string, bodyHtml: string): ParsedTransaction | null {
  try {
    const isZozoEmail =
      from.includes('zozo') ||
      subject.includes('ZOZOTOWN') ||
      bodyText.includes('ZOZOTOWN')

    if (!isZozoEmail) return null

    const amountPatterns = [
      /合計金額[:：]\s*¥([\d,]+)/,
      /お支払い金額[:：]\s*¥([\d,]+)/,
      /商品代金[:：]\s*¥([\d,]+)/
    ]

    let amount = 0
    for (const pattern of amountPatterns) {
      const match = bodyText.match(pattern) || bodyHtml.match(pattern)
      if (match) {
        amount = parseInt(match[1].replace(/,/g, ''))
        break
      }
    }

    if (amount === 0) return null

    return {
      merchant: 'ZOZOTOWN',
      amount,
      date: new Date(),
      category: 'ファッション'
    }
  } catch (error) {
    console.error('Error parsing ZOZO email:', error)
    return null
  }
}

// Subscription service parsers
function parseSubscriptionEmail(from: string, subject: string, bodyText: string, bodyHtml: string): ParsedTransaction | null {
  const subscriptionServices = [
    { name: 'Netflix', domain: 'netflix', category: '動画配信' },
    { name: 'Amazon Prime', domain: 'amazon', keywords: ['Prime', 'プライム'], category: '動画配信' },
    { name: 'Spotify', domain: 'spotify', category: '音楽配信' },
    { name: 'Apple Music', domain: 'apple', keywords: ['Music'], category: '音楽配信' },
    { name: 'YouTube Premium', domain: 'youtube', keywords: ['Premium'], category: '動画配信' },
    { name: 'Disney+', domain: 'disney', category: '動画配信' },
    { name: 'Hulu', domain: 'hulu', category: '動画配信' },
    { name: 'U-NEXT', domain: 'unext', category: '動画配信' },
    { name: 'dアニメストア', domain: 'danime', category: '動画配信' },
    { name: 'Adobe', domain: 'adobe', category: 'ソフトウェア' },
    { name: 'Microsoft 365', domain: 'microsoft', keywords: ['365', 'Office'], category: 'ソフトウェア' },
    { name: 'Dropbox', domain: 'dropbox', category: 'クラウドストレージ' },
    { name: 'iCloud+', domain: 'apple', keywords: ['iCloud'], category: 'クラウドストレージ' }
  ]

  for (const service of subscriptionServices) {
    const isServiceEmail =
      from.toLowerCase().includes(service.domain) ||
      (service.keywords && service.keywords.some(k => subject.includes(k) || bodyText.includes(k)))

    if (isServiceEmail) {
      // Look for subscription-related keywords
      const subscriptionKeywords = ['月額', '年額', 'subscription', 'renewal', '更新', '請求', 'billing']
      const hasSubscriptionKeyword = subscriptionKeywords.some(k =>
        bodyText.toLowerCase().includes(k.toLowerCase())
      )

      if (hasSubscriptionKeyword) {
        // Extract amount
        const amountPatterns = [
          /([￥¥$])\s?([\d,]+)/,
          /([\d,]+)\s*円/,
          /月額\s*([\d,]+)/,
          /年額\s*([\d,]+)/
        ]

        let amount = 0
        for (const pattern of amountPatterns) {
          const match = bodyText.match(pattern) || bodyHtml.match(pattern)
          if (match) {
            amount = parseInt((match[2] || match[1]).replace(/[,￥¥$]/g, ''))
            if (amount > 0 && amount < 100000) break // Sanity check for subscription amounts
          }
        }

        if (amount > 0) {
          return {
            merchant: service.name,
            amount,
            date: new Date(),
            category: service.category,
            isSubscription: true
          }
        }
      }
    }
  }

  return null
}

// Main unified parser
export function parseEmailV2(
  from: string,
  subject: string,
  bodyText: string,
  bodyHtml: string,
  emailDate?: Date
): { transactions: ParsedTransaction[], metadata: EmailMetadata } {
  const metadata: EmailMetadata = {
    from,
    subject,
    date: emailDate || new Date(),
    emailType: 'unknown',
    confidence: 0
  }

  const transactions: ParsedTransaction[] = []
  const bodyTextNorm = normalizeText(bodyText || '')
  const bodyHtmlNorm = normalizeText(bodyHtml || '')
  const fromParts = parseEmailAddress(from || '')

  try {
    // Try Amazon parser
    if (isAmazonEmail(from, subject)) {
      const amazonTransaction = parseAmazonEmail(from, subject, bodyText, bodyHtml)
      if (amazonTransaction) {
        transactions.push(amazonTransaction)
        metadata.emailType = 'order'
        metadata.confidence = 0.9
      }
    }

    // Try Rakuten parser
    else if (isRakutenEmail(from, subject)) {
      const rakutenTransaction = parseRakutenEmail(from, subject, bodyText, bodyHtml)
      if (rakutenTransaction) {
        transactions.push(rakutenTransaction)
        metadata.emailType = 'order'
        metadata.confidence = 0.9
      }
    }

    // Try credit card parsers
    else if (isCreditCardEmail(from, subject)) {
      metadata.emailType = 'credit_card'

      // Try each credit card parser
      const cardParsers = [
        parseRakutenCardEmail,
        parseSMBCCardEmail,
        parseJCBCardEmail,
        parseAeonCardEmail,
        parseSaisonCardEmail
      ]

      for (const parser of cardParsers) {
        const cardTransactions = parser(from, subject, bodyText, bodyHtml)
        if (cardTransactions && cardTransactions.length > 0) {
          transactions.push(...cardTransactions)
          metadata.confidence = 0.85
          break
        }
      }
    }

    // Try Yahoo Shopping
    else if (from.includes('yahoo') || subject.includes('Yahoo')) {
      const yahooTransaction = parseYahooEmail(from, subject, bodyText, bodyHtml)
      if (yahooTransaction) {
        transactions.push(yahooTransaction)
        metadata.emailType = 'order'
        metadata.confidence = 0.85
      }
    }

    // Try Mercari
    else if (from.includes('mercari') || subject.includes('メルカリ')) {
      const mercariTransaction = parseMercariEmail(from, subject, bodyText, bodyHtml)
      if (mercariTransaction) {
        transactions.push(mercariTransaction)
        metadata.emailType = 'order'
        metadata.confidence = 0.8
      }
    }

    // Try ZOZOTOWN
    else if (from.includes('zozo') || subject.includes('ZOZO')) {
      const zozoTransaction = parseZozoEmail(from, subject, bodyText, bodyHtml)
      if (zozoTransaction) {
        transactions.push(zozoTransaction)
        metadata.emailType = 'order'
        metadata.confidence = 0.8
      }
    }

    // Try subscription services
    const subscriptionTransaction = parseSubscriptionEmail(from, subject, bodyTextNorm, bodyHtmlNorm)
    if (subscriptionTransaction) {
      transactions.push(subscriptionTransaction)
      metadata.emailType = 'subscription'
      metadata.confidence = 0.75
    }

    // If no specific parser matched but contains price patterns, try generic extraction
    if (transactions.length === 0) {
      const genericTransaction = parseGenericTransaction(from, subject, bodyTextNorm, bodyHtmlNorm)
      if (genericTransaction) {
        transactions.push(genericTransaction)
        metadata.emailType = 'order'
        metadata.confidence = 0.5
      }
    }

  } catch (error) {
    console.error('Error in unified parser:', error)
  }

  return { transactions, metadata }
}

// Generic transaction parser as fallback
function parseGenericTransaction(from: string, subject: string, bodyText: string, bodyHtml: string): ParsedTransaction | null {
  try {
    // Require context words near amount to reduce false positives
    const amountPatterns = [
      /(?:合計|総額|お支払い|ご請求|請求|利用金額|ご利用金額)[^\d￥¥]*([￥¥]?)\s*([\d,]+)\s*円?/,
      /([￥¥])\s*([\d,]{3,})\s*円?\s*(?:税込|税別)?/,
      /([\d,]{3,})\s*円\b/
    ]

    let amount = 0
    for (const pattern of amountPatterns) {
      const match = bodyText.match(pattern) || bodyHtml.match(pattern)
      if (match) {
        const raw = (match[2] || match[1])
        const num = parseInt(String(raw).replace(/[,￥¥]/g, ''))
        if (!isNaN(num) && num >= 100 && num <= 10000000) {
          amount = num
          break
        }
      }
    }

    if (amount === 0) return null

    // Merchant extraction: prefer explicit fields, then subject decorations, then From name
    const fromInfo = parseEmailAddress(from)

    const merchantPatterns = [
      /(?:ご利用先|加盟店|ご利用店名|利用店名|店名|利用先)[:：]\s*([^\n\r]+?)(?:\s|　|$)/,
      /【\s*([^\]】]+?)\s*】/,
      /(.*?)(?:でのご利用|をご利用|へのお支払い)/
    ]

    let merchant = ''
    for (const mp of merchantPatterns) {
      const m = bodyText.match(mp) || bodyHtml.match(mp) || subject.match(mp)
      if (m && m[1]) { merchant = m[1].trim() ; break }
    }

    if (!merchant) {
      merchant = (fromInfo.name || fromInfo.email || '').split('@')[0]
      merchant = merchant
        .replace(/"/g, '')
        .replace(/[-_]/g, ' ')
        .trim()
    }

    if (!merchant) merchant = 'Unknown'

    return {
      merchant,
      amount,
      date: new Date(),
      category: 'その他'
    }
  } catch (error) {
    console.error('Error in generic parser:', error)
    return null
  }
}

// Enhanced subscription detection with date analysis
export function detectSubscriptionsV2(transactions: ParsedTransaction[]): Map<string, any> {
  const merchantGroups = new Map<string, ParsedTransaction[]>()

  // Group by merchant and amount
  transactions.forEach(transaction => {
    const key = `${transaction.merchant}_${transaction.amount}`
    if (!merchantGroups.has(key)) {
      merchantGroups.set(key, [])
    }
    merchantGroups.get(key)!.push(transaction)
  })

  const subscriptions = new Map<string, any>()

  merchantGroups.forEach((group, key) => {
    // Filter out transactions without valid dates
    const validTransactions = group.filter(t => t.date && t.date instanceof Date && !isNaN(t.date.getTime()))

    // Need at least 2 transactions to detect pattern
    if (validTransactions.length >= 2) {
      const dates = validTransactions.map(t => t.date.getTime()).sort()
      const intervals: number[] = []

      for (let i = 1; i < dates.length; i++) {
        intervals.push(dates[i] - dates[i - 1])
      }

      // Calculate average interval
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
      const dayInterval = avgInterval / (1000 * 60 * 60 * 24)

      // Calculate standard deviation to check consistency
      const variance = intervals.reduce((sum, interval) => {
        return sum + Math.pow(interval - avgInterval, 2)
      }, 0) / intervals.length
      const stdDev = Math.sqrt(variance)
      const stdDevDays = stdDev / (1000 * 60 * 60 * 24)

      let billingCycle = null
      let confidence = 0

      // Check for monthly (28-31 days)
      if (dayInterval >= 28 && dayInterval <= 31 && stdDevDays < 3) {
        billingCycle = 'monthly'
        confidence = Math.min(0.95, 0.5 + (validTransactions.length * 0.15))
      }
      // Check for yearly (360-370 days)
      else if (dayInterval >= 360 && dayInterval <= 370 && stdDevDays < 10) {
        billingCycle = 'yearly'
        confidence = Math.min(0.9, 0.5 + (validTransactions.length * 0.2))
      }
      // Check for weekly (6-8 days)
      else if (dayInterval >= 6 && dayInterval <= 8 && stdDevDays < 1) {
        billingCycle = 'weekly'
        confidence = Math.min(0.85, 0.5 + (validTransactions.length * 0.1))
      }
      // Check for quarterly (85-95 days)
      else if (dayInterval >= 85 && dayInterval <= 95 && stdDevDays < 5) {
        billingCycle = 'quarterly'
        confidence = Math.min(0.85, 0.5 + (validTransactions.length * 0.15))
      }

      if (billingCycle && confidence > 0.6) {
        const [merchant, amount] = key.split('_')
        const lastTransaction = validTransactions[validTransactions.length - 1]
        const firstTransaction = validTransactions[0]

        subscriptions.set(key, {
          serviceName: merchant,
          amount: parseFloat(amount),
          billingCycle,
          transactionCount: validTransactions.length,
          lastDetected: lastTransaction.date,
          firstDetected: firstTransaction.date,
          confidence,
          nextBillingDate: new Date(lastTransaction.date.getTime() + avgInterval)
        })
      }
    }
  })

  return subscriptions
}
