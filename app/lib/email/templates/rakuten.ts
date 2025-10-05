import type { ParsedTx } from '@/app/lib/email/pipeline'

const reHeader = /(カード利用お知らせメール|楽天カード株式会社)/
const reAmount = /(ご利用金額|利用金額|ご請求金額)[^0-9０-９,，]*([0-9０-９,，]+)\s*円/
const reMerchant = /(ご利用先|ご利用店名|利用先|加盟店)[：:\s]*([^\n]+)/
const reDate = /(ご利用日(時)?|利用日時|取引日)[：:\s]*(\d{4}[\/-]\d{1,2}[\/-]\d{1,2})(?:\s+(\d{1,2}:\d{2}))?/

export function parseRakuten(subject: string, text: string): ParsedTx | null {
  if (!/楽天カード|Rakuten|カード利用お知らせメール|速報版/.test(subject + text)) return null
  if (!reHeader.test(text)) return null

  let mAmount = text.match(reAmount)
  let mDate = text.match(reDate)

  // Try alternative format for 速報版
  const isSpeedVersion = /速報版/.test(subject + text)
  if (isSpeedVersion) {
    // ■利用日: 2025/08/26
    const reSpeedDate = /■\s*利用日[：:\s]*(\d{4}[\/-]\d{1,2}[\/-]\d{1,2})/
    const speedDateMatch = text.match(reSpeedDate)
    if (speedDateMatch) {
      mDate = [speedDateMatch[0], '', '', speedDateMatch[1]]
    }

    // ■利用金額: 1,000 円 or just after date like "2025/09/27 本人 1000 円"
    const reSpeedAmount = /■\s*利用金額[：:\s]*([0-9０-９,，]+)\s*円/
    const speedAmountMatch = text.match(reSpeedAmount)
    if (speedAmountMatch) {
      mAmount = [speedAmountMatch[0], '利用金額', speedAmountMatch[1]]
    } else {
      // Fallback: find amount after "本人" keyword
      const reAmountAfterUser = /本人\s+([0-9０-９,，]+)\s*円/
      const amountAfterUserMatch = text.match(reAmountAfterUser)
      if (amountAfterUserMatch) {
        mAmount = [amountAfterUserMatch[0], '', amountAfterUserMatch[1]]
      }
    }
  }

  const mMerch = text.match(reMerchant)

  if (!mAmount || !mDate) return null

  const amount = parseInt((mAmount[2] || mAmount[1] || '').replace(/[^0-9]/g, ''), 10)
  const date = (mDate[3] || '').replace(/\//g, '-')
  const time = mDate[4] ?? null
  const rawMerchant = (mMerch?.[2] || '不明').trim()

  return {
    source: 'Rakuten',
    messageId: '',
    date,
    time,
    amount,
    merchant: rawMerchant,
    rawMerchant,
    confidence: 0.88 - (rawMerchant === '不明' ? 0.1 : 0)
  }
}

