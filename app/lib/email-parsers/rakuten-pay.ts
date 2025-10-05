// Parser for Rakuten Pay app usage confirmation emails

import type { ParsedTransaction } from '@/app/lib/email-parser-v2'

function toHalfWidth(input: string): string {
  return input
    .replace(/[！-～]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
    .replace(/　/g, ' ')
}

export function isRakutenPayEmail(from: string, subject: string): boolean {
  const lowerFrom = (from || '').toLowerCase()
  const sub = subject || ''
  return (
    lowerFrom.includes('pay.rakuten.co.jp') ||
    (sub.includes('楽天ペイ') && sub.includes('ご利用内容確認メール'))
  )
}

export function parseRakutenPayEmail(
  from: string,
  subject: string,
  bodyText: string,
  bodyHtml: string
): ParsedTransaction | null {
  try {
    if (!isRakutenPayEmail(from, subject)) return null

    const text = toHalfWidth(bodyText || '')

    // Patterns: 固定ラベルの抽出
    const reDate = /ご利用日時\s*[:：]\s*(\d{4})[\/年]\s*(\d{1,2})[\/月]\s*(\d{1,2})日?\s*(\d{1,2}:\d{2})?/
    const reMerchant = /ご利用店舗\s*[:：]\s*([^\n\r]+)/
    const reTotal = /決済総額\s*[:：]\s*[￥¥]?\s*([\d,]+)\s*円/

    const mDate = text.match(reDate)
    const mMerchant = text.match(reMerchant)
    const mTotal = text.match(reTotal)

    if (!mTotal) return null

    const amount = parseInt(mTotal[1].replace(/[,]/g, ''), 10)
    if (!amount || amount <= 0) return null

    let date = new Date()
    if (mDate) {
      const y = parseInt(mDate[1])
      const mo = parseInt(mDate[2])
      const d = parseInt(mDate[3])
      date = new Date(y, mo - 1, d)
    }

    const merchant = (mMerchant?.[1] || '楽天ペイ').trim()

    return {
      merchant,
      amount,
      date,
      category: '電子決済'
    }
  } catch (e) {
    console.error('Error parsing Rakuten Pay email:', e)
    return null
  }
}
