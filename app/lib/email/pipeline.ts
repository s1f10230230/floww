import { normalizeText, normalizeMerchant } from '@/app/lib/email/normalizer'
import { parseJCB } from '@/app/lib/email/templates/jcb'
import { parseRakuten } from '@/app/lib/email/templates/rakuten'
import { parseRakutenPay } from '@/app/lib/email/templates/rakutenPay'
import { scoreSubscriptions } from '@/app/lib/email/subscription'

export type RawMail = {
  id: string
  subject?: string | null
  text?: string | null
  html?: string | null
  internalDate?: number | null
}

export type ParsedTx = {
  source: 'JCB' | 'Rakuten' | 'RakutenPay' | 'Unknown'
  messageId: string
  date: string
  time?: string | null
  amount: number
  merchant: string
  rawMerchant?: string
  note?: string
  isOverseas?: boolean
  confidence: number
  prelimSubscription?: boolean
}

export type PipelineOptions = {
  allowFuzzy?: boolean
}

export async function parseMails(mails: RawMail[], opts: PipelineOptions = {}): Promise<ParsedTx[]> {
  const out: ParsedTx[] = []

  for (const m of mails) {
    const baseText = pickBestText(m)
    if (!baseText) continue

    const text = normalizeText(baseText)
    const subject = (m.subject || '').normalize('NFKC')

    // Template-first
    const byJcb = parseJCB(subject, text)
    if (byJcb) { out.push(finalize(byJcb, m)); continue }

    const byRakuten = parseRakuten(subject, text)
    if (byRakuten) { out.push(finalize(byRakuten, m)); continue }

    const byRPay = parseRakutenPay(subject, text)
    if (byRPay) { out.push(finalize(byRPay, m)); continue }

    if (opts.allowFuzzy) {
      const fuzzy = fuzzyExtract(subject, text)
      if (fuzzy) { out.push(finalize(fuzzy, m)); continue }
    }
  }

  return scoreSubscriptions(out)
}

function pickBestText(m: RawMail): string | null {
  if (m.text && m.text.trim().length > 0) return m.text
  if (!m.html) return null
  return m.html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+\n/g, '\n')
    .trim()
}

function fuzzyExtract(subject: string, text: string): ParsedTx | null {
  const dateMatch = text.match(/(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/)
  const amtMatch = text.match(/([0-9０-９,，]+)\s*円/)
  const merchMatch = text.match(/(ご利用先|利用先|加盟店|店名)[：:\s]*([^\n]+)/)

  if (!dateMatch || !amtMatch) return null

  const amount = parseInt((amtMatch[1] || '').replace(/[^0-9]/g, ''), 10)
  const date = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`
  const rawMerchant = (merchMatch?.[2] || subject || '不明').trim()
  const merchant = normalizeMerchant(rawMerchant)

  if (!amount || amount <= 0) return null

  return {
    source: 'Unknown',
    messageId: '',
    date,
    amount,
    merchant,
    rawMerchant,
    confidence: 0.55
  }
}

function finalize(p: ParsedTx, m: RawMail): ParsedTx {
  const merchant = normalizeMerchant(p.merchant || p.rawMerchant || '不明')
  return { ...p, messageId: m.id, merchant }
}

