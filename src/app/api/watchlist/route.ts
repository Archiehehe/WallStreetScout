import { NextRequest } from 'next/server'
import { getStore } from '@/lib/storage'
import { errorResponse, handleApiError } from '@/lib/api/responses'
import { normalizeTicker } from '@/lib/ingestion/url'

export async function GET() {
  try {
    const store = getStore()
    const items = await store.getWatchlist()
    return Response.json(items)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const store = getStore()
    const { ticker, companyName, exchange, country, sector, theme, sourceArticleId, sourceBasketId, notes } = await request.json()
    const normalizedTicker = typeof ticker === 'string' ? normalizeTicker(ticker) : ''

    if (!normalizedTicker) return errorResponse('ticker required', 400)
    if (!/^[A-Z0-9.-]{1,10}$/.test(normalizedTicker)) {
      return errorResponse('Invalid ticker.', 400)
    }

    const existing = await store.getWatchlistItem(normalizedTicker)
    if (existing) {
      return Response.json({
        ...existing,
        duplicate: true,
        message: 'Ticker already exists in watchlist.',
      })
    }

    const item = await store.addWatchlistItem({
      ticker: normalizedTicker,
      companyName,
      exchange,
      country,
      sector,
      theme,
      sourceArticleId,
      sourceBasketId,
      notes,
    })

    return Response.json(item, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
