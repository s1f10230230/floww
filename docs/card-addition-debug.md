# カード追加のデバッグガイド

## 問題: カードが追加できない

### 考えられる原因

1. **データベーススキーマの問題**
   - `card_last4` が `NOT NULL` 制約のまま
   - `issuer_id` カラムが存在しない
   - RLSポリシーが正しく設定されていない

2. **フロントエンドの問題**
   - 空文字列 `""` をデータベースに送信している
   - バリデーションエラー

3. **認証の問題**
   - `user_id` が正しく取得できていない

---

## デバッグ手順

### ステップ1: ブラウザコンソールを確認

1. ブラウザでF12キーを押す
2. Consoleタブを開く
3. カード追加を試みる
4. エラーメッセージを確認

**期待されるログ:**
```
Attempting to add card: {issuer_id: "...", nickname: "..."}
Card added successfully
```

**エラー例:**
```
Card insertion error: {message: "null value in column 'card_last4' violates not-null constraint"}
```

---

### ステップ2: データベーススキーマを確認

Supabaseダッシュボードで以下のSQLを実行:

```sql
-- credit_cardsテーブルの構造を確認
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'credit_cards'
AND table_schema = 'public'
ORDER BY ordinal_position;
```

**期待される結果:**
| column_name | data_type | is_nullable | column_default |
|------------|-----------|-------------|----------------|
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | NO | - |
| card_last4 | character varying | **YES** | - |
| issuer_id | uuid | YES | - |
| nickname | text | YES | - |

**重要:** `card_last4` の `is_nullable` が **YES** であることを確認！

---

### ステップ3: マイグレーションを実行

データベーススキーマに問題がある場合:

```bash
# Supabase CLIを使用している場合
supabase migration up

# または、Supabaseダッシュボードで以下のSQLを実行:
```

`supabase/migrations/fix_credit_cards_schema.sql` の内容を実行してください。

---

### ステップ4: RLSポリシーを確認

Supabaseダッシュボードで確認:

```sql
-- RLSポリシーを確認
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'credit_cards';
```

**期待される結果:**
- `Users can view own cards` - SELECT
- `Users can insert own cards` - INSERT
- `Users can update own cards` - UPDATE
- `Users can delete own cards` - DELETE

---

### ステップ5: 手動テスト

Supabaseダッシュボードで直接テスト:

```sql
-- ユーザーIDを確認
SELECT id, email FROM auth.users LIMIT 1;

-- カード会社IDを確認
SELECT id, name FROM card_issuers LIMIT 5;

-- カードを手動で挿入（テスト）
INSERT INTO credit_cards (user_id, issuer_id, nickname)
VALUES (
    'YOUR_USER_ID',  -- 上記クエリで取得したユーザーID
    'ISSUER_ID',     -- 上記クエリで取得したカード会社ID
    'テストカード'
);

-- 挿入されたか確認
SELECT * FROM credit_cards WHERE user_id = 'YOUR_USER_ID';
```

---

## よくあるエラーと解決方法

### エラー1: `null value in column 'card_last4' violates not-null constraint`

**原因:** データベースで `card_last4` が `NOT NULL` のまま

**解決方法:**
```sql
ALTER TABLE public.credit_cards
ALTER COLUMN card_last4 DROP NOT NULL;
```

---

### エラー2: `column "issuer_id" of relation "credit_cards" does not exist`

**原因:** `issuer_id` カラムが存在しない

**解決方法:**
```sql
ALTER TABLE public.credit_cards
ADD COLUMN issuer_id UUID REFERENCES public.card_issuers(id);
```

---

### エラー3: `new row violates row-level security policy for table "credit_cards"`

**原因:** RLSポリシーが正しく設定されていない、または `user_id` が一致しない

**解決方法:**
1. RLSポリシーを確認
2. `auth.uid()` が正しく機能しているか確認
3. ログインし直す

```sql
-- RLSポリシーを再作成
DROP POLICY IF EXISTS "Users can insert own cards" ON public.credit_cards;
CREATE POLICY "Users can insert own cards" ON public.credit_cards
    FOR INSERT WITH CHECK (auth.uid() = user_id);
```

---

### エラー4: `duplicate key value violates unique constraint`

**原因:** 同じ `user_id` と `card_last4` の組み合わせが既に存在

**解決方法:**
1. 既存のカードを削除
2. 異なる `card_last4` を使用
3. `card_last4` を空にする（任意フィールドとして）

---

## テストケース

### テスト1: カード下4桁なしで追加

**入力:**
- カード会社: 楽天カード
- カード下4桁: （空）
- ニックネーム: （空）

**期待結果:** 成功

---

### テスト2: すべて入力して追加

**入力:**
- カード会社: 三井住友カード
- カード下4桁: 1234
- ニックネーム: メインカード

**期待結果:** 成功

---

### テスト3: 同じcard_last4で追加

**入力:**
- カード会社: JCBカード
- カード下4桁: 1234（既に登録済み）
- ニックネーム: サブカード

**期待結果:** エラー（重複）

---

## 完全修正チェックリスト

- [ ] マイグレーション実行完了
- [ ] `card_last4` が nullable になった
- [ ] `issuer_id` カラムが存在する
- [ ] `nickname` カラムが存在する
- [ ] RLSポリシーが正しく設定されている
- [ ] ブラウザコンソールでエラーがない
- [ ] カード追加が成功する
- [ ] カード一覧に表示される

---

## サポート情報

問題が解決しない場合、以下の情報を収集してください:

1. ブラウザコンソールのエラーメッセージ（スクリーンショット）
2. データベーススキーマの確認結果
3. RLSポリシーの確認結果
4. 実行したSQLコマンド

これらの情報があれば、より詳細なサポートが可能です。
