interface ParsedTransaction {
  merchant: string
  amount: number
  itemName?: string
  date: Date
  category?: string
  cardLast4?: string
  cardBrand?: string
}

// Amazon purchase email parser
export function parseAmazonEmail(bodyText: string, bodyHtml: string): ParsedTransaction | null {
  try {
    // Pattern for Amazon order confirmation
    const amountPattern = /￥\s?([\d,]+)/
    const itemPattern = /商品名[:：]\s*(.+?)[\n\r]/

    const amountMatch = bodyText.match(amountPattern) || bodyHtml.match(amountPattern)
    if (!amountMatch) return null

    const amount = parseInt(amountMatch[1].replace(/,/g, ''))

    const itemMatch = bodyText.match(itemPattern)
    const itemName = itemMatch ? itemMatch[1].trim() : undefined

    // Extract card info
    const cardInfo = extractCardInfo(bodyText + ' ' + bodyHtml)

    return {
      merchant: 'Amazon',
      amount,
      itemName,
      date: new Date(),
      category: detectCategory(itemName || ''),
      ...cardInfo
    }
  } catch (error) {
    console.error('Error parsing Amazon email:', error)
    return null
  }
}

// Rakuten purchase email parser
export function parseRakutenEmail(bodyText: string, bodyHtml: string): ParsedTransaction | null {
  try {
    // Pattern for Rakuten order confirmation
    const amountPattern = /合計金額[:：]\s*￥?([\d,]+)円/
    const shopPattern = /ショップ名[:：]\s*(.+?)[\n\r]/

    const amountMatch = bodyText.match(amountPattern) || bodyHtml.match(amountPattern)
    if (!amountMatch) return null

    const amount = parseInt(amountMatch[1].replace(/,/g, ''))

    const shopMatch = bodyText.match(shopPattern)
    const shopName = shopMatch ? shopMatch[1].trim() : '楽天市場'

    return {
      merchant: `楽天市場 - ${shopName}`,
      amount,
      date: new Date(),
      category: '買い物'
    }
  } catch (error) {
    console.error('Error parsing Rakuten email:', error)
    return null
  }
}

// Yahoo Shopping parser
export function parseYahooEmail(bodyText: string, bodyHtml: string): ParsedTransaction | null {
  try {
    const amountPattern = /お支払い金額[:：]\s*￥?([\d,]+)円/
    const storePattern = /ストア[:：]\s*(.+?)[\n\r]/

    const amountMatch = bodyText.match(amountPattern) || bodyHtml.match(amountPattern)
    if (!amountMatch) return null

    const amount = parseInt(amountMatch[1].replace(/,/g, ''))

    const storeMatch = bodyText.match(storePattern)
    const storeName = storeMatch ? storeMatch[1].trim() : 'Yahoo!ショッピング'

    return {
      merchant: `Yahoo! - ${storeName}`,
      amount,
      date: new Date(),
      category: '買い物'
    }
  } catch (error) {
    console.error('Error parsing Yahoo email:', error)
    return null
  }
}

// Extract credit card information from email
function extractCardInfo(text: string): { cardLast4?: string, cardBrand?: string } {
  const cardInfo: { cardLast4?: string, cardBrand?: string } = {}

  // Pattern for card last 4 digits (****1234 or ending with 1234)
  const last4Pattern = /(?:\*{4}|[Xx]{4}|末尾)[\s-]?(\d{4})/
  const last4Match = text.match(last4Pattern)
  if (last4Match) {
    cardInfo.cardLast4 = last4Match[1]
  }

  // Detect card brand
  const cardBrands = [
    { pattern: /VISA/i, brand: 'VISA' },
    { pattern: /Master/i, brand: 'Mastercard' },
    { pattern: /JCB/i, brand: 'JCB' },
    { pattern: /AMEX|American Express/i, brand: 'AMEX' },
    { pattern: /Diners/i, brand: 'Diners' },
    { pattern: /楽天カード/i, brand: '楽天カード' },
    { pattern: /三井住友/i, brand: '三井住友カード' },
    { pattern: /イオンカード/i, brand: 'イオンカード' },
  ]

  for (const { pattern, brand } of cardBrands) {
    if (pattern.test(text)) {
      cardInfo.cardBrand = brand
      break
    }
  }

  return cardInfo
}

// Category detection based on keywords
function detectCategory(text: string): string {
  const categories: { [key: string]: string[] } = {
    '食費': ['食品', '飲料', 'グルメ', 'レストラン', 'カフェ', '弁当', 'コンビニ'],
    '日用品': ['洗剤', 'ティッシュ', 'トイレットペーパー', 'シャンプー', '消耗品'],
    '衣類': ['服', 'シャツ', 'パンツ', 'ジャケット', 'コート', '靴', 'バッグ'],
    '美容・健康': ['化粧品', 'コスメ', 'サプリ', '薬', 'ヘルスケア'],
    '趣味・娯楽': ['ゲーム', '映画', '音楽', 'CD', 'DVD', 'おもちゃ'],
    '書籍': ['本', '書籍', '雑誌', '漫画', 'Kindle'],
    '家電・ガジェット': ['家電', 'スマホ', 'パソコン', 'タブレット', 'カメラ', 'イヤホン'],
  }

  const lowerText = text.toLowerCase()

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => lowerText.includes(keyword.toLowerCase()))) {
      return category
    }
  }

  return 'その他'
}

// Main parser function
export function parseEmail(from: string, bodyText: string, bodyHtml: string): ParsedTransaction | null {
  const lowerFrom = from.toLowerCase()

  if (lowerFrom.includes('amazon')) {
    return parseAmazonEmail(bodyText, bodyHtml)
  } else if (lowerFrom.includes('rakuten')) {
    return parseRakutenEmail(bodyText, bodyHtml)
  } else if (lowerFrom.includes('yahoo')) {
    return parseYahooEmail(bodyText, bodyHtml)
  }

  return null
}

// Subscription detection
export function detectSubscription(transactions: ParsedTransaction[]): Map<string, any> {
  const merchantGroups = new Map<string, ParsedTransaction[]>()

  // Group by merchant
  transactions.forEach(transaction => {
    const key = `${transaction.merchant}_${transaction.amount}`
    if (!merchantGroups.has(key)) {
      merchantGroups.set(key, [])
    }
    merchantGroups.get(key)!.push(transaction)
  })

  const subscriptions = new Map<string, any>()

  // Detect recurring payments
  merchantGroups.forEach((group, key) => {
    if (group.length >= 2) {
      // Check if payments are regular (monthly/yearly)
      const dates = group.map(t => t.date.getTime()).sort()
      const intervals = []

      for (let i = 1; i < dates.length; i++) {
        intervals.push(dates[i] - dates[i - 1])
      }

      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
      const dayInterval = avgInterval / (1000 * 60 * 60 * 24)

      let billingCycle = null
      if (dayInterval >= 28 && dayInterval <= 31) {
        billingCycle = 'monthly'
      } else if (dayInterval >= 360 && dayInterval <= 370) {
        billingCycle = 'yearly'
      } else if (dayInterval >= 7 && dayInterval <= 8) {
        billingCycle = 'weekly'
      }

      if (billingCycle) {
        const [merchant, amount] = key.split('_')
        subscriptions.set(key, {
          serviceName: merchant,
          amount: parseFloat(amount),
          billingCycle,
          transactionCount: group.length,
          lastDetected: group[group.length - 1].date,
          firstDetected: group[0].date,
        })
      }
    }
  })

  return subscriptions
}