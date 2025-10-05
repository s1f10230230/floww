import normalizerDict from '@/app/data/merchant-normalizer.json'

export function normalizeText(input: string): string {
  try {
    return input
      .normalize('NFKC')
      .replace(/\r\n/g, '\n')
      .replace(/\t/g, ' ')
      .replace(/[\u00A0]/g, ' ')
      .replace(/[　]+/g, ' ')
      .replace(/\s+\n/g, '\n')
  } catch {
    return input
  }
}

export function normalizeMerchant(raw: string): string {
  const s = (raw || '').normalize('NFKC').trim()
  const dict: any = normalizerDict || {}

  if (dict.exact && dict.exact[s]) return dict.exact[s]

  if (dict.prefix) {
    for (const k of Object.keys(dict.prefix)) {
      if (s.startsWith(k)) return s.replace(k, dict.prefix[k]).trim()
    }
  }

  if (dict.contains) {
    for (const k of Object.keys(dict.contains)) {
      if (s.includes(k)) return s.replace(k, dict.contains[k]).trim()
    }
  }

  return s
}

