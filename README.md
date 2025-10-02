# Floww - 自動家計簿＆サブスク管理

Gmailと連携するだけで自動的に支出を管理。解約忘れのサブスクも発見できる家計簿アプリです。

## 機能

### メイン機能：自動家計簿（60%）
- Gmail連携で自動ログイン
- EC系メール自動取得（Amazon、楽天、Yahoo）
- 購入金額の自動抽出
- 月別・カテゴリ別の支出表示
- 「入力不要で続く」体験

### サブ機能：サブスク検出（40%）
- 定期課金の自動検出
- 解約忘れアラート
- 月額費用の一覧表示

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. Supabaseのセットアップ

1. [Supabase](https://supabase.com)でプロジェクトを作成
2. `supabase/schema.sql`のSQLを実行してデータベースを構築
3. Authentication > ProvidersでGoogleを有効化

### 3. Google APIの設定

1. [Google Cloud Console](https://console.cloud.google.com)でプロジェクトを作成
2. Gmail APIを有効化
3. OAuth 2.0クライアントIDを作成
   - 承認済みのリダイレクトURI: `http://localhost:3000/api/auth/callback`
4. スコープに`https://www.googleapis.com/auth/gmail.readonly`を追加

### 4. 環境変数の設定

`.env.local`ファイルを編集:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Google OAuth
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret

# Google Gmail API
GMAIL_CLIENT_ID=your_gmail_api_client_id
GMAIL_CLIENT_SECRET=your_gmail_api_client_secret

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開く

## 技術スタック

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth + Google OAuth
- **Email Integration**: Gmail API
- **Charts**: Recharts
- **Icons**: Lucide React

## プロジェクト構造

```
floww/
├── app/
│   ├── api/           # API endpoints
│   ├── components/    # React components
│   ├── dashboard/     # Dashboard page
│   ├── lib/          # Utility functions
│   ├── types/        # TypeScript types
│   ├── layout.tsx    # Root layout
│   └── page.tsx      # Home page
├── supabase/
│   └── schema.sql    # Database schema
└── public/           # Static assets
```

## 開発ロードマップ

- [x] 基本的なプロジェクトセットアップ
- [x] Supabaseデータベース設計
- [x] Gmail OAuth認証
- [x] メール取得・解析機能
- [x] 支出表示UI
- [x] サブスク検出機能
- [ ] カテゴリ自動分類の改善
- [ ] 支出グラフ・分析機能
- [ ] 予算設定・アラート機能
- [ ] モバイル対応

## ライセンス

MIT