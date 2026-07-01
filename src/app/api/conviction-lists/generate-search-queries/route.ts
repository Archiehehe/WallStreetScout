import { handleApiError } from '@/lib/api/responses'
import { generateAllQueries, getSellSideListWindow } from '@/lib/sellSideLists'

export async function GET() {
  try {
    const window = getSellSideListWindow()
    const queries = generateAllQueries()
    return Response.json({ window: { fromDate: window.fromDate.toISOString(), toDate: window.toDate.toISOString(), yearLabel: window.yearLabel, queryYear: window.queryYear }, queryCount: queries.length, queries })
  } catch (error) {
    return handleApiError(error)
  }
}
