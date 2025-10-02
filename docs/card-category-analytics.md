# カード別・カテゴリ別分析機能

## 📊 概要

Gmailから取得したクレジットカード利用明細を自動的に解析し、カード別・カテゴリ別に分類して表示する機能です。

## 🎯 主な機能

### 1. **自動抽出**
- クレジットカード会社からの明細メールを自動検出
- 取引情報を自動的に抽出・分類
- カード情報を自動登録

### 2. **対応カード会社**
- ✅ 楽天カード
- ✅ 三井住友カード (SMBC/Vpass)
- ✅ JCB
- ✅ イオンカード
- ✅ セゾンカード
- ✅ その他汎用パーサー対応

### 3. **分析機能**
- **カード別分析**
  - カードごとの利用金額・件数
  - カテゴリ内訳
  - よく使う店舗
  - 月別推移

- **カテゴリ別分析**
  - カテゴリごとの支出額・件数
  - カード別内訳
  - よく使う店舗
  - 月別推移

## 🚀 使い方

### API エンドポイント

#### 1. カード別分析

```typescript
GET /api/analytics/card-breakdown
```

**クエリパラメータ:**
```typescript
{
  startDate: string  // YYYY-MM-DD (省略可、デフォルト: 90日前)
  endDate: string    // YYYY-MM-DD (省略可、デフォルト: 今日)
  cardLast4: string  // フィルター用 (省略可)
}
```

**レスポンス例:**
```json
{
  "success": true,
  "data": [
    {
      "cardId": "uuid",
      "cardLast4": "1234",
      "cardBrand": "楽天カード",
      "cardName": "メインカード",
      "totalAmount": 125000,
      "transactionCount": 45,
      "categories": [
        {
          "category": "食費",
          "amount": 35000,
          "count": 15,
          "percentage": 28.0
        }
      ],
      "monthlyTrend": [
        {
          "month": "2025-09",
          "amount": 42000,
          "count": 15
        }
      ],
      "topMerchants": [
        {
          "merchant": "Amazon.co.jp",
          "amount": 25000,
          "count": 8
        }
      ]
    }
  ],
  "summary": {
    "totalCards": 3,
    "totalAmount": 250000,
    "totalTransactions": 120,
    "period": {
      "startDate": "2025-09-01",
      "endDate": "2025-10-01"
    }
  }
}
```

#### 2. カテゴリ別分析

```typescript
GET /api/analytics/category-breakdown
```

**クエリパラメータ:**
```typescript
{
  startDate: string   // YYYY-MM-DD
  endDate: string     // YYYY-MM-DD
  category: string    // フィルター用 (省略可)
  groupBy: string     // 'category' | 'card' | 'month'
}
```

**レスポンス例:**
```json
{
  "success": true,
  "data": [
    {
      "category": "食費",
      "totalAmount": 85000,
      "transactionCount": 42,
      "percentage": 34.0,
      "averageAmount": 2023.8,
      "cards": [
        {
          "cardLast4": "1234",
          "cardBrand": "楽天カード",
          "amount": 60000,
          "count": 30
        }
      ],
      "merchants": [
        {
          "merchant": "セブンイレブン",
          "amount": 15000,
          "count": 12
        }
      ],
      "trend": [
        {
          "month": "2025-09",
          "amount": 42000,
          "count": 21
        }
      ]
    }
  ],
  "summary": {
    "totalCategories": 8,
    "totalAmount": 250000,
    "totalTransactions": 120
  }
}
```

### フロントエンド実装

#### 基本的な使用方法

```typescript
import EnhancedCardCategoryView from '@/app/components/EnhancedCardCategoryView'

export default function AnalyticsPage() {
  return (
    <div>
      <h1>支出分析</h1>
      <EnhancedCardCategoryView />
    </div>
  )
}
```

#### カスタムフックで使用

```typescript
'use client'

import { useState, useEffect } from 'react'

export function useCardAnalytics(startDate: string, endDate: string) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const res = await fetch(
        `/api/analytics/card-breakdown?startDate=${startDate}&endDate=${endDate}`
      )
      const result = await res.json()
      setData(result.data)
      setLoading(false)
    }
    fetchData()
  }, [startDate, endDate])

  return { data, loading }
}
```

## 🔧 データベース構造

### テーブル: `credit_cards`

```sql
CREATE TABLE credit_cards (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  card_last4 VARCHAR(4),
  card_brand VARCHAR(50),
  card_name TEXT,
  color VARCHAR(7),
  is_active BOOLEAN,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(user_id, card_last4)
);
```

### テーブル: `transactions`

既存テーブルに以下のカラムが追加されています:

```sql
ALTER TABLE transactions
ADD COLUMN card_last4 VARCHAR(4),
ADD COLUMN card_brand VARCHAR(50),
ADD COLUMN payment_method VARCHAR(50);
```

## 📝 カテゴリ自動分類

### サポートされているカテゴリ

| カテゴリ | 判定キーワード |
|---------|---------------|
| コンビニ | セブン, ファミマ, ローソン, ミニストップ |
| スーパー | イオン, イトーヨーカドー, 西友, ライフ |
| ドラッグストア | マツキヨ, ウエルシア, ツルハ, サンドラッグ |
| 飲食店 | マクドナルド, スタバ, ドトール, 吉野家 |
| ガソリン | ENEOS, エネオス, 出光, コスモ |
| 交通 | JR, メトロ, タクシー, PASMO, Suica |
| ネットショッピング | Amazon, アマゾン, 楽天, Yahoo |
| 携帯・通信 | ドコモ, au, ソフトバンク, 楽天モバイル |
| サブスク | Netflix, Spotify, Apple, Google, Adobe |
| 家電 | ビックカメラ, ヨドバシ, ヤマダ電機 |

### カスタムカテゴリの追加

```typescript
// app/lib/credit-card-extractor.ts の detectCategory 関数を編集
function detectCategory(merchant: string): string {
  const categories: { [key: string]: string[] } = {
    // 既存のカテゴリ...
    '新カテゴリ': ['キーワード1', 'キーワード2', 'キーワード3']
  }
  // ...
}
```

## 🎨 UI コンポーネント

### EnhancedCardCategoryView

**特徴:**
- カード別/カテゴリ別のビュー切り替え
- 期間選択機能
- 詳細ビューの表示/非表示
- レスポンシブデザイン

**Props:**
```typescript
// なし（内部でAPIを呼び出し）
```

**使用例:**
```tsx
<EnhancedCardCategoryView />
```

### 既存コンポーネントとの互換性

既存の `CardBreakdown.tsx` と `CategoryBreakdown.tsx` は引き続き使用可能:

```tsx
import CardBreakdown from '@/app/components/CardBreakdown'
import CategoryBreakdown from '@/app/components/CategoryBreakdown'

// トランザクションデータを直接渡す場合
<CardBreakdown transactions={transactions} />
<CategoryBreakdown transactions={transactions} />
```

## 🔄 メール同期との連携

### 自動カード登録

メール同期時にクレジットカード情報が自動的に登録されます:

```typescript
// app/api/sync-emails-v2/route.ts で自動実行

// クレジットカード取引を検出
const creditCardTxs = extractCreditCardTransactions(
  from, subject, bodyText, bodyHtml
)

// カード情報を自動登録
for (const tx of creditCardTxs) {
  if (tx.cardLast4) {
    await registerCardFromTransaction(
      supabase,
      userId,
      tx.cardLast4,
      tx.cardBrand
    )
  }
}
```

### パーサーの優先順位

1. **parseEmailV2** - 既存の統合パーサー
2. **extractCreditCardTransactions** - クレジットカード専用パーサー
3. **parseEmail** - レガシーパーサー（フォールバック）

## 📊 使用例

### 1. ダッシュボードに統合

```tsx
// app/dashboard/page.tsx
import EnhancedCardCategoryView from '@/app/components/EnhancedCardCategoryView'

export default function Dashboard() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">ダッシュボード</h1>
      <EnhancedCardCategoryView />
    </div>
  )
}
```

### 2. カード管理ページ

```tsx
// app/cards/page.tsx
'use client'

import { useCardAnalytics } from '@/app/hooks/useCardAnalytics'

export default function CardsPage() {
  const { data, loading } = useCardAnalytics(
    '2025-09-01',
    '2025-10-01'
  )

  return (
    <div>
      {loading ? (
        <p>読み込み中...</p>
      ) : (
        data.map(card => (
          <div key={card.cardId}>
            <h2>{card.cardName}</h2>
            <p>合計: ¥{card.totalAmount.toLocaleString()}</p>
          </div>
        ))
      )}
    </div>
  )
}
```

### 3. レポート生成

```typescript
async function generateMonthlyReport(userId: string, month: string) {
  const startDate = `${month}-01`
  const endDate = new Date(month + '-01')
  endDate.setMonth(endDate.getMonth() + 1)

  const res = await fetch(
    `/api/analytics/card-breakdown?startDate=${startDate}&endDate=${endDate.toISOString().split('T')[0]}`
  )

  const { data, summary } = await res.json()

  return {
    month,
    totalSpent: summary.totalAmount,
    cardBreakdown: data,
    // PDFやExcelに変換...
  }
}
```

## 🐛 トラブルシューティング

### カード情報が抽出されない

**原因:**
- メールフォーマットが未対応
- カード番号が記載されていない

**解決策:**
```typescript
// ログを確認
console.log('Parser result:', extractCreditCardTransactions(...))

// 汎用パーサーを拡張
// app/lib/credit-card-extractor.ts の extractGenericCreditCardTransactions を編集
```

### カテゴリ分類が不正確

**解決策:**
```typescript
// detectCategory 関数にキーワードを追加
const categories = {
  '該当カテゴリ': ['新しいキーワード', ...]
}
```

### データが表示されない

**確認項目:**
1. メール同期が完了しているか
2. トランザクションにcard_last4が設定されているか
3. 日付範囲が適切か

```sql
-- データを確認
SELECT card_last4, card_brand, COUNT(*), SUM(amount)
FROM transactions
WHERE user_id = 'your-user-id'
  AND transaction_date >= '2025-09-01'
GROUP BY card_last4, card_brand;
```

## 🎯 次のステップ

1. ✅ メール同期の実行
2. ✅ クレジットカード取引の自動抽出
3. ✅ 分析ダッシュボードの表示
4. 🔄 カスタムカテゴリの追加
5. 🔄 レポート機能の実装
6. 🔄 予算管理機能との連携

## 📚 関連ドキュメント

- [メール同期改善ガイド](./email-sync-improvements.md)
- [データベーススキーマ](../supabase/schema.sql)
- [クレジットカードパーサー](../app/lib/email-parsers/credit-card.ts)
