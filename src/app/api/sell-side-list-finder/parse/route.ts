import { parsePastedList } from '@/lib/sellSideLists'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { text } = await request.json()
  const parsed = parsePastedList(text)
  return NextResponse.json(parsed)
}
