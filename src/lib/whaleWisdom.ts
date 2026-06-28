export function buildWhaleWisdomManagerUrl(managerSlugOrUrl?: string): string {
  if (!managerSlugOrUrl) return 'https://whalewisdom.com/filers'
  if (/^https?:\/\//i.test(managerSlugOrUrl)) return managerSlugOrUrl
  return `https://whalewisdom.com/filer/${encodeURIComponent(managerSlugOrUrl)}`
}

export function buildWhaleWisdomTickerSearchUrl(ticker: string): string {
  return `https://whalewisdom.com/stock/${encodeURIComponent(ticker.toLowerCase())}`
}
