import { saveListCandidate } from '@/lib/sellSideLists'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const candidate = await request.json()
  const result = await saveListCandidate(candidate)
  return NextResponse.json(result)
}
