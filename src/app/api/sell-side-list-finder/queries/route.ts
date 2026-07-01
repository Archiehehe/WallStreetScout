import { getSellSideListWindow, generateAllQueries } from '@/lib/sellSideLists'
import { NextResponse } from 'next/server'

export async function GET() {
  const window = getSellSideListWindow()
  const queries = generateAllQueries()
  return NextResponse.json({ window, queries })
}
