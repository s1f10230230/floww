// Amazon Japan email parser with comprehensive patterns

interface AmazonTransaction {
  merchant: string
  amount: number
  itemName?: string
  date: Date
  category?: string
  cardLast4?: string
  cardBrand?: string
  orderNumber?: string
}

export function parseAmazonEmail(from: string, subject: string, bodyText: string, bodyHtml: string): AmazonTransaction | null {
  try {
    // Check if it's actually an Amazon order email
    const isOrderEmail =
      subject.includes('注文の確認') ||
      subject.includes('ご注文の確認') ||
      subject.includes('Order Confirmation') ||
      subject.includes('発送のお知らせ') ||
      bodyText.includes('注文番号') ||
      bodyText.includes('Order #')

    if (!isOrderEmail) return null

    // Multiple patterns for amount extraction
    const amountPatterns = [
      /注文合計[:：]\s*￥\s?([\d,]+)/,
      /合計[:：]\s*￥\s?([\d,]+)/,
      /Order Total[:：]\s*￥\s?([\d,]+)/,
      /お支払い金額[:：]\s*￥\s?([\d,]+)/,
      /ご請求金額[:：]\s*￥\s?([\d,]+)/,
      /総計[:：]\s*￥\s?([\d,]+)/,
      /￥\s?([\d,]+)\s*(?:円)?(?:\s*)?(?:税込)/,
      // For HTML content
      /<td[^>]*>注文合計<\/td>\s*<td[^>]*>￥\s?([\d,]+)/i,
      /<span[^>]*class="[^"]*price[^"]*"[^>]*>￥\s?([\d,]+)/i
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

    // Extract order number
    let orderNumber: string | undefined
    const orderPatterns = [
      /注文番号[:：]\s*([\d-]+)/,
      /Order #([\d-]+)/,
      /注文ID[:：]\s*([\d-]+)/
    ]

    for (const pattern of orderPatterns) {
      const match = bodyText.match(pattern) || bodyHtml.match(pattern)
      if (match) {
        orderNumber = match[1]
        break
      }
    }

    // Extract item names (multiple items possible)
    const itemNames: string[] = []
    const itemPatterns = [
      /商品名[:：]\s*(.+?)(?:\n|\r|数量|価格)/g,
      /商品[:：]\s*(.+?)(?:\n|\r|数量|価格)/g,
      /<a[^>]*class="[^"]*product[^"]*"[^>]*>([^<]+)</gi,
      /<span[^>]*class="[^"]*item-name[^"]*"[^>]*>([^<]+)</gi
    ]

    for (const pattern of itemPatterns) {
      let match
      while ((match = pattern.exec(bodyText)) !== null) {
        const itemName = match[1].trim()
        if (itemName && !itemNames.includes(itemName)) {
          itemNames.push(itemName)
        }
      }
      // Reset pattern for HTML search
      pattern.lastIndex = 0
      while ((match = pattern.exec(bodyHtml)) !== null) {
        const itemName = match[1].trim()
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#039;/g, "'")
        if (itemName && !itemNames.includes(itemName)) {
          itemNames.push(itemName)
        }
      }
    }

    // Extract card information
    const cardInfo = extractAmazonCardInfo(bodyText + ' ' + bodyHtml)

    // Extract date
    const date = extractOrderDate(bodyText, bodyHtml)

    return {
      merchant: 'Amazon.co.jp',
      amount,
      itemName: itemNames.length > 0 ? itemNames.join(', ') : undefined,
      date: date || new Date(),
      category: detectAmazonCategory(itemNames.join(' ')),
      orderNumber,
      ...cardInfo
    }
  } catch (error) {
    console.error('Error parsing Amazon email:', error)
    return null
  }
}

function extractAmazonCardInfo(text: string): { cardLast4?: string, cardBrand?: string } {
  const cardInfo: { cardLast4?: string, cardBrand?: string } = {}

  // Pattern for card last 4 digits
  const last4Patterns = [
    /(?:末尾|ending in|last 4)\s*(\d{4})/i,
    /\*{4}\s*(\d{4})/,
    /[Xx]{4}\s*(\d{4})/,
    /カード番号.*(\d{4})/,
    /支払い方法.*(\d{4})/
  ]

  for (const pattern of last4Patterns) {
    const match = text.match(pattern)
    if (match) {
      cardInfo.cardLast4 = match[1]
      break
    }
  }

  // Detect card brand
  const cardBrands = [
    { pattern: /VISA/i, brand: 'VISA' },
    { pattern: /Master(?:card)?/i, brand: 'Mastercard' },
    { pattern: /JCB/i, brand: 'JCB' },
    { pattern: /(?:AMEX|American Express)/i, brand: 'AMEX' },
    { pattern: /Diners/i, brand: 'Diners' },
    { pattern: /Discover/i, brand: 'Discover' }
  ]

  for (const { pattern, brand } of cardBrands) {
    if (pattern.test(text)) {
      cardInfo.cardBrand = brand
      break
    }
  }

  return cardInfo
}

function extractOrderDate(bodyText: string, bodyHtml: string): Date | null {
  const datePatterns = [
    /注文日[:：]\s*(\d{4})[年/-](\d{1,2})[月/-](\d{1,2})/,
    /Order Date[:：]\s*(\d{4})[年/-](\d{1,2})[月/-](\d{1,2})/,
    /(\d{4})[年/-](\d{1,2})[月/-](\d{1,2})日?\s*(?:に)?注文/
  ]

  for (const pattern of datePatterns) {
    const match = bodyText.match(pattern) || bodyHtml.match(pattern)
    if (match) {
      return new Date(
        parseInt(match[1]),
        parseInt(match[2]) - 1,
        parseInt(match[3])
      )
    }
  }

  return null
}

function detectAmazonCategory(text: string): string {
  const categories: { [key: string]: string[] } = {
    '本・電子書籍': ['kindle', '書籍', '本', 'ブック', '雑誌', 'コミック', '漫画', '小説'],
    '家電・カメラ': ['家電', 'カメラ', 'テレビ', '冷蔵庫', '洗濯機', 'エアコン', 'プリンター'],
    'パソコン・周辺機器': ['パソコン', 'PC', 'ノート', 'マウス', 'キーボード', 'モニター', 'SSD', 'HDD'],
    'スマートフォン・携帯': ['スマホ', 'iPhone', 'Android', 'ケース', '充電器', 'イヤホン', 'AirPods'],
    '食品・飲料': ['食品', '飲料', 'お茶', 'コーヒー', 'お菓子', 'スナック', 'ビール', 'ワイン'],
    '日用品': ['洗剤', 'ティッシュ', 'トイレットペーパー', 'シャンプー', '歯磨き', '掃除'],
    'ファッション': ['服', 'シャツ', 'パンツ', 'ジャケット', 'コート', '靴', 'バッグ', 'アクセサリー'],
    'ビューティー': ['化粧品', 'コスメ', 'スキンケア', '美容', 'フェイス', 'ボディ'],
    'スポーツ・アウトドア': ['スポーツ', 'ランニング', 'ヨガ', 'キャンプ', 'フィットネス', 'トレーニング'],
    'ゲーム': ['ゲーム', 'PlayStation', 'Nintendo', 'Switch', 'Xbox', 'Steam'],
    'おもちゃ': ['おもちゃ', 'フィギュア', 'プラモデル', 'レゴ', 'ぬいぐるみ'],
    'ベビー・キッズ': ['ベビー', 'キッズ', '子供', 'おむつ', 'ミルク', 'ベビーカー']
  }

  const lowerText = text.toLowerCase()

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => lowerText.includes(keyword.toLowerCase()))) {
      return category
    }
  }

  return 'その他'
}

export function isAmazonEmail(from: string, subject: string): boolean {
  const amazonDomains = [
    'amazon.co.jp',
    'amazon.com',
    'amazonses.com',
    'amazon.jp',
    'marketplace.amazon.co.jp'
  ]

  const lowerFrom = from.toLowerCase()
  return amazonDomains.some(domain => lowerFrom.includes(domain))
}