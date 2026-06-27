import { NextRequest } from 'next/server'
import { getStore } from '@/lib/storage'
import { DEFAULT_THRESHOLD } from '@/lib/ingestion/scorer'
import { ArticleSubmitError, submitArticleUrl } from '@/lib/ingestion/submitArticle'
import { errorResponse, handleApiError } from '@/lib/api/responses'

export async function GET(request: NextRequest) {
  try {
    const store = getStore()
    const { searchParams } = request.nextUrl
    const search = searchParams.get('search')?.toLowerCase()
    const firm = searchParams.get('firm')
    const sector = searchParams.get('sector')
    const sourceType = searchParams.get('sourceType')
    const saved = searchParams.get('saved')
    const sort = searchParams.get('sort') ?? 'newest'

    const articles = await store.getArticles({ minScore: DEFAULT_THRESHOLD })
    const baskets = await store.getBaskets()
    const savedArticleIds = new Set(baskets.map((basket) => basket.articleId).filter(Boolean))

    const result = []
    for (const article of articles) {
      const extraction = await store.getExtraction(article.id)
      const source = await store.getSource(article.sourceId)
      const articleSourceType = extraction?.sourceType ?? source?.sourceType ?? 'unknown'
      const isSaved = savedArticleIds.has(article.id)
      const tickers = extraction?.extractedTickers ?? []

      if (firm && extraction?.firm !== firm) continue
      if (sector && extraction?.sector !== sector) continue
      if (sourceType && articleSourceType !== sourceType) continue
      if (saved === 'true' && !isSaved) continue
      if (saved === 'false' && isSaved) continue
      if (search) {
        const haystack = [
          article.title,
          extraction?.reasonShown,
          extraction?.firm,
          extraction?.theme,
          extraction?.sector,
          extraction?.region,
          ...tickers,
        ].filter(Boolean).join(' ').toLowerCase()
        if (!haystack.includes(search)) continue
      }

      result.push({
        id: article.id,
        title: article.title,
        url: article.url,
        sourceName: source?.name ?? 'Unknown',
        sourceType: articleSourceType,
        firm: extraction?.firm,
        publishedAt: article.publishedAt,
        theme: extraction?.theme,
        sector: extraction?.sector,
        region: extraction?.region,
        tickers,
        score: article.articleScore,
        reasonShown: extraction?.reasonShown,
        saved: isSaved,
      })
    }

    result.sort((a, b) => {
      if (sort === 'highest_score') return b.score - a.score
      if (sort === 'most_tickers') return b.tickers.length - a.tickers.length
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    })

    return Response.json(result)
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
