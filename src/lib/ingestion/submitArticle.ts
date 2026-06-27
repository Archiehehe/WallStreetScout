import { getStore } from '@/lib/storage'
import type { ArticleExtraction, Source } from '@/lib/storage/types'
import { fetchArticleHtml } from './fetcher'
import { parseArticleHtml } from './parser'
import { extractFromArticle } from './extractor'
import { DEFAULT_THRESHOLD } from './scorer'
import { generateDuplicateKey } from './dedupe'
import { domainFromUrl, safeNormalizeUrl, uniqueTickers } from './url'

export type ArticleSubmitResult =
  | {
      saved: true
      articleId: string
      score: number
      extractedTickers: string[]
      extractedCompanies: string[]
      reasonShown?: string
    }
  | {
      saved: false
      duplicate: true
      articleId: string
      message: string
    }
  | {
      saved: false
      score: number
      threshold: number
      reason: string
      scoreBreakdown: Record<string, number>
      extractedTickers: string[]
      extractedCompanies: string[]
    }

interface SubmitArticleOptions {
  source?: Source
  sourceId?: string
  fetchedTitle?: string
  fetchedPublishedAt?: string
  threshold?: number
}

export class ArticleSubmitError extends Error {
  constructor(
    message: string,
    public status = 400,
    public code = 'article_submit_error',
  ) {
    super(message)
    this.name = 'ArticleSubmitError'
  }
}

export async function submitArticleUrl(
  inputUrl: string,
  options: SubmitArticleOptions = {},
): Promise<ArticleSubmitResult> {
  const normalizedUrl = safeNormalizeUrl(inputUrl)
  if (!normalizedUrl) {
    throw new ArticleSubmitError('Invalid URL.', 400, 'invalid_url')
  }

  const store = getStore()
  const existing = await store.getArticleByUrl(normalizedUrl)
  if (existing) {
    return {
      saved: false,
      duplicate: true,
      articleId: existing.id,
      message: 'This article already exists.',
    }
  }

  let html: string
  try {
    html = await fetchArticleHtml(normalizedUrl)
  } catch (error) {
    throw new ArticleSubmitError(
      error instanceof Error ? error.message : 'Fetch failed.',
      502,
      'fetch_failed',
    )
  }

  let parsed
  try {
    parsed = parseArticleHtml(html, normalizedUrl)
  } catch {
    throw new ArticleSubmitError('Could not parse article.', 422, 'parse_failed')
  }

  const canonicalUrl = parsed.canonicalUrl ? safeNormalizeUrl(parsed.canonicalUrl) : undefined
  if (canonicalUrl) {
    const existingCanonical = await store.getArticleByUrl(canonicalUrl)
    if (existingCanonical) {
      return {
        saved: false,
        duplicate: true,
        articleId: existingCanonical.id,
        message: 'This article already exists.',
      }
    }
  }

  const title = parsed.title.trim() || options.fetchedTitle?.trim()
  const cleanedText = parsed.cleanedText.trim()
  if (!title || cleanedText.length < 200) {
    throw new ArticleSubmitError('No article text could be extracted.', 422, 'no_article_text')
  }

  const source = await resolveSource(normalizedUrl, options)
  const extraction = extractFromArticle(title, cleanedText, source.sourceType)
  const score = Object.values(extraction.scoreBreakdown).reduce((sum, value) => sum + value, 0)
  const threshold = options.threshold ?? DEFAULT_THRESHOLD
  const extractedTickers = uniqueTickers(extraction.extractedTickers)

  if (score < threshold) {
    return {
      saved: false,
      score,
      threshold,
      reason: lowScoreReason(extraction),
      scoreBreakdown: extraction.scoreBreakdown,
      extractedTickers,
      extractedCompanies: extraction.extractedCompanies,
    }
  }

  const duplicateKey = generateDuplicateKey(canonicalUrl ?? normalizedUrl, title)
  const existingDuplicate = await store.getArticleByDuplicateKey(duplicateKey)
  if (existingDuplicate) {
    return {
      saved: false,
      duplicate: true,
      articleId: existingDuplicate.id,
      message: 'This article already exists.',
    }
  }

  const fetchedAt = new Date().toISOString()
  const publishedAt = normalizeDate(parsed.publishedAt) ?? normalizeDate(options.fetchedPublishedAt) ?? fetchedAt

  const article = await store.createArticle({
    sourceId: source.id,
    url: normalizedUrl,
    canonicalUrl: canonicalUrl ?? undefined,
    title,
    author: parsed.author,
    publishedAt,
    fetchedAt,
    rawText: html.slice(0, 50000),
    cleanedText,
    paywallStatus: parsed.paywallStatus,
    duplicateKey,
    articleScore: score,
    status: 'saved',
  })

  const savedExtraction: Omit<ArticleExtraction, 'id' | 'createdAt'> = {
    articleId: article.id,
    firm: extraction.firm,
    sourceType: extraction.sourceType,
    category: extraction.category,
    theme: extraction.theme,
    sector: extraction.sector,
    region: extraction.region,
    summary: cleanedText.slice(0, 500),
    reasonShown: extraction.reasonShown,
    extractedTickers,
    extractedCompanies: extraction.extractedCompanies,
    scoreBreakdown: extraction.scoreBreakdown,
    confidence: extraction.confidence,
  }

  await store.createExtraction(savedExtraction)

  for (const ticker of extractedTickers) {
    await store.createIdea({
      articleId: article.id,
      ticker,
      sector: extraction.sector,
      theme: extraction.theme,
      confidence: extraction.confidence,
      isInWatchlist: false,
      isInPortfolio: false,
    })
  }

  return {
    saved: true,
    articleId: article.id,
    score,
    extractedTickers,
    extractedCompanies: extraction.extractedCompanies,
    reasonShown: extraction.reasonShown,
  }
}

async function resolveSource(
  normalizedUrl: string,
  options: SubmitArticleOptions,
): Promise<Source> {
  const store = getStore()
  if (options.source) return options.source
  if (options.sourceId) {
    const source = await store.getSource(options.sourceId)
    if (!source) throw new ArticleSubmitError('Source not found.', 404, 'source_not_found')
    return source
  }

  const domain = domainFromUrl(normalizedUrl)
  const existing = await store.getSourceByDomain(domain)
  if (existing) return existing

  try {
    return await store.createSource({
      name: domain,
      domain,
      sourceType: 'manual',
      parserType: 'generic',
      enabled: true,
      qualityScore: 5,
      notes: 'Created from manual URL submission.',
    })
  } catch {
    const createdByRace = await store.getSourceByDomain(domain)
    if (createdByRace) return createdByRace
    throw new ArticleSubmitError('Could not create source for submitted URL.', 500, 'source_create_failed')
  }
}

function lowScoreReason(extraction: ReturnType<typeof extractFromArticle>): string {
  if (!extraction.firm && extraction.extractedTickers.length === 0) {
    return 'No institutional firm or tickers detected.'
  }
  if (!extraction.hasBasketLanguage) {
    return 'No basket, stock-pick, or rating-change language detected.'
  }
  return 'Article did not meet the feed threshold.'
}

function normalizeDate(value?: string): string | undefined {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toISOString()
}
