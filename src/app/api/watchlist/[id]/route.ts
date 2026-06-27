import { NextRequest } from 'next/server'
import { getStore } from '@/lib/storage'
import { handleApiError } from '@/lib/api/responses'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const store = getStore()
    const { id } = await params
    const deleted = await store.removeWatchlistItem(id)
    if (!deleted) return Response.json({ error: 'Not found' }, { status: 404 })
    return Response.json({ deleted: true })
  } catch (error) {
    return handleApiError(error)
  }
}
