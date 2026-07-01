import type { Source } from '@/lib/storage/types'
import type { DiscoveredUrl, ParsedSourceArticle, SourceParser } from '../types'
import { fetchAndParseSitemap } from '@/lib/ingestion/sitemap'
import { fetchUrlContent } from '@/lib/ingestion/fetcher'

export const blackRockParser: SourceParser = {
  key: 'blackRock',
  displayName: 'BlackRock',

  async discoverArticleUrls(_source: Source): Promise<DiscoveredUrl[]> {
    const urls = await fetchAndParseSitemap('https://www.blackrock.com/sitemap.xml', 2)
    return urls
      .filter((u) => /^\/us\/individual\/insights\//i.test(new URL(u).pathname))
      .filter((u) => !/\/(funds|products|etf|resources|careers)\//i.test(new URL(u).pathname))
      .map((url) => ({ url, urlDiscoveryMethod: 'sitemap' }))
  },

  async parseArticle(url: string, _source: Source): Promise<ParsedSourceArticle> {
    const content = await fetchUrlContent(url)
    if (content.error) return { url, error: content.error }
    return { url, title: content.title, rawText: content.rawText }
  },
}
