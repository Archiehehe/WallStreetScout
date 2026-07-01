import type { Article, ArticleExtraction, PageType, RejectionCategory, Source } from '@/lib/storage/types'
import type { ExtractionResult } from '@/lib/ingestion/extractor'
import { getValidatedScreenableTickers, isScreenableEquityTicker } from '@/lib/utils/screenableTicker'
import { MEDIA_DOMAINS, MEDIA_SOURCE_PATTERNS } from '@/lib/safety/disallowedDomains'

export type FeedQualificationArticle = Pick<Article, 'title' | 'url'> & {
  cleanedText?: string
}

export type FeedQualificationExtraction = Pick<
  ArticleExtraction | ExtractionResult,
  'extractedTickers' | 'summary' | 'theme' | 'sector'
>

export interface FeedQualificationResult {
  qualified: boolean
  reason: string
  pageType: PageType
  screenableTickers: string[]
  rejectionCategory?: RejectionCategory
}

export const ELIGIBLE_FEED_PAGE_TYPES: PageType[] = [
  'institutional_research_idea',
  'market_outlook',
  'sector_or_theme_research',
  'stock_basket_research',
  'manager_commentary',
]

const TITLE_REJECT_RULES: Array<{ pattern: RegExp; pageType: PageType; rejectionCategory: RejectionCategory }> = [
  { pattern: /^(insights|insights\s*&\s*news|investment management insights\s*&\s*research|overheard at apollo)$/i, pageType: 'category_landing_page', rejectionCategory: 'rejected_category_landing_page' },
  { pattern: /\b(compare|comparison tool|calculator|screener|fund comparison)\b/i, pageType: 'tool_page', rejectionCategory: 'rejected_tool_page' },
  { pattern: /\b(etfs?\s+vs\.?\s+mutual funds?|etf basics|mutual funds?|funds?|smas?|commingled funds?|prospectus)\b/i, pageType: 'fund_or_etf_page', rejectionCategory: 'rejected_fund_or_etf_page' },
  { pattern: /\b(what is|how to|guide|learn|education|investing basics|glossary|retirement|account|fees|forms)\b/i, pageType: 'education_page', rejectionCategory: 'rejected_education_page' },
  { pattern: /\b(esg investing|responsible investing|sustainable investing overview)\b/i, pageType: 'generic_marketing_page', rejectionCategory: 'rejected_generic_marketing_page' },
  { pattern: /\b(product|solutions|strategies|institutional solutions|advisor resources|client resources)\b/i, pageType: 'product_page', rejectionCategory: 'rejected_product_page' },
]

const URL_REJECT_RULES: Array<{ pattern: RegExp; pageType: PageType; rejectionCategory: RejectionCategory }> = [
  { pattern: /\/(insights|insights-news|insights-news\/insights|insights-news\/insights\/overheard-at-apollo)\/?$/i, pageType: 'category_landing_page', rejectionCategory: 'rejected_category_landing_page' },
  { pattern: /\/(education|learn|how-to|investing-basics|glossary)(\/|$)/i, pageType: 'education_page', rejectionCategory: 'rejected_education_page' },
  { pattern: /\/(tools?|calculator|compare|comparison)(\/|$)/i, pageType: 'tool_page', rejectionCategory: 'rejected_tool_page' },
  { pattern: /\/(funds?|etfs?|mutual-funds)(\/|$)/i, pageType: 'fund_or_etf_page', rejectionCategory: 'rejected_fund_or_etf_page' },
  { pattern: /\/(products?|solutions|strategies|resources|advisor-resources|client-resources)(\/|$)/i, pageType: 'product_page', rejectionCategory: 'rejected_product_page' },
  { pattern: /\/(esg-investing)(\/|$)/i, pageType: 'generic_marketing_page', rejectionCategory: 'rejected_generic_marketing_page' },
]

const RESEARCH_QUALIFIER_PATTERN = /\b(outlook|market outlook|investment outlook|weekly market commentary|monthly market commentary|strategy|strategist|research|insights|investment views|asset allocation|sector outlook|theme|thematic|portfolio positioning|market update|macro update|equity strategy|credit outlook|private markets outlook|risk outlook|investment implications|where we see opportunity|opportunities|top themes|best ideas|conviction|stocks|companies|beneficiaries|benefit from|exposure to)\b/i

const PAGE_TYPE_RULES: Array<{ pageType: PageType; pattern: RegExp }> = [
  { pageType: 'stock_basket_research', pattern: /\b(top picks|best ideas|conviction|stock picks|focus list|model list|sector picks|favorite stocks|stocks to buy|beneficiaries|companies)\b/i },
  { pageType: 'market_outlook', pattern: /\b(market outlook|investment outlook|outlook|weekly market commentary|monthly market commentary|market update|macro update|asset allocation|portfolio positioning)\b/i },
  { pageType: 'sector_or_theme_research', pattern: /\b(sector outlook|theme|thematic|top themes|equity strategy|credit outlook|private markets outlook|risk outlook|exposure to|benefit from)\b/i },
  { pageType: 'manager_commentary', pattern: /\b(commentary|memo|letter|investment views|where we see opportunity|investment implications)\b/i },
  { pageType: 'institutional_research_idea', pattern: /\b(research|insights|strategy|strategist|opportunities|stocks|companies)\b/i },
]

export function qualifyArticleForFeed(
  article: FeedQualificationArticle,
  extraction: FeedQualificationExtraction | null | undefined,
  source?: Source | null,
): FeedQualificationResult {
  if (isMediaSource(source)) {
    return rejected('unknown', 'rejected_media_source_not_allowed', [])
  }

  const sourceClass = source?.sourceClass ?? 'primary_institutional'
  if (!['primary_institutional', 'public_institutional_research', 'manual'].includes(sourceClass)) {
    return rejected('unknown', 'rejected_media_source_not_allowed', [])
  }

  const hardReject = getHardReject(article)
  if (hardReject) {
    return rejected(hardReject.pageType, hardReject.rejectionCategory, getScreenableTickers(extraction, source, article))
  }

  const pageType = classifyPageType(article)
  const evidence = researchEvidenceText(article, extraction)
  if (!RESEARCH_QUALIFIER_PATTERN.test(evidence)) {
    return rejected(pageType, 'rejected_not_research_idea', getScreenableTickers(extraction, source, article))
  }

  if (!ELIGIBLE_FEED_PAGE_TYPES.includes(pageType)) {
    return rejected(pageType, rejectionForPageType(pageType), getScreenableTickers(extraction, source, article))
  }

  const screenableTickers = getScreenableTickers(extraction, source, article)
  if (screenableTickers.length < 3) {
    return rejected(pageType, 'rejected_fewer_than_3_screenable_tickers', screenableTickers)
  }

  return {
    qualified: true,
    reason: buildReason(pageType, screenableTickers.length, source),
    pageType,
    screenableTickers,
  }
}

export function classifyPageType(article: FeedQualificationArticle): PageType {
  const hardReject = getHardReject(article)
  if (hardReject) return hardReject.pageType

  const text = researchEvidenceText(article, null)
  for (const rule of PAGE_TYPE_RULES) {
    if (rule.pattern.test(text)) return rule.pageType
  }
  return 'unknown'
}

export function isMediaSource(source?: Source | null): boolean {
  if (!source) return false
  const name = source.name.toLowerCase()
  const domain = source.domain.toLowerCase()
  return (
    Array.from(MEDIA_DOMAINS).some((blocked) => domain === blocked || domain.endsWith(`.${blocked}`)) ||
    MEDIA_SOURCE_PATTERNS.some((blocked) => name.includes(blocked))
  )
}

export function getScreenableTickers(
  extraction: FeedQualificationExtraction | null | undefined,
  source?: Source | null,
  article?: FeedQualificationArticle,
): string[] {
  const evidenceText = researchEvidenceText(article ?? { title: '', url: '' }, extraction)
  return getValidatedScreenableTickers(extraction?.extractedTickers ?? [], evidenceText, source)
}

export { isScreenableEquityTicker }

function getHardReject(article: FeedQualificationArticle) {
  const title = article.title ?? ''
  const url = article.url ?? ''
  const path = safePath(url)

  for (const rule of TITLE_REJECT_RULES) {
    if (rule.pattern.test(title)) return rule
  }
  for (const rule of URL_REJECT_RULES) {
    if (rule.pattern.test(path)) return rule
  }
  return null
}

function researchEvidenceText(
  article: FeedQualificationArticle,
  extraction: FeedQualificationExtraction | null | undefined,
): string {
  return [
    article.title,
    article.url,
    extraction?.summary,
    article.cleanedText?.slice(0, 1200),
  ].filter(Boolean).join(' ')
}

function safePath(url: string): string {
  try {
    return new URL(url).pathname
  } catch {
    return url
  }
}

function rejectionForPageType(pageType: PageType): RejectionCategory {
  switch (pageType) {
    case 'education_page':
      return 'rejected_education_page'
    case 'product_page':
      return 'rejected_product_page'
    case 'tool_page':
      return 'rejected_tool_page'
    case 'fund_or_etf_page':
      return 'rejected_fund_or_etf_page'
    case 'category_landing_page':
      return 'rejected_category_landing_page'
    case 'generic_marketing_page':
      return 'rejected_generic_marketing_page'
    default:
      return 'rejected_not_research_idea'
  }
}

function rejected(
  pageType: PageType,
  rejectionCategory: RejectionCategory,
  screenableTickers: string[],
): FeedQualificationResult {
  return {
    qualified: false,
    reason: rejectionCategory,
    pageType,
    screenableTickers,
    rejectionCategory,
  }
}

function buildReason(pageType: PageType, tickerCount: number, source?: Source | null): string {
  const sourceName = source?.name?.replace(/\s+Insights$/i, '') ?? 'this source'
  if (pageType === 'market_outlook') {
    return `Market outlook from ${sourceName} with ${tickerCount} screenable equity names.`
  }

  const tier = source?.sourceTier ?? 'institutional'
  return `${tickerCount} screenable tickers extracted from a ${tier} institutional research source.`
}
