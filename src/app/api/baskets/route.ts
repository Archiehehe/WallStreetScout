import { NextRequest } from 'next/server'
import { getStore } from '@/lib/storage'
import { errorResponse, handleApiError } from '@/lib/api/responses'
import { uniqueTickers } from '@/lib/ingestion/url'

export async function GET() {
  try {
    const store = getStore()
    const baskets = await store.getBaskets()
    const result = []

    for (const basket of baskets) {
      const members = await store.getBasketMembers(basket.id)
      const article = basket.articleId ? await store.getArticle(basket.articleId) : null
      result.push({
        ...basket,
        tickers: members.map(m => m.ticker),
        sourceUrl: article?.url,
        sourceTitle: article?.title,
      })
    }

    return Response.json(result)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const store = getStore()
    const body = await request.json()
    const tickers = uniqueTickers(Array.isArray(body.tickers) ? body.tickers : [])

    if (tickers.length === 0) {
      return errorResponse('At least one ticker is required to save a basket.', 400)
    }

    const article = body.articleId ? await store.getArticle(body.articleId) : null
    const extraction = article ? await store.getExtraction(article.id) : null
    const name = cleanBasketName(body.name)
      ?? defaultBasketName({
        firm: body.firm ?? extraction?.firm,
        theme: body.theme ?? extraction?.theme,
        title: article?.title,
      })

    const basket = await store.createBasket({
      name,
      articleId: article?.id,
      firm: body.firm ?? extraction?.firm,
      theme: body.theme ?? extraction?.theme,
      sector: body.sector ?? extraction?.sector,
      region: body.region ?? extraction?.region,
      notes: body.notes,
    })

    for (const ticker of tickers) {
      await store.addBasketMember({ basketId: basket.id, ticker })
    }

    return Response.json({ ...basket, tickers }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}

function cleanBasketName(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function defaultBasketName(input: { firm?: string; theme?: string; title?: string }): string {
  const parts = [input.firm, input.theme].filter(Boolean)
  if (parts.length > 0) return `${parts.join(' ')} Basket`
  if (input.title) return `Basket from ${input.title.slice(0, 48)}`
  return 'Saved Basket'
}
