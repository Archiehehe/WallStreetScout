import { detectFirm } from '@/lib/utils/firmDetection'
import { extractTickers, extractCompanyNames } from '@/lib/utils/tickerExtraction'
import { classifyTheme, classifySector, classifyRegion } from '@/lib/utils/themeClassification'

const BASKET_KEYWORDS = [
  'top picks', 'stock picks', 'conviction list', 'basket', 'screen',
  'overweight', 'outperform', 'initiates coverage', 'starts coverage',
  'names top stocks', 'favorite stocks', 'high-conviction', 'upside',
  'price target', 'sector picks', 'best ideas', 'stocks to buy',
  'top stock', 'favorite picks', 'conviction buy',
]

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Stock Basket': ['basket', 'top picks', 'favorite stocks', 'best ideas', 'conviction list'],
  'Coverage Initiation': ['initiates coverage', 'starts coverage', 'initiation'],
  'Rating Change': ['upgrade', 'downgrade', 'upgraded', 'downgraded'],
  'Sector Outlook': ['sector outlook', 'sector call', 'industry outlook'],
  'Earnings Preview': ['earnings preview', 'quarterly preview', 'earnings season'],
  'Thematic': ['theme', 'megatrend', 'secular', 'structural'],
  'Single Stock': ['initiates', 'upgrades', 'downgrades'],
}

export interface ExtractionResult {
  firm?: string
  sourceType: string
  category?: string
  theme?: string
  sector?: string
  region?: string
  summary?: string
  reasonShown?: string
  extractedTickers: string[]
  extractedCompanies: string[]
  scoreBreakdown: Record<string, number>
  confidence: number
  hasBasketLanguage: boolean
}

export function extractFromArticle(
  title: string,
  text: string,
  sourceType: string,
): ExtractionResult {
  const combined = `${title} ${text}`
  const lower = combined.toLowerCase()

  const firm = detectFirm(combined)
  const tickers = extractTickers(combined)
  const companies = extractCompanyNames(combined)
  const theme = classifyTheme(combined)
  const sector = classifySector(combined)
  const region = classifyRegion(combined)

  const hasBasketLanguage = BASKET_KEYWORDS.some(kw => lower.includes(kw))

  let category: string | undefined
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      category = cat
      break
    }
  }

  const scoreBreakdown: Record<string, number> = {}
  const extractedSet = new Set([...tickers, ...companies.map(c => c.slice(0, 5).toUpperCase())])

  // Scoring
  if (tickers.length >= 3 || companies.length >= 3) {
    scoreBreakdown['3+ tickers/companies'] = 5
  }
  if (hasBasketLanguage) {
    scoreBreakdown['Basket language detected'] = 4
  }
  if (firm) {
    scoreBreakdown['Known institution detected'] = 3
  }
  if (sourceType === 'primary') {
    scoreBreakdown['Primary source'] = 3
  }
  if (sector !== 'Unknown' && region !== 'Unknown') {
    scoreBreakdown['Sector and region detected'] = 2
  }
  if (['China', 'India', 'Brazil', 'EM'].includes(region)) {
    scoreBreakdown['EM/country angle'] = 2
  }
  if (extractedSet.size >= 5) {
    scoreBreakdown['5+ stocks detected'] = 2
  }
  if (/price target|upside|rating|initiation/.test(lower)) {
    scoreBreakdown['Price targets/ratings mentioned'] = 2
  }

  // Check for paywall indicator
  const isPaywalled = /paywall|subscriber only|premium article/i.test(text)
  if (isPaywalled && tickers.length === 0) {
    scoreBreakdown['Paywalled with no data'] = -4
  }

  // Generic macro penalization
  const genericMacro = /gdp|inflation|interest rate|central bank|monetary policy|economic outlook/.test(lower)
  if (genericMacro && tickers.length === 0) {
    scoreBreakdown['Generic macro with no stocks'] = -6
  }

  // Low quality checks
  const lowQuality = /sponsored|advertisement|promoted|partner content/i.test(lower)
  if (lowQuality) {
    scoreBreakdown['Low quality/sponsored'] = -8
  }

  const totalScore = Object.values(scoreBreakdown).reduce((sum, v) => sum + v, 0)

  const reasons: string[] = []
  if (firm) reasons.push(`Published by ${firm}`)
  if (tickers.length >= 3) reasons.push(`Extracted ${tickers.length} tickers`)
  if (hasBasketLanguage) reasons.push('Contains basket/stock pick language')
  if (theme !== 'General') reasons.push(`Theme: ${theme}`)
  if (sector !== 'Unknown') reasons.push(`Sector: ${sector}`)
  if (region !== 'Unknown') reasons.push(`Region: ${region}`)

  const confidence = Math.min(100, Math.max(0, (totalScore / 20) * 100))

  return {
    firm,
    sourceType,
    category,
    theme: theme === 'General' ? undefined : theme,
    sector: sector === 'Unknown' ? undefined : sector,
    region: region === 'Unknown' ? undefined : region,
    extractedTickers: Array.from(new Set(tickers)),
    extractedCompanies: Array.from(new Set(companies)),
    scoreBreakdown,
    confidence,
    hasBasketLanguage,
    reasonShown: reasons.join('; ') || undefined,
  }
}
