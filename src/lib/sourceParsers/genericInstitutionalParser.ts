import type { Source } from '@/lib/storage/types'
import type { DiscoveredUrl, ParsedSourceArticle, SourceParser } from './types'
import { fetchUrlsFromSource } from '@/lib/ingestion/fetcher'
import { submitArticleUrl } from '@/lib/ingestion/submitArticle'

export const genericInstitutionalParser: SourceParser = {
  key: 'generic',
  displayName: 'Generic Institutional Parser',

  async discoverArticleUrls(source: Source): Promise<DiscoveredUrl[]> {
    return fetchUrlsFromSource(source)
  },

  async parseArticle(url: string, source: Source): Promise<ParsedSourceArticle> {
    try {
      const result = await submitArticleUrl(url, { source })
      if ('error' in result && result.error) {
        return { url, error: result.error as string }
      }
      return { url }
    } catch (error) {
      return { url, error: error instanceof Error ? error.message : String(error) }
    }
  },
}
