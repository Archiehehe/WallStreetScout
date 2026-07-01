import { getStore } from '@/lib/storage'
import { getEnabledSources } from './sources'
import { fetchUrlsFromSource } from './fetcher'
import { submitArticleUrl } from './submitArticle'
import { isArticleCandidateUrl } from './urlFilter'

export interface ScanResult {
  scanRunId: string
  sourcesChecked: number
  urlsFound: number
  articlesParsed: number
  articlesSaved: number
  totalFetched: number
  totalParsed: number
  totalSaved: number
  totalRejected: number
  totalFailed: number
  totalSkipped: number
  skippedBreakdown: Record<string, number>
  errors: string[]
  results: ScanItemResult[]
  message?: string
  sourceCapApplied?: boolean
}

export interface ScanItemResult {
  ok: boolean
  source?: string
  url?: string
  saved?: boolean
  rejected?: boolean
  reason?: string
  error?: string
  sourceId?: string
  sourceDomain?: string
}

const DEFAULT_SCAN_CONCURRENCY = 6
const DEFAULT_MAX_SOURCES_PER_RUN = 40
const DEFAULT_MAX_TOTAL_URLS = 200

export async function runScan(): Promise<ScanResult> {
  const store = getStore()

  const scanRun = await store.createScanRun({
    startedAt: new Date().toISOString(),
    status: 'running',
    sourcesChecked: 0,
    urlsFound: 0,
    articlesParsed: 0,
    articlesSaved: 0,
  })

  const allEnabledSources = await getEnabledSources()
  const maxSourcesPerRun = Math.max(1, Number(process.env.SCAN_MAX_SOURCES_PER_RUN ?? DEFAULT_MAX_SOURCES_PER_RUN))
  const sources = allEnabledSources.slice(0, maxSourcesPerRun)
  const sourceCapApplied = allEnabledSources.length > sources.length
  if (sources.length === 0) {
    const finishedAt = new Date().toISOString()
    await store.updateScanRun(scanRun.id, {
      finishedAt,
      status: 'completed',
      sourcesChecked: 0,
      urlsFound: 0,
      articlesParsed: 0,
      articlesSaved: 0,
    })

    return {
      scanRunId: scanRun.id,
      sourcesChecked: 0,
      urlsFound: 0,
      articlesParsed: 0,
      articlesSaved: 0,
      errors: [],
      totalFetched: 0,
      totalParsed: 0,
      totalSaved: 0,
      totalRejected: 0,
      totalFailed: 0,
      totalSkipped: 0,
      skippedBreakdown: {},
      results: [],
      message: 'No enabled sources configured.',
      sourceCapApplied: false,
    }
  }

  const concurrency = Math.max(1, Number(process.env.SCAN_CONCURRENCY ?? DEFAULT_SCAN_CONCURRENCY))
  const maxTotalUrls = Math.max(1, Number(process.env.SCAN_MAX_TOTAL_URLS ?? DEFAULT_MAX_TOTAL_URLS))

  const sourceResults = await runBatched(sources, concurrency, async (source) => {
    try {
      const urls = await fetchUrlsFromSource(source)
      return { ok: true as const, source, urls }
    } catch (error) {
      return {
        ok: false as const,
        source,
        urls: [],
        error: error instanceof Error ? error.message : String(error),
      }
    }
  })

  const allItems = sourceResults
    .flatMap((result) => result.urls.map((url) => ({ source: result.source, fetched: url })))

  const filtered: typeof allItems = []
  const skipped: { item: (typeof allItems)[number]; reason: string }[] = []
  for (const item of allItems) {
    const check = isArticleCandidateUrl(item.fetched.url, item.source)
    if (check.ok) {
      filtered.push(item)
    } else {
      skipped.push({ item, reason: check.reason })
    }
  }

  const fetchedItems = filtered.slice(0, maxTotalUrls)
  const skippedItems = skipped.slice(0, maxTotalUrls)

  for (const { item, reason } of skippedItems) {
    await store.createScanUrlResult({
      scanRunId: scanRun.id,
      sourceId: item.source.id,
      sourceName: item.source.name,
      sourceDomain: item.source.domain,
      url: item.fetched.url,
      normalizedUrl: item.fetched.url,
      urlDiscoveryMethod: item.fetched.urlDiscoveryMethod ?? 'unknown',
      status: 'skipped_url_filter',
      rejectionCategory: reason,
      rejectionReason: reason,
      rawExtractedTickers: [],
      screenableTickers: [],
    }).catch(() => {})
  }

  const itemResults = await runBatched(fetchedItems, concurrency, async ({ source, fetched }) => {
    const urlResult = {
      scanRunId: scanRun.id,
      sourceId: source.id,
      sourceName: source.name,
      sourceDomain: source.domain,
      url: fetched.url,
      normalizedUrl: fetched.url,
      urlDiscoveryMethod: fetched.urlDiscoveryMethod ?? 'unknown',
      rawExtractedTickers: [] as string[],
      screenableTickers: [] as string[],
    }
    try {
      const result = await submitArticleUrl(fetched.url, {
        source,
        fetchedTitle: fetched.title,
        fetchedPublishedAt: fetched.publishedAt,
      })

      if ('duplicate' in result && result.duplicate) {
        await store.createScanUrlResult({ ...urlResult, status: 'skipped_seen', rejectionCategory: 'duplicate', rejectionReason: 'Article already exists in DB' })
        return {
          ok: true,
          source: source.name,
          sourceId: source.id,
          sourceDomain: source.domain,
          url: fetched.url,
          rejected: true,
          reason: 'duplicate',
        }
      }

      if (result.saved) {
        await store.createScanUrlResult({ ...urlResult, status: 'saved', screenableTickers: result.extractedTickers ?? [] })
        return {
          ok: true,
          source: source.name,
          sourceId: source.id,
          sourceDomain: source.domain,
          url: fetched.url,
          saved: true,
        }
      }

      const rejectionReason = ('reason' in result ? result.reason : 'duplicate') as string
      const hasExtractedTickers = 'extractedTickers' in result
      const extractedTickers = hasExtractedTickers ? result.extractedTickers as unknown as string[] : []
      await store.createScanUrlResult({
        ...urlResult,
        status: 'rejected',
        rejectionCategory: rejectionReason,
        rejectionReason,
        rawExtractedTickers: extractedTickers,
        screenableTickers: [],
        httpStatus: 200,
      })
      return {
        ok: true,
        source: source.name,
        sourceId: source.id,
        sourceDomain: source.domain,
        url: fetched.url,
        rejected: true,
        reason: rejectionReason,
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      await store.createScanUrlResult({
        ...urlResult,
        status: 'failed',
        error: errorMsg,
        rejectionCategory: 'fetch_or_parse_error',
        rejectionReason: errorMsg,
      })
      return {
        ok: false,
        source: source.name,
        sourceId: source.id,
        sourceDomain: source.domain,
        url: fetched.url,
        error: errorMsg,
      }
    }
  })

  const sourceFailures: ScanItemResult[] = sourceResults
    .filter((result) => !result.ok)
    .map((result) => ({
      ok: false,
      source: result.source.name,
      sourceId: result.source.id,
      sourceDomain: result.source.domain,
      error: result.error,
    }))

  const skippedBreakdown: Record<string, number> = {}
  for (const { reason } of skippedItems) {
    skippedBreakdown[reason] = (skippedBreakdown[reason] ?? 0) + 1
  }

  const results = [...sourceFailures, ...itemResults]
  const totalSaved = itemResults.filter((result) => result.saved).length
  const totalRejected = itemResults.filter((result) => result.rejected).length
  const totalFailed = results.filter((result) => !result.ok).length
  const totalParsed = totalSaved + totalRejected
  const errors = results
    .filter((result) => !result.ok)
    .map((result) => `${result.source ?? 'Unknown'}${result.url ? ` ${result.url}` : ''}: ${result.error}`)

  await store.updateScanRun(scanRun.id, {
    finishedAt: new Date().toISOString(),
    status: 'completed',
    sourcesChecked: sources.length,
    urlsFound: fetchedItems.length,
    articlesParsed: totalParsed,
    articlesSaved: totalSaved,
    errorsJson: results.length > 0 ? {
      errors,
      results,
      sourceCapApplied,
      sourceCap: maxSourcesPerRun,
      enabledSourcesAvailable: allEnabledSources.length,
    } : undefined,
  })

  const resultsBySourceId = new Map<string, ScanItemResult[]>()
  for (const result of itemResults) {
    if (!result.sourceId) continue
    resultsBySourceId.set(result.sourceId, [...(resultsBySourceId.get(result.sourceId) ?? []), result])
  }

  for (const sourceResult of sourceResults) {
    const sourceItems = resultsBySourceId.get(sourceResult.source.id) ?? []
    const sourceFailure = !sourceResult.ok ? sourceResult.error : undefined
    const savedCount = sourceItems.filter((result) => result.saved).length
    const rejectedCount = sourceItems.filter((result) => result.rejected).length
    const failedCount = sourceItems.filter((result) => !result.ok).length + (sourceFailure ? 1 : 0)
    const startedAt = scanRun.startedAt
    await store.createSourceScanResult({
      scanRunId: scanRun.id,
      sourceId: sourceResult.source.id,
      sourceName: sourceResult.source.name,
      sourceDomain: sourceResult.source.domain,
      sourceTier: sourceResult.source.sourceTier,
      status: sourceFailure ? 'failed' : sourceResult.urls.length === 0 ? 'no_urls' : 'completed',
      urlsFound: sourceResult.urls.length,
      urlsAttempted: sourceItems.length,
      savedCount,
      rejectedCount,
      failedCount,
      error: sourceFailure,
      startedAt,
      finishedAt: new Date().toISOString(),
    })
  }

  return {
    scanRunId: scanRun.id,
    sourcesChecked: sources.length,
    urlsFound: allItems.length,
    articlesParsed: totalParsed,
    articlesSaved: totalSaved,
    totalFetched: itemResults.length,
    totalParsed,
    totalSaved,
    totalRejected,
    totalFailed,
    totalSkipped: skippedItems.length,
    skippedBreakdown,
    errors,
    results,
    message: sourceCapApplied ? `Scanned first ${sources.length} of ${allEnabledSources.length} enabled sources.` : undefined,
    sourceCapApplied,
  }
}

async function runBatched<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const batches: T[][] = []
  for (let index = 0; index < items.length; index += concurrency) {
    batches.push(items.slice(index, index + concurrency))
  }

  const results: R[] = []
  for (const batch of batches) {
    const settled = await Promise.allSettled(batch.map((item) => worker(item)))
    for (const item of settled) {
      if (item.status === 'fulfilled') {
        results.push(item.value)
      }
    }
  }
  return results
}
