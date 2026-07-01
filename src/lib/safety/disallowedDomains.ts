export const MEDIA_DOMAINS = new Set([
  'cnbc.com',
  'benzinga.com',
  'seekingalpha.com',
  'finance.yahoo.com',
  'yahoo.com',
  'marketwatch.com',
  'reuters.com',
  'investing.com',
  'tipranks.com',
  'thefly.com',
  'stockanalysis.com',
  'marketbeat.com',
  'streetinsider.com',
  'gurufocus.com',
])

export const MEDIA_SOURCE_PATTERNS = [
  'cnbc',
  'benzinga',
  'seeking alpha',
  'seekingalpha',
  'yahoo finance',
  'marketwatch',
  'reuters',
  'investing.com',
  'tipranks',
  'the fly',
  'stockanalysis',
  'marketbeat',
  'streetinsider',
  'gurufocus',
]

export function isDisallowedMediaDomain(domain: string): boolean {
  const normalized = domain.toLowerCase()
  return Array.from(MEDIA_DOMAINS).some(
    (blocked) => normalized === blocked || normalized.endsWith(`.${blocked}`),
  )
}

export function isDisallowedMediaSource(name: string, domain: string): boolean {
  const text = `${name} ${domain}`.toLowerCase()
  return (
    isDisallowedMediaDomain(domain) ||
    MEDIA_SOURCE_PATTERNS.some((pattern) => text.includes(pattern))
  )
}
