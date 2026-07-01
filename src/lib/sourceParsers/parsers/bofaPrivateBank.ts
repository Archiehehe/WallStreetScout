import type { Source } from '@/lib/storage/types'
import type { DiscoveredUrl, ParsedSourceArticle, SourceParser } from '../types'
import { fetchAndParseSitemap } from '@/lib/ingestion/sitemap'
import { fetchUrlContent } from '@/lib/ingestion/fetcher'

export const bofaPrivateBankParser: SourceParser = {
  key: 'bofaPrivateBank',
  displayName: 'BofA Private Bank',

  async discoverArticleUrls(_source: Source): Promise<DiscoveredUrl[]> {
    const urls = await fetchAndParseSitemap('https://www.privatebank.bankofamerica.com/sitemap.xml', 2)
    return urls
      .filter((u) => !/\/(about|contact|giving|philanthropy)\//i.test(new URL(u).pathname))
      .map((url) => ({ url, urlDiscoveryMethod: 'sitemap' }))
  },

  async parseArticle(url: string, _source: Source): Promise<ParsedSourceArticle> {
    const content = await fetchUrlContent(url)
    if (content.error) return { url, error: content.error }
    return { url, title: content.title, rawText: content.rawText }
  },
}
