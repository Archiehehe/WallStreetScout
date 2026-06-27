import { runScan } from '@/lib/ingestion/runScan'

export async function POST() {
  const result = await runScan()
  return Response.json(result)
}
