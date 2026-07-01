import { handleApiError } from '@/lib/api/responses'
import { getStore } from '@/lib/storage'
import { SEED_CANDIDATES, PARTIAL_CANDIDATES, saveListCandidate } from '@/lib/sellSideLists'
import type { NextRequest } from 'next/server'

export async function GET() {
  try {
    const store = getStore()
    const lists = await store.getConvictionLists()
    const result = []
    for (const list of lists) {
      const members = await store.getConvictionListMembers(list.id)
      result.push({
        ...list,
        members,
        tickers: members.map((m) => m.ticker),
        tickerCount: members.length,
      })
    }
    return Response.json({
      imported: result,
      seedAvailable: SEED_CANDIDATES.length,
      partialCandidates: PARTIAL_CANDIDATES,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = await saveListCandidate(body)
    if (!result.success) {
      return Response.json({ error: result.errors.join('; ') }, { status: 422 })
    }
    return Response.json({ listId: result.listId, warnings: result.warnings }, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
