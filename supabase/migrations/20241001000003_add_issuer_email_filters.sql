-- Add advanced email filter fields to card_issuers
ALTER TABLE public.card_issuers
  ADD COLUMN IF NOT EXISTS include_from_domains TEXT[],
  ADD COLUMN IF NOT EXISTS exclude_from_domains TEXT[],
  ADD COLUMN IF NOT EXISTS include_subject_keywords TEXT[],
  ADD COLUMN IF NOT EXISTS exclude_subject_keywords TEXT[];

-- Seed Rakuten Card filters
UPDATE public.card_issuers
SET
  include_from_domains = ARRAY['mail.rakuten-card.co.jp','pay.rakuten.co.jp'],
  include_subject_keywords = ARRAY[
    'カード利用のお知らせ',
    '速報版',
    'ご請求',
    'ご請求金額',
    'ご請求予定',
    'ご利用内容確認メール'
  ],
  exclude_subject_keywords = ARRAY[
    'キャンペーン','アンケート','通信','ニュース','ポイント進呈','プレゼント','抽選',
    '特別価格','クーポン','エントリー','リーベイツ','カードニュース'
  ]
WHERE name = '楽天カード';

-- Seed JCB filters
UPDATE public.card_issuers
SET
  include_from_domains = ARRAY['qa.jcb.co.jp'],
  exclude_from_domains = ARRAY['cj.jcb.co.jp'],
  include_subject_keywords = ARRAY[
    'ご利用',
    'ショッピングご利用',
    'ショッピングご利用のお知らせ',
    'カードご利用通知',
    'ご請求',
    '利用のお知らせ'
  ],
  exclude_subject_keywords = ARRAY[
    'Spot Mail','キャンペーン','ご案内','ポイント','クーポン','おトク','特別価格'
  ]
WHERE name = 'JCBカード';
