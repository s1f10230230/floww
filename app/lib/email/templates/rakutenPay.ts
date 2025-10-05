import type { ParsedTx } from '@/app/lib/email/pipeline'

export function parseRakutenPay(subject: string, text: string): ParsedTx | null {
  if (!/楽天ペイアプリご利用内容確認メール|Rakuten\s*Pay/i.test(subject + text)) return null

  const mAmount = text.match(/(合計|支払|金額)[^0-9０-９,，]*([0-9０-９,，]+)\s*円/)
  const mDate = text.match(/(\d{4}[\/-]\d{1,2}[\/-]\d{1,2})(?:\s+(\d{1,2}:\d{2}))?/)
  const mMerch = text.match(/(ご利用先|利用先|店名|加盟店)[：:\s]*([^\n]+)/)

  if (!mAmount || !mDate) return null

  const amount = parseInt((mAmount[2] || '').replace(/[^0-9]/g, ''), 10)
  const date = (mDate[1] || '').replace(/\//g, '-')
  const time = mDate[2] ?? null
  const rawMerchant = (mMerch?.[2] || '楽天ペイ').trim()

  return {
    source: 'RakutenPay',
    messageId: '',
    date,
    time,
    amount,
    merchant: rawMerchant,
    rawMerchant,
    confidence: 0.8
  }
}

