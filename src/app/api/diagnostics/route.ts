import { getStore } from '@/lib/storage'
import { handleApiError } from '@/lib/api/responses'

export async function GET() {
  try {
    const store = getStore()
    const [sources, scanRuns, sourceScans, convictionLists, managerHoldingsCount] = await Promise.all([
      store.getSources(),
      store.getScanRuns(1),
      store.getLatestSourceScanResults(),
      store.getConvictionLists(),
      store.getManagerHoldingsCount(),
    ])

    const enabledSources = sources.filter((source) => source.enabled)
    const latestScanRun = scanRuns[0] ?? null
    const latestScanRunId = latestScanRun?.id
    const latestRunSourceScans = latestScanRunId
      ? sourceScans.filter((scan) => scan.scanRunId === latestScanRunId)
      : []
    const scanRows = latestRunSourceScans.length > 0 ? latestRunSourceScans : sourceScans
    const rejectionReasons = extractRejectionReasons(latestScanRun?.errorsJson)

    return Response.json({
      sources: {
        total: sources.length,
        enabled: enabledSources.length,
        enabledCore: enabledSources.filter((source) => source.sourceTier === 'core').length,
        enabledMedia: enabledSources.filter((source) => isMediaSource(source.name, source.domain)).length,
      },
      latestScanRun,
      scanSummary: {
        startedAt: latestScanRun?.startedAt,
        finishedAt: latestScanRun?.finishedAt,
        status: latestScanRun?.status,
        sourcesScanned: scanRows.length,
        urlsFound: latestScanRun?.urlsFound ?? 0,
        urlsAttempted: scanRows.reduce((sum, scan) => sum + scan.urlsAttempted, 0),
        articlesSaved: latestScanRun?.articlesSaved ?? 0,
        articlesRejected: scanRows.reduce((sum, scan) => sum + scan.rejectedCount, 0),
        articlesFailed: scanRows.reduce((sum, scan) => sum + scan.failedCount, 0),
        commonRejectionReasons: rejectionReasons,
      },
      sourceScans: scanRows,
      bootstrap: {
        convictionListsImported: convictionLists.length,
        managerHoldingsImported: managerHoldingsCount,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

function extractRejectionReasons(errorsJson?: Record<string, unknown>): Array<{ reason: string; count: number }> {
  const results = Array.isArray(errorsJson?.results) ? errorsJson.results : []
  const counts = new Map<string, number>()
  for (const result of results) {
    if (!result || typeof result !== 'object') continue
    const reason = typeof (result as { reason?: unknown }).reason === 'string'
      ? normalizeReason((result as { reason: string }).reason)
      : typeof (result as { error?: unknown }).error === 'string'
        ? 'parser quality poor'
        : undefined
    if (!reason) continue
    counts.set(reason, (counts.get(reason) ?? 0) + 1)
  }

  return Array.from(counts.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason))
    .slice(0, 6)
}

function normalizeReason(reason: string): string {
  if (reason.includes('fewer_than_3')) return 'fewer than 3 screenable tickers'
  if (reason.includes('education')) return 'tool/product/education page'
  if (reason.includes('product') || reason.includes('tool') || reason.includes('fund') || reason.includes('landing')) return 'tool/product/education page'
  if (reason.includes('not_research') || reason.includes('No basket') || reason.includes('No institutional')) return 'no research-idea qualifier'
  if (reason === 'duplicate') return 'duplicate URL already stored'
  return reason.replace(/^rejected_/, '').replace(/_/g, ' ')
}

function isMediaSource(name: string, domain: string): boolean {
  const text = `${name} ${domain}`.toLowerCase()
  return [
    'cnbc', 'benzinga', 'seeking alpha', 'seekingalpha', 'yahoo finance',
    'marketwatch', 'reuters', 'investing.com', 'tipranks', 'the fly',
    'stockanalysis', 'marketbeat', 'streetinsider', 'gurufocus',
  ].some((blocked) => text.includes(blocked))
}
