// Credit card statement email parser for Japanese card companies

interface CreditCardTransaction {
  merchant: string
  amount: number
  date: Date
  category?: string
  cardLast4?: string
  cardBrand: string
  statementMonth?: string
  totalAmount?: number
}

function toHalfWidth(input: string): string {
  return input.replace(/[！-～]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
              .replace(/　/g, ' ')
}

// 楽天カード parser
export function parseRakutenCardEmail(from: string, subject: string, bodyText: string, bodyHtml: string): CreditCardTransaction[] | null {
  try {
    // Skip 速報版 (preliminary notification) - wait for confirmed details
    if (subject.includes('速報版') || bodyText.includes('速報版') || bodyText.includes('詳細な情報は、後日配信される')) {
      return null
    }

    // Check if it's a Rakuten Card statement
    if (!subject.includes('楽天カード') && !subject.includes('利用明細') && !subject.includes('請求') && !subject.includes('ご利用')) {
      return null
    }

    const transactions: CreditCardTransaction[] = []
    const text = toHalfWidth(bodyText)

    // Extract statement month
    let statementMonth: string | undefined
    const monthPattern = /(\d{4})年(\d{1,2})月/
    const monthMatch = text.match(monthPattern) || subject.match(monthPattern)
    if (monthMatch) {
      statementMonth = `${monthMatch[1]}-${monthMatch[2].padStart(2, '0')}`
    }

    // Extract total amount
    let totalAmount: number | undefined
    const totalPatterns = [
      /今回お支払い金額[:：]\s*([￥¥]?)\s?([\d,]+)\s*円/,
      /ご請求金額[:：]\s*([￥¥]?)\s?([\d,]+)\s*円/,
      /お支払い総額[:：]\s*([￥¥]?)\s?([\d,]+)\s*円/
    ]

    for (const pattern of totalPatterns) {
      const match = text.match(pattern)
      if (match) {
        totalAmount = parseInt((match[2] || match[1]).replace(/[,￥¥]/g, ''))
        break
      }
    }

    // Extract payment date (for billing notifications)
    let paymentDate: Date | undefined
    const payDatePatterns = [
      /お支払い日[:：]\s*(\d{4})[年\/]\s*(\d{1,2})[月\/]\s*(\d{1,2})日?/,
      /口座振替日[:：]\s*(\d{4})[年\/]\s*(\d{1,2})[月\/]\s*(\d{1,2})日?/
    ]

    for (const pd of payDatePatterns) {
      const m = text.match(pd)
      if (m) {
        const y = parseInt(m[1])
        const mo = parseInt(m[2])
        const d = parseInt(m[3])
        paymentDate = new Date(y, mo - 1, d)
        break
      }
    }

    // Extract card last 4 digits
    let cardLast4: string | undefined
    const cardPattern = /カード番号.*(\d{4})/
    const cardMatch = text.match(cardPattern)
    if (cardMatch) {
      cardLast4 = cardMatch[1]
    }

    // Parse individual transactions
    const transactionPattern = /(\d{1,2}\/\d{1,2})\s+(.+?)\s+([￥¥]?[\d,]+)円/g
    let match

    while ((match = transactionPattern.exec(text)) !== null) {
      const [, date, merchant, amountStr] = match
      const amount = parseInt(amountStr.replace(/[,￥¥]/g, ''))

      if (amount > 0) {
        // Parse date (MM/DD format)
        const [month, day] = date.split('/').map(n => parseInt(n))
        const year = statementMonth ? parseInt(statementMonth.split('-')[0]) : new Date().getFullYear()

        transactions.push({
          merchant: merchant.trim(),
          amount,
          date: new Date(year, month - 1, day),
          cardBrand: '楽天カード',
          cardLast4,
          statementMonth,
          totalAmount,
          category: detectCreditCardCategory(merchant)
        })
      }
    }

    // If no line items but total exists, create a billing transaction entry
    if (transactions.length === 0 && typeof totalAmount === 'number' && totalAmount > 0) {
      const date = paymentDate || (statementMonth
        ? new Date(parseInt(statementMonth.split('-')[0]), parseInt(statementMonth.split('-')[1]) - 1, 1)
        : new Date())

      transactions.push({
        merchant: '楽天カード 請求',
        amount: totalAmount,
        date,
        cardBrand: '楽天カード',
        statementMonth,
        totalAmount,
        category: detectCreditCardCategory('楽天カード')
      })
    }

    return transactions.length > 0 ? transactions : null
  } catch (error) {
    console.error('Error parsing Rakuten Card email:', error)
    return null
  }
}

// 三井住友カード parser
export function parseSMBCCardEmail(from: string, subject: string, bodyText: string, bodyHtml: string): CreditCardTransaction[] | null {
  try {
    // Check if it's an SMBC Card statement
    if (!subject.includes('三井住友') && !subject.includes('SMBC') && !subject.includes('Vpass')) {
      return null
    }

    const transactions: CreditCardTransaction[] = []
    const text = toHalfWidth(bodyText)

    // Extract card info
    let cardLast4: string | undefined
    const cardPatterns = [
      /カード番号下4桁[:：]\s*(\d{4})/,
      /\*{12}(\d{4})/
    ]

    for (const pattern of cardPatterns) {
      const match = text.match(pattern)
      if (match) {
        cardLast4 = match[1]
        break
      }
    }

    // Parse transactions (different format than Rakuten)
    const transactionPatterns = [
      /(\d{2}\/\d{2})\s+(.+?)\s+￥([\d,]+)/g,
      /(\d{4}\/\d{2}\/\d{2})\s+(.+?)\s+([\d,]+)円/g
    ]

    for (const pattern of transactionPatterns) {
      let match
      while ((match = pattern.exec(text)) !== null) {
        const [, dateStr, merchant, amountStr] = match
        const amount = parseInt(amountStr.replace(/,/g, ''))

        if (amount > 0) {
          let date: Date
          if (dateStr.includes('/')) {
            const parts = dateStr.split('/')
            if (parts.length === 3) {
              // YYYY/MM/DD format
              date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
            } else {
              // MM/DD format
              const currentYear = new Date().getFullYear()
              date = new Date(currentYear, parseInt(parts[0]) - 1, parseInt(parts[1]))
            }
          } else {
            date = new Date()
          }

          transactions.push({
            merchant: merchant.trim(),
            amount,
            date,
            cardBrand: '三井住友カード',
            cardLast4,
            category: detectCreditCardCategory(merchant)
          })
        }
      }
    }

    return transactions.length > 0 ? transactions : null
  } catch (error) {
    console.error('Error parsing SMBC Card email:', error)
    return null
  }
}

// JCBカード parser
export function parseJCBCardEmail(from: string, subject: string, bodyText: string, bodyHtml: string): CreditCardTransaction[] | null {
  try {
    // Check if it's a JCB Card statement or notification (broadened conditions)
    const lowerFrom = (from || '').toLowerCase()
    const lowerSubject = (subject || '').toLowerCase()
    const textPreview = (bodyText || '')

    const fromDomainMatched = lowerFrom.includes('jcb.co.jp') || lowerFrom.includes('myjcb')
    const brandKeywordMatched =
      lowerSubject.includes('jcb') ||
      textPreview.includes('JCBカード') ||
      lowerSubject.includes('myjcb')

    const notifyKeywordMatched =
      subject.includes('ショッピングご利用のお知らせ') ||
      subject.includes('カードご利用通知') ||
      subject.includes('ご利用のお知らせ') ||
      textPreview.includes('カードご利用通知') ||
      textPreview.includes('ご利用のお知らせ')

    if (!(fromDomainMatched || brandKeywordMatched) || !(notifyKeywordMatched || textPreview.includes('【ご利用金額】') || textPreview.includes('【ご利用先】'))) {
      return null
    }

    console.log('[JCB Parser] Processing JCB email:', { from, subject })

    const transactions: CreditCardTransaction[] = []

    // Multiple JCB patterns (based on actual email format)
    const patterns = [
      // Pattern 1: 【ご利用日時(日本時間)】　YYYY/MM/DD HH:MM\n【ご利用金額】　XXX円\n【ご利用先】　XXX
      /【ご利用日時(?:\(日本時間\))?】\s*(\d{4}\/\d{1,2}\/\d{1,2}(?:\s+\d{1,2}:\d{2})?)\s*[\r\n]+【ご利用金額】\s*([￥¥]?\s*[\d,]+)\s*円\s*[\r\n]+【ご利用先】\s*(.+?)(?:\r?\n|$)/g,

      // Pattern 2: 利用日：YYYY/MM/DD 利用先：XXX 金額：¥XXX
      /利用日[:：]\s*(\d{4}[\/\-年]\d{1,2}[\/\-月]\d{1,2}日?)\s+利用先[:：]\s*(.+?)\s+金額[:：]\s*[￥¥]?([\d,]+)\s*円?/g,

      // Pattern 3: YYYY/MM/DD XXX ¥XXX
      /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\s+(.+?)\s+[￥¥]([\d,]+)/g,

      // Pattern 4: ご利用日：MM/DD ご利用先：XXX 金額：XXX円
      /ご利用日[:：]\s*(\d{1,2}[\/\-月]\d{1,2}日?)\s+ご利用先[:：]\s*(.+?)\s+[金額合計]*[:：]?\s*[￥¥]?([\d,]+)\s*円/g,

      // Pattern 5: Simple format with date, merchant, amount
      /(\d{1,2}月\d{1,2}日)\s+(.+?)\s+[￥¥]?([\d,]+)円/g,

      // Pattern 6: ご利用日時 format
      /ご利用日時[:：]\s*(\d{4}[\/\-年]\d{1,2}[\/\-月]\d{1,2}[日\s])\s*.*?ご利用店名[:：]\s*(.+?)\s*.*?ご利用金額[:：]\s*[￥¥]?([\d,]+)\s*円/gs
    ]

    const text = toHalfWidth(bodyText)

    // Attempt to extract a more specific card brand (e.g., JCBカードW NL)
    // Examples: "カード名称　：　【ＯＳ】ＪＣＢカードＷ　ＮＬ"
    let detectedCardBrand: string | undefined
    const cardNamePatterns = [
      /カード名称\s*[:：]\s*(.+)/,
      /カード名\s*[:：]\s*(.+)/
    ]

    for (const cp of cardNamePatterns) {
      const m = text.match(cp)
      if (m && m[1]) {
        // Remove decorative brackets like 【ＯＳ】
        const raw = m[1].replace(/【[^】]*】/g, '').trim()
        if (raw) {
          detectedCardBrand = raw
          break
        }
      }
    }
    for (const pattern of patterns) {
      let match
      pattern.lastIndex = 0 // Reset regex state

      while ((match = pattern.exec(text)) !== null) {
        try {
          let dateStr, merchant, amountStr

          // Pattern 1 has different order: date, amount, merchant
          if (match[0].includes('【ご利用日時')) {
            [, dateStr, amountStr, merchant] = match
          } else {
            [, dateStr, merchant, amountStr] = match
          }

          const amount = parseInt(amountStr.replace(/[,￥¥\s]/g, ''))

          if (amount > 0 && merchant && merchant.trim().length > 0) {
            // Parse date (handle multiple formats)
            let date: Date

            if (dateStr.match(/\d{4}/)) {
              // Has year
              const cleaned = dateStr.replace(/[年月日\s]/g, '/').replace(/\/+/g, '/').replace(/\/$/, '')
              const parts = cleaned.split('/').map(n => parseInt(n))
              date = new Date(parts[0], parts[1] - 1, parts[2] || 1)
            } else {
              // Only month/day
              const cleaned = dateStr.replace(/[月日\s]/g, '/').replace(/\/+/g, '/').replace(/\/$/, '')
              const parts = cleaned.split('/').map(n => parseInt(n))
              const currentYear = new Date().getFullYear()
              date = new Date(currentYear, parts[0] - 1, parts[1] || 1)
            }

            // Validate date
            if (!isNaN(date.getTime())) {
              transactions.push({
                merchant: merchant.trim(),
                amount,
                date,
                cardBrand: detectedCardBrand || 'JCB',
                category: detectCreditCardCategory(merchant)
              })

              console.log('[JCB Parser] Extracted transaction:', { merchant: merchant.trim(), amount, date })
            }
          }
        } catch (err) {
          console.error('[JCB Parser] Error parsing match:', err)
          continue
        }
      }
    }

    if (transactions.length > 0) {
      console.log(`[JCB Parser] Successfully extracted ${transactions.length} transactions`)
    } else {
      console.log('[JCB Parser] No transactions found. Email body preview:', text.substring(0, 500))
    }

    return transactions.length > 0 ? transactions : null
  } catch (error) {
    console.error('Error parsing JCB Card email:', error)
    return null
  }
}

// イオンカード parser
export function parseAeonCardEmail(from: string, subject: string, bodyText: string, bodyHtml: string): CreditCardTransaction[] | null {
  try {
    // Check if it's an AEON Card statement
    if (!subject.includes('イオンカード') && !subject.includes('AEON') && !bodyText.includes('イオンクレジット')) {
      return null
    }

    const transactions: CreditCardTransaction[] = []
    const text = toHalfWidth(bodyText)

    // AEON specific format
    const transactionPattern = /(\d{2}月\d{2}日)\s+(.+?)\s+([\d,]+)円/g
    let match

    while ((match = transactionPattern.exec(text)) !== null) {
      const [, dateStr, merchant, amountStr] = match
      const amount = parseInt(amountStr.replace(/,/g, ''))

      // Parse Japanese date format (MM月DD日)
      const dateMatch = dateStr.match(/(\d{1,2})月(\d{1,2})日/)
      if (dateMatch && amount > 0) {
        const currentYear = new Date().getFullYear()
        const date = new Date(currentYear, parseInt(dateMatch[1]) - 1, parseInt(dateMatch[2]))

        transactions.push({
          merchant: merchant.trim(),
          amount,
          date,
          cardBrand: 'イオンカード',
          category: detectCreditCardCategory(merchant)
        })
      }
    }

    return transactions.length > 0 ? transactions : null
  } catch (error) {
    console.error('Error parsing AEON Card email:', error)
    return null
  }
}

// セゾンカード parser
export function parseSaisonCardEmail(from: string, subject: string, bodyText: string, bodyHtml: string): CreditCardTransaction[] | null {
  try {
    // Check if it's a Saison Card statement
    if (!subject.includes('セゾン') && !subject.includes('SAISON') && !bodyText.includes('クレディセゾン')) {
      return null
    }

    const transactions: CreditCardTransaction[] = []
    const text = toHalfWidth(bodyText)

    // Saison specific format
    const transactionPattern = /(\d{2}\/\d{2})\s+(.+?)\s+￥([\d,]+)/g
    let match

    while ((match = transactionPattern.exec(text)) !== null) {
      const [, dateStr, merchant, amountStr] = match
      const amount = parseInt(amountStr.replace(/,/g, ''))
      const [month, day] = dateStr.split('/').map(n => parseInt(n))

      if (amount > 0) {
        const currentYear = new Date().getFullYear()
        transactions.push({
          merchant: merchant.trim(),
          amount,
          date: new Date(currentYear, month - 1, day),
          cardBrand: 'セゾンカード',
          category: detectCreditCardCategory(merchant)
        })
      }
    }

    return transactions.length > 0 ? transactions : null
  } catch (error) {
    console.error('Error parsing Saison Card email:', error)
    return null
  }
}

function detectCreditCardCategory(merchant: string): string {
  const merchantCategories: { [key: string]: string[] } = {
    'コンビニ': ['セブン', 'ファミリーマート', 'ローソン', 'ミニストップ', 'デイリー'],
    'スーパー': ['イオン', 'イトーヨーカドー', '西友', 'ライフ', 'マルエツ', 'サミット'],
    'ドラッグストア': ['マツモトキヨシ', 'ウエルシア', 'ツルハ', 'サンドラッグ', 'スギ薬局'],
    '飲食店': ['マクドナルド', 'スターバックス', 'ドトール', '吉野家', 'すき家', '牛角', 'ガスト'],
    'ガソリン': ['ENEOS', 'エネオス', '出光', 'コスモ石油', 'シェル', 'エッソ'],
    '交通': ['JR', 'メトロ', '私鉄', 'バス', 'タクシー', 'PASMO', 'Suica'],
    'ネットショッピング': ['Amazon', 'アマゾン', '楽天', 'Yahoo', 'メルカリ', 'ZOZO'],
    '携帯・通信': ['ドコモ', 'au', 'ソフトバンク', 'ワイモバイル', '楽天モバイル'],
    '公共料金': ['電気', 'ガス', '水道', 'NHK', '東京電力', '東京ガス'],
    '保険': ['生命保険', '損害保険', '医療保険', 'アフラック', '日本生命'],
    'サブスク': ['Netflix', 'Spotify', 'Apple', 'Google', 'Adobe', 'Microsoft'],
    '百貨店': ['三越', '伊勢丹', '高島屋', '大丸', '松坂屋', '西武', '東武'],
    '家電量販店': ['ビックカメラ', 'ヨドバシ', 'ヤマダ電機', 'エディオン', 'ケーズデンキ'],
    'ホームセンター': ['カインズ', 'コーナン', 'ビバホーム', 'ジョイフル本田'],
    'ファッション': ['ユニクロ', 'GU', 'ZARA', 'H&M', 'しまむら', '無印良品']
  }

  const lowerMerchant = merchant.toLowerCase()

  for (const [category, keywords] of Object.entries(merchantCategories)) {
    if (keywords.some(keyword => lowerMerchant.includes(keyword.toLowerCase()))) {
      return category
    }
  }

  return 'その他'
}

export function isCreditCardEmail(from: string, subject: string): boolean {
  const lowerFrom = from.toLowerCase()
  const lowerSubject = subject.toLowerCase()

  const companyKeywords = [
    '楽天カード','三井住友','smbc','vpass','jcb','myjcb','イオンカード','aeon','セゾン','saison','オリコ','orico','エポス','epos','ビューカード','viewcard','dカード','docomo','au pay','american express','amex','paypay-card'
  ]

  const companyDomains = [
    'rakuten-card.co.jp','smbc-card.com','vpass.ne.jp','jcb.co.jp','aeoncard.co.jp','eposcard.co.jp','orico.co.jp','viewcard.co.jp','d-card.jp','saisoncard.co.jp','paypay-card.co.jp','americanexpress.com','kddi.com'
  ]

  const intentKeywords = ['明細','請求','利用','ご利用','お支払い','請求額','請求金額','ご請求','利用通知','利用のお知らせ','ご利用の確認','ショッピングご利用','カードご利用通知']

  const companyMatched = companyKeywords.some(k => lowerFrom.includes(k.toLowerCase()) || lowerSubject.includes(k.toLowerCase()))
    || companyDomains.some(d => lowerFrom.includes(d))

  const intentMatched = intentKeywords.some(k => subject.includes(k))

  return companyMatched && intentMatched
}
