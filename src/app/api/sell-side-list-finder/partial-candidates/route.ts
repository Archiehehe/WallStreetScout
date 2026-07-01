import { PARTIAL_CANDIDATES } from '@/lib/sellSideLists'
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(PARTIAL_CANDIDATES)
}
