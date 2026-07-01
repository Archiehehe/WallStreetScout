import type { NextRequest } from 'next/server'
import { handleApiError } from '@/lib/api/responses'
import { parsePastedList } from '@/lib/sellSideLists'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const text = String(body.text ?? '')
    if (!text.trim()) {
      return Response.json({ error: 'Paste text is required.' }, { status: 422 })
    }
    const parsed = parsePastedList(text)
    return Response.json(parsed)
  } catch (error) {
    return handleApiError(error)
  }
}
