import { getStore } from '@/lib/storage'
import { handleApiError } from '@/lib/api/responses'
import type { NextRequest } from 'next/server'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const store = getStore()
    const { id } = await params
    const list = await store.getConvictionList(id)
    if (!list) {
      return Response.json({ error: 'Conviction list not found' }, { status: 404 })
    }
    const members = await store.getConvictionListMembers(list.id)
    return Response.json({ ...list, members, tickers: members.map(m => m.ticker) })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const store = getStore()
    const { id } = await params
    const body = await request.json()

    const allowedUpdates = [
      'institution',
      'listName',
      'displayName',
      'year',
      'period',
      'theme',
      'sector',
      'region',
      'sourceUrl',
      'sourceType',
      'sourcePublisher',
      'accessStatus',
      'confidence',
      'reviewStatus',
      'rawSourceTitle',
      'rawSourceExcerpt',
      'publishedAt',
      'notes'
    ]
    const updates: Record<string, unknown> = {}

    for (const key of Object.keys(body)) {
      if (allowedUpdates.includes(key)) {
        updates[key] = body[key]
      }
    }

    const updated = await store.updateConvictionList(id, updates)

    if (!updated) {
      return Response.json({ error: 'Conviction list not found' }, { status: 404 })
    }

    return Response.json(updated)
  } catch (error) {
    return handleApiError(error)
  }
}