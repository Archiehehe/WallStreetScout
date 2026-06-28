import { getStore } from '@/lib/storage'
import { handleApiError } from '@/lib/api/responses'

export async function GET() {
  try {
    const store = getStore()
    const lists = await store.getConvictionLists()
    const result = []

    for (const list of lists) {
      const members = await store.getConvictionListMembers(list.id)
      const tickers = members.map((member) => member.ticker)
      const overlaps = await store.get13FOverlapsForTickers(tickers)
      result.push({
        ...list,
        members,
        tickers,
        tickerCount: tickers.length,
        overlaps,
      })
    }

    return Response.json(result)
  } catch (error) {
    return handleApiError(error)
  }
}
