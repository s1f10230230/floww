import type { ParsedTx } from '@/app/lib/email/pipeline'

const ABS_YEN = 500
const REL = 0.2

export function scoreSubscriptions(items: ParsedTx[]): ParsedTx[] {
  const byMerchant = new Map<string, ParsedTx[]>()
  for (const it of items) {
    const key = it.isOverseas ? 'OVERSEAS_CLUSTER' : (it.merchant || 'UNKNOWN')
    if (!byMerchant.has(key)) byMerchant.set(key, [])
    byMerchant.get(key)!.push(it)
  }

  for (const [m, arr] of byMerchant.entries()) {
    const amounts = arr.map(a => a.amount).sort((a, b) => a - b)
    if (amounts.length < 2) continue
    const avg = amounts.reduce((s, n) => s + n, 0) / amounts.length
    const sd = Math.sqrt(amounts.reduce((s, n) => s + Math.pow(n - avg, 2), 0) / amounts.length)
    const th = Math.max(ABS_YEN, avg * REL)
    const stable = sd <= th
    if (stable) {
      for (const it of arr) {
        it.prelimSubscription = true
        if (it.isOverseas) it.confidence = Math.min(1, (it.confidence || 0.8) + 0.05)
      }
    }
  }
  return items
}

