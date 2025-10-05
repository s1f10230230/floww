import type { ParsedTx } from '@/app/lib/email/pipeline'

const reAmount = /(ご利用金額|請求金額|ご請求金額)[^0-9０-９,，]*([0-9０-９,，]+)\s*円/
const reMerchant = /(ご利用先|ご利用店名|利用先)[：:\s]*([^\n]+)/
const reDate = /(ご利用日(時)?|利用日時|取引日)[：:\s]*(\d{4}[\/-]\d{1,2}[\/-]\d{1,2})(?:\s+(\d{1,2}:\d{2}))?/

export function parseJCB(subject: string, text: string): ParsedTx | null {
  if (!/JCB|ご利用(の)?お知らせ|ショッピングご利用/i.test(subject + text)) return null

  const mAmount = text.match(reAmount)
  const mDate = text.match(reDate)
  const overseasFlag = /海外利用分/.test(text)
  const mMerch = text.match(reMerchant)
  const rawMerchant = (mMerch?.[2]?.trim() || (overseasFlag ? 'JCB 海外利用分' : '不明'))

  if (!mAmount || !mDate) return null

  const amount = parseInt((mAmount[2] || '').replace(/[^0-9]/g, ''), 10)
  const date = (mDate[3] || '').replace(/\//g, '-')
  const time = mDate[4] ?? null

  const prelimSubscription = overseasFlag && amount >= 2000 && amount <= 4000
  const confidence = 0.9 - (rawMerchant === '不明' ? 0.1 : 0)

  return {
    source: 'JCB',
    messageId: '',
    date,
    time,
    amount,
    merchant: rawMerchant,
    rawMerchant,
    isOverseas: overseasFlag,
    confidence,
    prelimSubscription
  }
}

