# Supabaseセットアップ手順

## 1. Supabaseプロジェクトの作成

1. [Supabase Dashboard](https://supabase.com/dashboard)にアクセス
2. 「New Project」をクリック
3. プロジェクト情報を入力：
   - Project name: `floww`
   - Database Password: 強力なパスワードを設定
   - Region: `Northeast Asia (Tokyo)`を選択

## 2. データベースのセットアップ

Supabase DashboardのSQL Editorで以下のSQLを実行：

```sql
-- supabase/schema.sqlの内容をコピー＆ペースト
```

## 3. 認証設定

1. Authentication > Providers > Googleを有効化
2. Google Cloud Consoleで取得した認証情報を設定：
   - Client ID
   - Client Secret
3. Redirect URLsに追加：
   - `http://localhost:3000/api/auth/callback`
   - 本番環境のURL（デプロイ後）

## 4. 環境変数の取得

Project Settings > APIから以下をコピー：

- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role** → `SUPABASE_SERVICE_ROLE_KEY`

## 5. `.env.local`の設定

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 6. 動作確認

```bash
npm run dev
```

http://localhost:3000 にアクセスして、Googleログインが動作することを確認。