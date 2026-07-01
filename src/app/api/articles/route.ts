import { NextRequest } from 'next/server'
import { getStore } from '@/lib/storage'
import { DEFAULT_THRESHOLD } from '@/lib/ingestion/scorer'
import { ArticleSubmitError, submitArticleUrl } from '@/lib/ingestion/submitArticle'
import { errorResponse, handleApiError } from '@/lib/api/responses'
import { qualifyArticleForFeed, scoreFeedArticle } from '@/lib/feedQualification'
import { parserExistsForKey } from '@/lib/sourceParsers'

type FeedWindow = '7d' | '30d' | '90d' | 'all'

export async function GET(request: NextRequest) {
  try {
    const store = getStore()
    const { searchParams } = request.nextUrl
    const search = searchParams.get('search')?.toLowerCase()
    const firm = searchParams.get('firm')
    const sector = searchParams.get('sector')
    const sourceType = searchParams.get('sourceType')
    const sourceTier = searchParams.get('sourceTier')
    const sourceFilter = searchParams.get('source')
    const tickerFilter = searchParams.get('ticker')?.toUpperCase()
    const pageTypeFilter = searchParams.get('pageType')
    const saved = searchParams.get('saved')
    const sort = searchParams.get('sort') ?? 'feed_score'
    const { window, from, to } = parseWindow(searchParams)

    const articles = await store.getArticles({
      minScore: DEFAULT_THRESHOLD,
      status: 'saved',
      from,
      to,
      limit: 500,
    })
    const baskets = await store.getBaskets()
    const savedArticleIds = new Set(baskets.map((basket) => basket.articleId).filter(Boolean))

    const result = []
    for (const article of articles) {
      const extraction = await store.getExtraction(article.id)
      const source = await store.getSource(article.sourceId)
      const articleSourceType = extraction?.sourceType ?? source?.sourceType ?? 'unknown'
      const articleFirm = extraction?.primaryInstitution ?? extraction?.sourceInstitution ?? source?.name ?? extraction?.firm
      const isSaved = savedArticleIds.has(article.id)
      const qualification = qualifyArticleForFeed(article, extraction, source)
      if (!qualification.qualified) continue

      const tickers = qualification.screenableTickers

      if (firm && articleFirm !== firm) continue
      if (sector && extraction?.sector !== sector) continue
      if (sourceType && articleSourceType !== sourceType) continue
      if (sourceTier && (source?.sourceTier ?? 'secondary') !== sourceTier) continue
      if (sourceFilter && source?.name !== sourceFilter && source?.domain !== sourceFilter) continue
      if (tickerFilter && !tickers.includes(tickerFilter)) continue
      if (pageTypeFilter && qualification.pageType !== pageTypeFilter) continue
      if (saved === 'true' && !isSaved) continue
      if (saved === 'false' && isSaved) continue
      if (search) {
        const haystack = [
          article.title,
          extraction?.reasonShown,
          articleFirm,
          extraction?.mentionedInstitutions?.join(' '),
          extraction?.theme,
          extraction?.sector,
          extraction?.region,
          qualification.pageType,
          ...tickers,
        ].filter(Boolean).join(' ').toLowerCase()
        if (!haystack.includes(search)) continue
      }

      const feedScore = scoreFeedArticle({
        hasDedicatedParser: parserExistsForKey(source?.parserKey),
        pageType: qualification.pageType,
        tickerCount: tickers.length,
        title: article.title,
        publishedAt: article.publishedAt,
        hasBasketLanguage: /\b(top picks|best ideas|conviction|focus list|stock picks|favorite stocks|beneficiaries)\b/i.test([article.title, extraction?.summary ?? ''].join(' ')),
        extractionSummary: extraction?.summary,
        cleanedText: article.cleanedText,
      })

      result.push({
        id: article.id,
        title: article.title,
        url: article.url,
        sourceName: source?.name ?? 'Unknown',
        sourceType: articleSourceType,
        sourceClass: source?.sourceClass ?? 'primary_institutional',
        sourceTier: source?.sourceTier ?? 'secondary',
        firm: articleFirm,
        publishedAt: article.publishedAt,
        theme: extraction?.theme,
        sector: extraction?.sector,
        region: extraction?.region,
        pageType: qualification.pageType,
        tickers,
        score: article.articleScore,
        feedScore: feedScore.score,
        feedScoreBreakdown: feedScore.breakdown,
        reasonShown: qualification.reason,
        saved: isSaved,
      })
    }

    result.sort((a, b) => {
      if (sort === 'highest_score') return (b.feedScore ?? b.score) - (a.feedScore ?? a.score)
      if (sort === 'feed_score') return (b.feedScore ?? 0) - (a.feedScore ?? 0)
      if (sort === 'most_tickers') return b.tickers.length - a.tickers.length
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    })

    return Response.json({ window, articles: result, count: result.length })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()
    if (!url || typeof url !== 'string') {
      return errorResponse('URL required.', 400)
    }

    const result = await submitArticleUrl(url)
    if (result.saved) return Response.json(result, { status: 201 })
    if ('duplicate' in result && result.duplicate) return Response.json(result)
    return Response.json(result, { status: 422 })
  } catch (error) {
    if (error instanceof ArticleSubmitError) {
      return errorResponse(error.message, error.status, { code: error.code })
    }
    return handleApiError(error)
  }
}

function parseWindow(searchParams: URLSearchParams): { window: FeedWindow; from?: string; to?: string } {
  const explicitFrom = normalizeDate(searchParams.get('from'))
  const explicitTo = normalizeDate(searchParams.get('to'), true)
  if (explicitFrom || explicitTo) {
    return { window: 'all', from: explicitFrom, to: explicitTo }
  }

  const requested = searchParams.get('window')
  const window: FeedWindow = requested === '7d' || requested === '90d' || requested === 'all'
    ? requested
    : '30d'
  if (window === 'all') return { window }

  const days = window === '7d' ? 7 : window === '90d' ? 90 : 30
  const fromDate = new Date()
  fromDate.setDate(fromDate.getDate() - days)
  return { window, from: fromDate.toISOString() }
}

function normalizeDate(value: string | null, endOfDay = false): string | undefined {
  if (!value) return undefined
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  if (endOfDay) {
    date.setHours(23, 59, 59, 999)
  }
  return date.toISOString()
}
