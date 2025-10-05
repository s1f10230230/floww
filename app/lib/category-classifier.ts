/**
 * Category classification based on merchant name and item description
 */

interface CategoryRule {
  category: string
  keywords: string[]
}

const CATEGORY_RULES: CategoryRule[] = [
  {
    category: '食費',
    keywords: [
      'スーパー', 'コンビニ', 'セブン', 'ローソン', 'ファミマ', 'ファミリーマート',
      'イオン', '西友', 'ライフ', 'マルエツ', 'サミット', 'OK', 'オーケー',
      'レストラン', '居酒屋', 'カフェ', 'スタバ', 'スターバックス', 'ドトール',
      'マック', 'マクドナルド', 'ケンタッキー', 'すき家', '吉野家', '松屋',
      'ラーメン', '寿司', '焼肉', '焼き鳥', 'うどん', 'そば', '定食',
      '出前館', 'Uber', 'ウーバー', 'menu', 'デリバリー', '宅配',
      '食品', '弁当', 'グルメ', 'ダイニング', 'フード', '飲食'
    ]
  },
  {
    category: '日用品',
    keywords: [
      'ドラッグ', '薬局', 'マツキヨ', 'ウエルシア', 'ツルハ', 'サンドラッグ',
      'ダイソー', 'セリア', 'キャンドゥ', '100均', '百均',
      'ニトリ', '無印', 'IKEA', 'イケア',
      '洗剤', 'ティッシュ', 'トイレットペーパー', '日用品', '生活雑貨'
    ]
  },
  {
    category: '衣類',
    keywords: [
      'ユニクロ', 'UNIQLO', 'GU', 'ジーユー', 'しまむら', 'ZARA', 'H&M',
      'アパレル', '服', '洋服', 'シャツ', 'パンツ', 'スカート', 'ドレス',
      'ファッション', 'クリーニング', '靴', 'スニーカー', 'バッグ', 'アクセサリー'
    ]
  },
  {
    category: '美容・健康',
    keywords: [
      '美容', '美容院', 'サロン', 'ヘアサロン', 'エステ', 'ネイル', 'マッサージ',
      'ジム', 'フィットネス', 'ヨガ', 'スポーツクラブ',
      '化粧品', 'コスメ', 'スキンケア', 'シャンプー', '整体', '接骨院'
    ]
  },
  {
    category: '趣味・娯楽',
    keywords: [
      'カラオケ', 'ボウリング', 'ゲームセンター', 'ゲーセン', 'アミューズメント',
      '映画', 'シネマ', 'TOHOシネマ', '劇場', 'チケット',
      'ライブ', 'コンサート', 'イベント', 'テーマパーク', 'ディズニー', 'USJ',
      'ゲーム', 'Steam', 'PlayStation', 'Nintendo', '任天堂', 'Switch',
      '趣味', 'ホビー', '釣り', 'ゴルフ', 'スポーツ用品'
    ]
  },
  {
    category: '書籍',
    keywords: [
      '本', '書籍', 'ブック', 'BOOK', 'Amazon Kindle', 'Kindle',
      '紀伊國屋', 'TSUTAYA', 'ツタヤ', 'ブックオフ', '丸善', 'ジュンク堂',
      '雑誌', 'マンガ', '漫画', 'コミック', '電子書籍'
    ]
  },
  {
    category: '家電・ガジェット',
    keywords: [
      'ヨドバシ', 'ビックカメラ', 'ヤマダ電機', 'エディオン', 'ケーズデンキ', 'ノジマ',
      'Apple', 'アップル', 'Mac', 'iPhone', 'iPad',
      'パソコン', 'PC', 'ノートパソコン', 'タブレット', 'スマホ', 'スマートフォン',
      'イヤホン', 'ヘッドホン', '充電器', 'ケーブル', 'バッテリー',
      '家電', '電化製品', 'テレビ', '冷蔵庫', '洗濯機', '掃除機', 'エアコン'
    ]
  },
  {
    category: 'サブスク',
    keywords: [
      'Netflix', 'Amazon Prime', 'プライム', 'Spotify', 'Apple Music',
      'YouTube Premium', 'Hulu', 'Disney', 'ディズニー',
      'Adobe', 'Office 365', 'Microsoft 365', 'Dropbox', 'iCloud',
      'サブスク', 'サブスクリプション', '月額', '定期購読', '会費', 'メンバーシップ'
    ]
  }
]

/**
 * Classify transaction into a category based on merchant name and item
 */
export function classifyCategory(merchant: string, itemName?: string): string {
  const text = `${merchant} ${itemName || ''}`.toLowerCase()

  for (const rule of CATEGORY_RULES) {
    for (const keyword of rule.keywords) {
      if (text.includes(keyword.toLowerCase())) {
        return rule.category
      }
    }
  }

  return 'その他'
}

/**
 * Guess category with confidence score
 */
export function classifyCategoryWithConfidence(
  merchant: string,
  itemName?: string
): { category: string; confidence: number } {
  const text = `${merchant} ${itemName || ''}`.toLowerCase()
  const matches: { category: string; count: number }[] = []

  for (const rule of CATEGORY_RULES) {
    let matchCount = 0
    for (const keyword of rule.keywords) {
      if (text.includes(keyword.toLowerCase())) {
        matchCount++
      }
    }
    if (matchCount > 0) {
      matches.push({ category: rule.category, count: matchCount })
    }
  }

  if (matches.length === 0) {
    return { category: 'その他', confidence: 0 }
  }

  // Sort by match count and return the best match
  matches.sort((a, b) => b.count - a.count)
  const bestMatch = matches[0]

  // Confidence is based on match count (max 1.0)
  const confidence = Math.min(bestMatch.count * 0.3, 1.0)

  return { category: bestMatch.category, confidence }
}
