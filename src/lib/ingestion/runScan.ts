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
  errors: string[]
  message?: string
}

export async function runScan(): Promise<ScanResult> {
  const store = getStore()
  const errors: string[] = []

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
      message: 'No enabled sources configured.',
    }
  }

  let totalUrls = 0
  let totalParsed = 0
  let totalSaved = 0

  for (const source of sources) {
    try {
      const urls = await fetchUrlsFromSource(source)
      totalUrls += urls.length

      for (const fetched of urls) {
        try {
          const result = await submitArticleUrl(fetched.url, {
            source,
            fetchedTitle: fetched.title,
            fetchedPublishedAt: fetched.publishedAt,
          })

          if ('duplicate' in result && result.duplicate) continue
          totalParsed++
          if (result.saved) totalSaved++
        } catch (error) {
          errors.push(
            `Error processing ${fetched.url}: ${error instanceof Error ? error.message : String(error)}`,
          )
        }
      }
    } catch (error) {
      errors.push(`Error with source ${source.name}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  await store.updateScanRun(scanRun.id, {
    finishedAt: new Date().toISOString(),
    status: errors.length > 0 ? 'failed' : 'completed',
    sourcesChecked: sources.length,
    urlsFound: totalUrls,
    articlesParsed: totalParsed,
    articlesSaved: totalSaved,
    errorsJson: errors.length > 0 ? { errors } : undefined,
  })

  return {
    scanRunId: scanRun.id,
    sourcesChecked: sources.length,
    urlsFound: totalUrls,
    articlesParsed: totalParsed,
    articlesSaved: totalSaved,
    errors,
  }
}
