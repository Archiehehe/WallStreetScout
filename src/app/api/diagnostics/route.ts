import { getStore } from '@/lib/storage'
import { handleApiError } from '@/lib/api/responses'
import type { ScanUrlResult } from '@/lib/storage/types'
import { parserExistsForKey, getAllParserKeys } from '@/lib/sourceParsers'
import { CORE_DOMAINS } from '@/lib/sourceRegistry'

interface BreakdownItem {
  count: number
  exampleSource: string
  exampleUrl: string
  pageType?: string
  error?: string
  httpStatus?: number
  category?: string
  rawExtractedTickers?: string[]
  screenableTickers?: string[]
}

interface MethodBreakdownItem {
  method: string
  count: number
}

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

    // Get scan URL results for the latest scan run
    let scanUrlResults: ScanUrlResult[] = []
    let rejectionBreakdown: BreakdownItem[] = []
    let failureBreakdown: BreakdownItem[] = []
    let discoveryMethodBreakdown: MethodBreakdownItem[] = []
    let skippedBreakdown: (BreakdownItem & { reason?: string })[] = []
    if (latestScanRunId) {
      try {
        scanUrlResults = await store.getScanUrlResults(latestScanRunId)
        // Build skipped breakdown
        const skipMap = new Map<string, { count: number; exampleSource: string; exampleUrl: string }>()
        for (const r of scanUrlResults) {
          if (r.status === 'skipped_url_filter' && r.rejectionCategory) {
            const cat = r.rejectionCategory
            const existing = skipMap.get(cat) ?? { count: 0, exampleSource: '', exampleUrl: '' }
            existing.count++
            if (!existing.exampleSource) existing.exampleSource = r.sourceName ?? r.sourceDomain ?? ''
            if (!existing.exampleUrl) existing.exampleUrl = r.url
            skipMap.set(cat, existing)
          }
        }
        skippedBreakdown = Array.from(skipMap.entries()).map(([reason, data]) => ({ reason, ...data })).sort((a, b) => b.count - a.count)

        // Build rejection breakdown
        const rejectMap = new Map<string, { count: number; exampleSource: string; exampleUrl: string; rawExtractedTickers: string[]; screenableTickers: string[]; pageType: string }>()
        for (const r of scanUrlResults) {
          if (r.status === 'rejected' && r.rejectionCategory) {
            const existing = rejectMap.get(r.rejectionCategory) ?? { count: 0, exampleSource: '', exampleUrl: '', rawExtractedTickers: [], screenableTickers: [], pageType: '' }
            existing.count++
            if (!existing.exampleSource) existing.exampleSource = r.sourceName ?? r.sourceDomain ?? ''
            if (!existing.exampleUrl) existing.exampleUrl = r.url
            if (!existing.pageType) existing.pageType = r.pageType ?? ''
            rejectMap.set(r.rejectionCategory, existing)
          }
        }
        rejectionBreakdown = Array.from(rejectMap.entries()).map(([category, data]) => ({ category, ...data })).sort((a, b) => b.count - a.count)

        // Build failure breakdown
        const failMap = new Map<string, { count: number; exampleSource: string; exampleUrl: string; httpStatus?: number }>()
        for (const r of scanUrlResults) {
          if (r.status === 'failed' && r.error) {
            const key = r.error.slice(0, 120)
            const existing = failMap.get(key) ?? { count: 0, exampleSource: '', exampleUrl: '', httpStatus: undefined }
            existing.count++
            if (!existing.exampleSource) existing.exampleSource = r.sourceName ?? r.sourceDomain ?? ''
            if (!existing.exampleUrl) existing.exampleUrl = r.url
            if (existing.httpStatus === undefined) existing.httpStatus = r.httpStatus
            failMap.set(key, existing)
          }
        }
        failureBreakdown = Array.from(failMap.entries()).map(([error, data]) => ({ error, ...data })).sort((a, b) => b.count - a.count)

        // Build discovery method breakdown
        const discMap = new Map<string, number>()
        for (const r of scanUrlResults) {
          const method = r.urlDiscoveryMethod ?? 'unknown'
          discMap.set(method, (discMap.get(method) ?? 0) + 1)
        }
        discoveryMethodBreakdown = Array.from(discMap.entries()).map(([method, count]) => ({ method, count })).sort((a, b) => b.count - a.count)
      } catch {
        // scan_url_results table may not exist yet
      }
    }

    const parserCoverage = sources.map((source) => ({
      name: source.name,
      domain: source.domain,
      parserKey: source.parserKey ?? null,
      parserExists: parserExistsForKey(source.parserKey),
      enabled: source.enabled,
      sourceTier: source.sourceTier ?? 'secondary',
    }))

    return Response.json({
      sources: {
        total: sources.length,
        enabled: enabledSources.length,
        enabledCore: enabledSources.filter((source) => source.sourceTier === 'core').length,
        enabledMedia: enabledSources.filter((source) => isMediaSource(source.name, source.domain)).length,
        expectedCore: CORE_DOMAINS.size,
        parserCoverage,
        registeredParsers: getAllParserKeys().length,
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
        skippedBreakdown,
        rejectionBreakdown,
        failureBreakdown,
        discoveryMethodBreakdown,
      },
      sourceScans: scanRows,
      scanUrlResults,
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
