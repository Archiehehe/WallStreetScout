import { getStore } from '@/lib/storage'
import { getEnabledSources } from './sources'
import { fetchUrlsFromSource } from './fetcher'
import { submitArticleUrl } from './submitArticle'

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
  errors: string[]
  results: ScanItemResult[]
  message?: string
}

export interface ScanItemResult {
  ok: boolean
  source?: string
  url?: string
  saved?: boolean
  rejected?: boolean
  reason?: string
  error?: string
}

const DEFAULT_SCAN_CONCURRENCY = 6
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

  const sources = await getEnabledSources()
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
      results: [],
      message: 'No enabled sources configured.',
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

  const fetchedItems = sourceResults
    .flatMap((result) => result.urls.map((url) => ({ source: result.source, fetched: url })))
    .slice(0, maxTotalUrls)

  const itemResults = await runBatched(fetchedItems, concurrency, async ({ source, fetched }) => {
    try {
      const result = await submitArticleUrl(fetched.url, {
        source,
        fetchedTitle: fetched.title,
        fetchedPublishedAt: fetched.publishedAt,
      })

      if ('duplicate' in result && result.duplicate) {
        return {
          ok: true,
          source: source.name,
          url: fetched.url,
          rejected: true,
          reason: 'duplicate',
        }
      }

      if (result.saved) {
        return {
          ok: true,
          source: source.name,
          url: fetched.url,
          saved: true,
        }
      }

      return {
        ok: true,
        source: source.name,
        url: fetched.url,
        rejected: true,
        reason: 'reason' in result ? result.reason : 'duplicate',
      }
    } catch (error) {
      return {
        ok: false,
        source: source.name,
        url: fetched.url,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  })

  const sourceFailures: ScanItemResult[] = sourceResults
    .filter((result) => !result.ok)
    .map((result) => ({
      ok: false,
      source: result.source.name,
      error: result.error,
    }))

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
    errorsJson: results.length > 0 ? { errors, results } : undefined,
  })

  return {
    scanRunId: scanRun.id,
    sourcesChecked: sources.length,
    urlsFound: fetchedItems.length,
    articlesParsed: totalParsed,
    articlesSaved: totalSaved,
    totalFetched: itemResults.length,
    totalParsed,
    totalSaved,
    totalRejected,
    totalFailed,
    errors,
    results,
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
