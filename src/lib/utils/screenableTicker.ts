import type { Source } from '@/lib/storage/types'

const STOPLIST = new Set([
  'HICP', 'APP', 'PEPP', 'NLP', 'RAFT', 'IG', 'OAS', 'ABF', 'AAT',
  'ECB', 'CPI', 'GDP', 'PMI', 'QE', 'QT', 'FX', 'EM', 'DM', 'AI', 'ML', 'LLM',
  'ETF', 'ETFS', 'CEF', 'NAV', 'AUM', 'ESG', 'SMA', 'SMAS', 'BPS', 'YTD', 'TTM', 'MRQ',
  'NWC', 'PPE', 'ROIC', 'ROE', 'ROA', 'EBIT', 'EBITDA', 'FCF', 'CAPEX',
  'PE', 'VC', 'IRR', 'CAGR', 'YOY', 'QOQ',
  'FED', 'BOE', 'BOJ', 'BPS',
  'SEC', 'USD', 'EUR', 'JPY', 'GBP',
  'RSS', 'PDF', 'FAQ', 'CEO', 'CFO', 'COO', 'IPO', 'IR', 'PR', 'FY',
  'USA', 'US', 'UK', 'EU',
  'ADR', 'ADS', 'NYSE', 'NASDAQ', 'AMEX',
  'SPY', 'QQQ', 'DIA', 'IWM', 'VOO', 'VTI', 'VT', 'VEA', 'VWO',
  'BND', 'AGG', 'TLT', 'IEF', 'HYG', 'LQD',
  'GLD', 'SLV', 'USO', 'UNG', 'BITO', 'GBTC', 'IBIT',
  'ETH', 'BTC', 'SOL', 'USDC', 'USDT',
  'APAC', 'EMEA', 'ASIC', 'TNTC', 'NTSA', 'NTSI', 'EEA',
])

const SOURCE_OWN_TICKERS: Record<string, string[]> = {
  'goldmansachs.com': ['GS'],
  'morganstanley.com': ['MS'],
  'jpmorgan.com': ['JPM'],
  'privatebank.jpmorgan.com': ['JPM'],
  'ubs.com': ['UBS'],
  'privatebank.bankofamerica.com': ['BAC'],
  'bankofamerica.com': ['BAC'],
  'wellsfargo.com': ['WFC'],
  'blackrock.com': ['BLK'],
  'schwab.com': ['SCHW'],
  'troweprice.com': ['TROW'],
  'franklintempleton.com': ['BEN'],
  'invesco.com': ['IVZ'],
  'ssga.com': ['STT'],
  'apollo.com': ['APO', 'ATH', 'ARI', 'MFIC', 'EPF', 'AIM'],
  'kkr.com': ['KKR'],
  'aresmgmt.com': ['ARES'],
  'blueowl.com': ['OWL'],
  'carlyle.com': ['CG'],
  'brookfield.com': ['BAM', 'BN'],
  'northerntrust.com': ['NTRS'],
}

const EQUITY_CONTEXT = /\b(stock|stocks|share|shares|equity|equities|company|companies|ticker|tickers|holding|holdings|position|positions|name|names|buy|sell|owned|overweight|underweight|beneficiary|beneficiaries|exposure|portfolio|basket|constituent|constituents|top pick|best idea|conviction)\b/i
const EXCHANGE_CONTEXT = /\b(NYSE|Nasdaq|NASDAQ|AMEX|NYSEARCA|LSE|TSX|HKEX|TSE|ASX)\s*:/i
const BAD_CONTEXT = /\b(inflation|program|programme|spread|spreads|credit|index|indicator|model|language|central bank|ecb|policy|bond|bonds|yield|yields|rate|rates|purchase|purchases|facility|facilities|macro|gdp|cpi|hicp|pepp|quantitative|app purchases|natural language|raft|oass?|investment grade|ig credit)\b/i
const COMPANY_SUFFIX_CONTEXT = /\b(inc|corp|corporation|ltd|limited|plc|sa|nv|ag|group|holdings|technologies|semiconductor|systems|bank|energy|pharma|therapeutics|software|capital)\b/i

export function normalizeTicker(ticker: string): string {
  return ticker.trim().replace(/^\$/, '').toUpperCase()
}

export function isScreenableEquityTicker(
  ticker: string,
  options: { context?: string; source?: Source | null } = {},
): boolean {
  const normalized = normalizeTicker(ticker)
  if (!/^[A-Z][A-Z0-9.-]{0,4}$/.test(normalized)) return false
  if (STOPLIST.has(normalized)) return false

  const ownTickers = getSourceOwnTickers(options.source)
  if (ownTickers.has(normalized)) return false

  const context = options.context?.trim()
  if (!context) return true
  if (BAD_CONTEXT.test(context)) return false

  if (new RegExp(`\\$${escapeRegExp(normalized)}\\b`).test(context)) return true
  if (EXCHANGE_CONTEXT.test(context)) return true
  if (new RegExp(`\\b(?:NYSE|Nasdaq|NASDAQ|AMEX|NYSEARCA)\\s*:\\s*${escapeRegExp(normalized)}\\b`).test(context)) return true
  if (new RegExp(`\\([\\s$]*${escapeRegExp(normalized)}\\s*\\)`).test(context) && (EQUITY_CONTEXT.test(context) || COMPANY_SUFFIX_CONTEXT.test(context))) return true
  if (new RegExp(`\\b${escapeRegExp(normalized)}\\b`).test(context) && EQUITY_CONTEXT.test(context)) return true

  return false
}

export function getValidatedScreenableTickers(
  tickers: string[],
  text: string,
  source?: Source | null,
): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const rawTicker of tickers) {
    const ticker = normalizeTicker(rawTicker)
    if (seen.has(ticker)) continue
    const contexts = getTickerContexts(text, ticker)
    const hasContext = contexts.length === 0
      ? isScreenableEquityTicker(ticker, { source })
      : contexts.some((context) => isScreenableEquityTicker(ticker, { context, source }))
    if (!hasContext) continue

    seen.add(ticker)
    result.push(ticker)
  }

  return result
}

export function getTickerContexts(text: string, ticker: string): string[] {
  const normalized = normalizeTicker(ticker)
  if (!text) return []

  const contexts: string[] = []
  const pattern = new RegExp(`(?:\\$${escapeRegExp(normalized)}\\b|\\b${escapeRegExp(normalized)}\\b)`, 'g')
  let match: RegExpExecArray | null
  while ((match = pattern.exec(text)) !== null) {
    const start = Math.max(0, match.index - 120)
    const end = Math.min(text.length, match.index + match[0].length + 120)
    contexts.push(text.slice(start, end))
    if (contexts.length >= 8) break
  }

  return contexts
}

export function screenableTickerStoplist(): string[] {
  return Array.from(STOPLIST).sort()
}

function getSourceOwnTickers(source?: Source | null): Set<string> {
  const domain = source?.domain?.toLowerCase()
  return new Set(domain ? SOURCE_OWN_TICKERS[domain] ?? [] : [])
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
