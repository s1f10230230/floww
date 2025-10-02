// Rakuten email parser with comprehensive patterns

interface RakutenTransaction {
  merchant: string
  amount: number
  itemName?: string
  date: Date
  category?: string
  cardLast4?: string
  cardBrand?: string
  orderNumber?: string
  points?: number
}

export function parseRakutenEmail(from: string, subject: string, bodyText: string, bodyHtml: string): RakutenTransaction | null {
  try {
    // Check if it's a Rakuten order email
    const isOrderEmail =
      subject.includes('注文確認') ||
      subject.includes('ご注文ありがとうございます') ||
      subject.includes('発送完了') ||
      subject.includes('楽天市場') ||
      bodyText.includes('注文番号') ||
      bodyText.includes('受注番号')

    if (!isOrderEmail) return null

    // Multiple patterns for amount extraction
    const amountPatterns = [
      /合計金額[:：]\s*([￥¥]?)\s?([\d,]+)\s*円/,
      /お支払い合計[:：]\s*([￥¥]?)\s?([\d,]+)\s*円/,
      /ご請求金額[:：]\s*([￥¥]?)\s?([\d,]+)\s*円/,
      /商品合計[:：]\s*([￥¥]?)\s?([\d,]+)\s*円/,
      /総合計[:：]\s*([￥¥]?)\s?([\d,]+)\s*円/,
      /合計\s*([￥¥]?)\s?([\d,]+)\s*円/,
      // HTML patterns
      /<td[^>]*>合計金額<\/td>\s*<td[^>]*>([￥¥]?)\s?([\d,]+)\s*円/i,
      /<span[^>]*class="[^"]*total[^"]*"[^>]*>([￥¥]?)\s?([\d,]+)/i
    ]

    let amount = 0
    for (const pattern of amountPatterns) {
      const match = bodyText.match(pattern) || bodyHtml.match(pattern)
      if (match) {
        // The amount is in the second or third capture group depending on pattern
        amount = parseInt((match[2] || match[1]).replace(/[,￥¥]/g, ''))
        if (amount > 0) break
      }
    }

    if (amount === 0) return null

    // Extract shop name
    let shopName = '楽天市場'
    const shopPatterns = [
      /ショップ名[:：]\s*(.+?)(?:\n|\r|<)/,
      /店舗名[:：]\s*(.+?)(?:\n|\r|<)/,
      /【(.+?)】/,  // Shop names often in brackets
      /from\s+(.+?)(?:\n|\r|<)/i
    ]

    for (const pattern of shopPatterns) {
      const match = bodyText.match(pattern) || bodyHtml.match(pattern)
      if (match) {
        shopName = match[1].trim()
        break
      }
    }

    // Extract order number
    let orderNumber: string | undefined
    const orderPatterns = [
      /注文番号[:：]\s*([\d-]+)/,
      /受注番号[:：]\s*([\d-]+)/,
      /Order ID[:：]\s*([\d-]+)/,
      /注文ID[:：]\s*([\d-]+)/
    ]

    for (const pattern of orderPatterns) {
      const match = bodyText.match(pattern) || bodyHtml.match(pattern)
      if (match) {
        orderNumber = match[1]
        break
      }
    }

    // Extract item names
    const itemNames: string[] = []
    const itemPatterns = [
      /商品名[:：]\s*(.+?)(?:\n|\r|個数|数量|価格)/g,
      /【商品】\s*(.+?)(?:\n|\r|【)/g,
      /商品[:：]\s*(.+?)(?:\n|\r)/g,
      /<a[^>]*class="[^"]*item[^"]*"[^>]*>([^<]+)</gi
    ]

    for (const pattern of itemPatterns) {
      let match
      const text = bodyText + ' ' + bodyHtml
      while ((match = pattern.exec(text)) !== null) {
        const itemName = match[1].trim()
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#039;/g, "'")

        if (itemName && itemName.length > 2 && !itemNames.includes(itemName)) {
          itemNames.push(itemName)
        }
      }
    }

    // Extract Rakuten points
    let points: number | undefined
    const pointPatterns = [
      /ポイント[:：]\s*([\d,]+)\s*(?:ポイント|pt|P)/i,
      /獲得予定ポイント[:：]\s*([\d,]+)/,
      /楽天ポイント[:：]\s*([\d,]+)/
    ]

    for (const pattern of pointPatterns) {
      const match = bodyText.match(pattern) || bodyHtml.match(pattern)
      if (match) {
        points = parseInt(match[1].replace(/,/g, ''))
        break
      }
    }

    // Extract card information
    const cardInfo = extractRakutenCardInfo(bodyText + ' ' + bodyHtml)

    // Extract date
    const date = extractRakutenOrderDate(bodyText, bodyHtml)

    return {
      merchant: `楽天市場 - ${shopName}`,
      amount,
      itemName: itemNames.length > 0 ? itemNames.join(', ') : undefined,
      date: date || new Date(),
      category: detectRakutenCategory(itemNames.join(' ') + ' ' + shopName),
      orderNumber,
      points,
      ...cardInfo
    }
  } catch (error) {
    console.error('Error parsing Rakuten email:', error)
    return null
  }
}

function extractRakutenCardInfo(text: string): { cardLast4?: string, cardBrand?: string } {
  const cardInfo: { cardLast4?: string, cardBrand?: string } = {}

  // Pattern for card last 4 digits
  const last4Patterns = [
    /下4桁[:：]\s*(\d{4})/,
    /末尾[:：]\s*(\d{4})/,
    /\*{4}\s*(\d{4})/,
    /[Xx]{4}\s*(\d{4})/,
    /カード番号.*(\d{4})/,
    /クレジットカード.*(\d{4})/
  ]

  for (const pattern of last4Patterns) {
    const match = text.match(pattern)
    if (match) {
      cardInfo.cardLast4 = match[1]
      break
    }
  }

  // Detect card brand - including Japanese card companies
  const cardBrands = [
    { pattern: /楽天カード/i, brand: '楽天カード' },
    { pattern: /VISA/i, brand: 'VISA' },
    { pattern: /Master(?:card)?/i, brand: 'Mastercard' },
    { pattern: /JCB/i, brand: 'JCB' },
    { pattern: /(?:AMEX|American Express|アメックス)/i, brand: 'AMEX' },
    { pattern: /三井住友/i, brand: '三井住友カード' },
    { pattern: /イオンカード/i, brand: 'イオンカード' },
    { pattern: /セゾン/i, brand: 'セゾンカード' },
    { pattern: /オリコ/i, brand: 'オリコカード' },
    { pattern: /エポス/i, brand: 'エポスカード' }
  ]

  for (const { pattern, brand } of cardBrands) {
    if (pattern.test(text)) {
      cardInfo.cardBrand = brand
      break
    }
  }

  return cardInfo
}

function extractRakutenOrderDate(bodyText: string, bodyHtml: string): Date | null {
  const datePatterns = [
    /注文日時[:：]\s*(\d{4})[年/-](\d{1,2})[月/-](\d{1,2})/,
    /注文日[:：]\s*(\d{4})[年/-](\d{1,2})[月/-](\d{1,2})/,
    /ご注文日[:：]\s*(\d{4})[年/-](\d{1,2})[月/-](\d{1,2})/,
    /(\d{4})[年/-](\d{1,2})[月/-](\d{1,2})日?\s*注文/
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

function detectRakutenCategory(text: string): string {
  const categories: { [key: string]: string[] } = {
    '食品・飲料': ['食品', '飲料', 'グルメ', 'スイーツ', '米', '肉', '魚', '野菜', 'フルーツ', 'お酒', 'ビール', 'ワイン'],
    'ファッション': ['服', 'メンズ', 'レディース', 'シャツ', 'パンツ', 'ワンピース', 'スカート', 'ジャケット', 'コート'],
    'バッグ・小物': ['バッグ', '財布', 'ポーチ', 'アクセサリー', '時計', 'ベルト', '帽子', 'マフラー'],
    '靴': ['靴', 'スニーカー', 'ブーツ', 'パンプス', 'サンダル', 'シューズ'],
    '家電': ['家電', 'テレビ', '冷蔵庫', '洗濯機', 'エアコン', '掃除機', '電子レンジ', '炊飯器'],
    'スマホ・タブレット': ['スマホ', 'iPhone', 'Android', 'iPad', 'タブレット', 'ケース', '充電器'],
    'パソコン・周辺機器': ['パソコン', 'PC', 'ノート', 'デスクトップ', 'マウス', 'キーボード', 'プリンター'],
    '美容・コスメ': ['化粧品', 'コスメ', 'スキンケア', 'メイク', 'シャンプー', 'ヘアケア', '香水'],
    '健康・医薬品': ['サプリ', 'プロテイン', '薬', '健康食品', 'ダイエット', '医薬品'],
    'スポーツ・アウトドア': ['スポーツ', 'ゴルフ', 'ランニング', 'ヨガ', 'キャンプ', 'アウトドア', 'フィットネス'],
    '本・CD・DVD': ['本', '書籍', '雑誌', 'コミック', '漫画', 'CD', 'DVD', 'Blu-ray'],
    'ゲーム・おもちゃ': ['ゲーム', 'おもちゃ', 'フィギュア', 'プラモデル', 'Nintendo', 'PlayStation'],
    'インテリア・家具': ['インテリア', '家具', 'ソファ', 'ベッド', 'テーブル', '椅子', 'カーテン', '照明'],
    '日用品': ['日用品', '洗剤', 'ティッシュ', 'トイレットペーパー', '掃除用品', 'キッチン用品'],
    'ペット用品': ['ペット', '犬', '猫', 'ドッグフード', 'キャットフード', 'ペット用品'],
    'ベビー・キッズ': ['ベビー', 'キッズ', '子供', 'おむつ', 'ミルク', 'ベビーカー', 'チャイルドシート']
  }

  const lowerText = text.toLowerCase()

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => lowerText.includes(keyword.toLowerCase()))) {
      return category
    }
  }

  return 'その他'
}

export function isRakutenEmail(from: string, subject: string): boolean {
  const rakutenDomains = [
    'rakuten.co.jp',
    'rakuten.ne.jp',
    'rakuten.com',
    'mail.rakuten.co.jp',
    'order.rakuten.co.jp',
    'shop.rakuten.co.jp'
  ]

  const lowerFrom = from.toLowerCase()
  return rakutenDomains.some(domain => lowerFrom.includes(domain)) ||
         subject.includes('楽天')
}