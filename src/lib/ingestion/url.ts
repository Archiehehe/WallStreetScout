const TRACKING_PARAMS = new Set([
  'fbclid',
  'gclid',
  'mc_cid',
  'mc_eid',
  'igshid',
])

export function normalizeUrl(input: string): string {
  const parsed = new URL(input.trim())
  parsed.hash = ''
  parsed.protocol = parsed.protocol.toLowerCase()
  parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, '')

  if (
    (parsed.protocol === 'https:' && parsed.port === '443') ||
    (parsed.protocol === 'http:' && parsed.port === '80')
  ) {
    parsed.port = ''
  }

  for (const key of [...parsed.searchParams.keys()]) {
    if (key.toLowerCase().startsWith('utm_') || TRACKING_PARAMS.has(key.toLowerCase())) {
      parsed.searchParams.delete(key)
    }
  }

  const sorted = [...parsed.searchParams.entries()].sort(([a], [b]) => a.localeCompare(b))
  parsed.search = ''
  for (const [key, value] of sorted) parsed.searchParams.append(key, value)

  if (parsed.pathname.length > 1) {
    parsed.pathname = parsed.pathname.replace(/\/+$/, '')
  }

  return parsed.toString()
}

export function safeNormalizeUrl(input: string): string | null {
  try {
    const normalized = normalizeUrl(input)
    const protocol = new URL(normalized).protocol
    if (protocol !== 'https:' && protocol !== 'http:') return null
    return normalized
  } catch {
    return null
  }
}

export function domainFromUrl(input: string): string {
  return new URL(input).hostname.toLowerCase().replace(/^www\./, '')
}

export function normalizeTicker(ticker: string): string {
  return ticker.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, '')
}

export function uniqueTickers(tickers: string[]): string[] {
  return [...new Set(tickers.map(normalizeTicker).filter(Boolean))]
}
