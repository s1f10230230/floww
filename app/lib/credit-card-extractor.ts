import {
  parseRakutenCardEmail,
  parseSMBCCardEmail,
  parseJCBCardEmail,
  parseAeonCardEmail,
  parseSaisonCardEmail,
  isCreditCardEmail
} from './email-parsers/credit-card'

interface ExtractedTransaction {
  merchant: string
  amount: number
  date: Date
  category?: string
  cardLast4?: string
  cardBrand: string
  statementMonth?: string
  totalAmount?: number
}

/**
 * クレジットカード明細メールから取引情報を抽出
 */
export function extractCreditCardTransactions(
  from: string,
  subject: string,
  bodyText: string,
  bodyHtml: string
): ExtractedTransaction[] {
  // Check if it's a credit card email
  if (!isCreditCardEmail(from, subject)) {
    return []
  }

  // Try each parser in order
  const parsers = [
    parseRakutenCardEmail,
    parseSMBCCardEmail,
    parseJCBCardEmail,
    parseAeonCardEmail,
    parseSaisonCardEmail
  ]

  for (const parser of parsers) {
    try {
      const transactions = parser(from, subject, bodyText, bodyHtml)
      if (transactions && transactions.length > 0) {
        console.log(`Successfully parsed ${transactions.length} transactions using ${parser.name}`)
        return transactions
      }
    } catch (error) {
      console.error(`Error with parser ${parser.name}:`, error)
      continue
    }
  }

  // If no parser worked, try generic extraction
  return extractGenericCreditCardTransactions(from, subject, bodyText, bodyHtml)
}

/**
 * 汎用的なクレジットカード取引抽出
 * 特定のフォーマットに対応していない場合に使用
 */
function extractGenericCreditCardTransactions(
  from: string,
  subject: string,
  bodyText: string,
  bodyHtml: string
): ExtractedTransaction[] {
  const transactions: ExtractedTransaction[] = []

  // Extract card brand from subject or sender
  const cardBrand = extractCardBrand(from, subject)

  // Generic transaction patterns
  const patterns = [
    // Date + merchant + amount patterns
    /(\d{1,2}\/\d{1,2})\s+(.+?)\s+(?:￥|¥)?([\d,]+)\s*円/g,
    /(\d{4}\/\d{1,2}\/\d{1,2})\s+(.+?)\s+(?:￥|¥)?([\d,]+)\s*円/g,
    /(\d{1,2}月\d{1,2}日)\s+(.+?)\s+([\d,]+)\s*円/g,

    // Amount first patterns
    /(?:￥|¥)([\d,]+)円?\s+(.+?)\s+(\d{1,2}\/\d{1,2})/g,

    // Table-like patterns
    /利用日[:：]\s*(\d{4}\/\d{1,2}\/\d{1,2})\s+.*?利用先[:：]\s*(.+?)\s+.*?金額[:：]\s*(?:￥|¥)?([\d,]+)/g,

    // Japanese full format variants
    /ご利用日[:：]\s*(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日\s+.*?(?:ご利用先|加盟店|ご利用店名)[:：]\s*(.+?)\s+.*?金額[:：]\s*(?:￥|¥)?([\d,]+)/g
  ]

  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(bodyText)) !== null) {
      try {
        const transaction = parseGenericTransaction(match, cardBrand)
        if (transaction && transaction.amount > 0) {
          transactions.push(transaction)
        }
      } catch (error) {
        console.error('Error parsing generic transaction:', error)
      }
    }
  }

  // Remove duplicates based on date, merchant, and amount
  const uniqueTransactions = removeDuplicates(transactions)

  return uniqueTransactions
}

function parseGenericTransaction(
  match: RegExpExecArray,
  cardBrand: string
): ExtractedTransaction | null {
  // Support multiple match orders:
  // 1) (date, merchant, amount)
  // 2) (amount, merchant, date)
  // 3) (YYYY, MM, DD, merchant, amount)

  let dateStr = ''
  let merchant = ''
  let amountStr = ''

  if (match.length >= 6 && /\d{4}/.test(match[1])) {
    // Year, Month, Day, Merchant, Amount
    const y = match[1], m = match[2], d = match[3]
    merchant = match[4]
    amountStr = match[5]
    dateStr = `${y}/${m}/${d}`
  } else if (match.length >= 4) {
    const a = match[1]
    const b = match[2]
    const c = match[3]

    const looksLikeDate = /\d{1,2}[\/月]\d{1,2}/.test(a) || /\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/.test(a)
    const looksLikeAmount = /[\d,]{3,}/.test(a)

    if (looksLikeDate) {
      // (date, merchant, amount)
      dateStr = a
      merchant = b
      amountStr = c
    } else if (looksLikeAmount) {
      // (amount, merchant, date)
      amountStr = a
      merchant = b
      dateStr = c
    } else {
      // Fallback assume (date, merchant, amount)
      dateStr = a
      merchant = b
      amountStr = c
    }
  } else {
    return null
  }

  const amount = parseInt(String(amountStr).replace(/[,￥¥]/g, ''))
  if (isNaN(amount) || amount <= 0) return null

  const date = parseFlexibleDate(dateStr)
  if (!date) return null

  const category = detectCategory(merchant)
  return { merchant: merchant.trim(), amount, date, cardBrand, category }
}

function extractCardBrand(from: string, subject: string): string {
  const cardBrands = [
    { keywords: ['楽天カード', 'rakuten'], brand: '楽天カード' },
    { keywords: ['三井住友', 'smbc', 'vpass'], brand: '三井住友カード' },
    { keywords: ['jcb', 'myjcb'], brand: 'JCB' },
    { keywords: ['イオンカード', 'aeon'], brand: 'イオンカード' },
    { keywords: ['セゾン', 'saison'], brand: 'セゾンカード' },
    { keywords: ['オリコ', 'orico'], brand: 'オリコカード' },
    { keywords: ['エポス', 'epos'], brand: 'エポスカード' },
    { keywords: ['ビューカード', 'view'], brand: 'ビューカード' },
    { keywords: ['dカード', 'docomo'], brand: 'dカード' },
    { keywords: ['au pay', 'au wallet'], brand: 'au PAY カード' },
    { keywords: ['visa'], brand: 'VISA' },
    { keywords: ['mastercard'], brand: 'Mastercard' },
    { keywords: ['american express', 'amex'], brand: 'American Express' }
  ]

  const searchText = (from + ' ' + subject).toLowerCase()

  for (const { keywords, brand } of cardBrands) {
    if (keywords.some(keyword => searchText.includes(keyword.toLowerCase()))) {
      return brand
    }
  }

  return 'クレジットカード'
}

function parseFlexibleDate(dateStr: string): Date | null {
  const currentYear = new Date().getFullYear()
  const currentMonth = new Date().getMonth()

  // YYYY/MM/DD or YYYY-MM-DD
  let match = dateStr.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/)
  if (match) {
    return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]))
  }

  // YYYY年MM月DD日
  match = dateStr.match(/(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/)
  if (match) {
    return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]))
  }

  // MM/DD
  match = dateStr.match(/(\d{1,2})[\/](\d{1,2})/)
  if (match) {
    const month = parseInt(match[1]) - 1
    const day = parseInt(match[2])
    // Adjust year if month is in the future
    const year = month > currentMonth ? currentYear - 1 : currentYear
    return new Date(year, month, day)
  }

  // MM月DD日
  match = dateStr.match(/(\d{1,2})月(\d{1,2})日/)
  if (match) {
    const month = parseInt(match[1]) - 1
    const day = parseInt(match[2])
    const year = month > currentMonth ? currentYear - 1 : currentYear
    return new Date(year, month, day)
  }

  return null
}

function detectCategory(merchant: string): string {
  const categories: { [key: string]: string[] } = {
    'コンビニ': ['セブン', 'ファミリーマート', 'ローソン', 'ミニストップ'],
    'スーパー': ['イオン', 'イトーヨーカドー', '西友', 'ライフ', 'マルエツ'],
    'ドラッグストア': ['マツキヨ', 'ウエルシア', 'ツルハ', 'サンドラッグ'],
    '飲食店': ['マクドナルド', 'スタバ', 'ドトール', '吉野家', 'すき家'],
    'ガソリン': ['ENEOS', 'エネオス', '出光', 'コスモ'],
    '交通': ['JR', 'メトロ', 'タクシー', 'PASMO', 'Suica'],
    'ネットショッピング': ['Amazon', 'アマゾン', '楽天市場', 'Yahoo'],
    '携帯・通信': ['ドコモ', 'au', 'ソフトバンク', '楽天モバイル'],
    'サブスク': ['Netflix', 'Spotify', 'Apple', 'Google', 'Adobe'],
    '家電': ['ビックカメラ', 'ヨドバシ', 'ヤマダ電機']
  }

  const lowerMerchant = merchant.toLowerCase()

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(k => lowerMerchant.includes(k.toLowerCase()))) {
      return category
    }
  }

  return 'その他'
}

function removeDuplicates(transactions: ExtractedTransaction[]): ExtractedTransaction[] {
  const seen = new Set<string>()
  return transactions.filter(tx => {
    const key = `${tx.date.toISOString()}-${tx.merchant}-${tx.amount}`
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

/**
 * クレジットカード情報をデータベースに自動登録
 */
export async function registerCardFromTransaction(
  supabase: any,
  userId: string,
  cardLast4: string,
  cardBrand: string
): Promise<void> {
  if (!cardLast4 || cardLast4 === 'unknown') {
    return
  }

  try {
    // Check if card already exists
    const { data: existing } = await supabase
      .from('credit_cards')
      .select('id')
      .eq('user_id', userId)
      .eq('card_last4', cardLast4)
      .single()

    if (!existing) {
      // Auto-register the card
      await supabase
        .from('credit_cards')
        .insert({
          user_id: userId,
          card_last4: cardLast4,
          card_brand: cardBrand,
          card_name: `${cardBrand} (****${cardLast4})`,
          is_active: true
        })

      console.log(`Auto-registered card: ${cardBrand} ****${cardLast4}`)
    }
  } catch (error) {
    console.error('Error registering card:', error)
  }
}
