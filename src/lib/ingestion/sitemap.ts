const DEFAULT_RECURSION_LIMIT = 3

const SITEMAP_PATTERNS = [
  /\.xml$/i,
  /\/sitemap/i,
  /sitemap[-_]/i,
  /\/news-sitemap/i,
  /\/post-sitemap/i,
  /\/page-sitemap/i,
]

export function isSitemapUrl(url: string): boolean {
  return SITEMAP_PATTERNS.some((p) => p.test(url))
}

export interface SitemapParseResult {
  childUrls: string[]
  childSitemaps: string[]
}

export async function parseSitemapXml(xmlText: string): Promise<SitemapParseResult> {
  const urls: string[] = []
  const sitemaps: string[] = []

  const locRegex = /<loc>(.*?)<\/loc>/gi
  let m: RegExpExecArray | null
  while ((m = locRegex.exec(xmlText)) !== null) {
    const loc = m[1].trim()
    if (isSitemapUrl(loc)) {
      sitemaps.push(loc)
    } else {
      urls.push(loc)
    }
  }

  return { childUrls: urls, childSitemaps: sitemaps }
}

export async function fetchAndParseSitemap(
  sitemapUrl: string,
  depth = 0,
  limit = DEFAULT_RECURSION_LIMIT,
): Promise<string[]> {
  if (depth > limit) return []

  const response = await fetch(sitemapUrl, {
    headers: { 'User-Agent': 'InstitutionalIdeaFeed/1.0' },
  })
  if (!response.ok) return []

  const text = await response.text()
  const { childUrls, childSitemaps } = await parseSitemapXml(text)

  if (childSitemaps.length > 0 && depth < limit) {
    const nested = await Promise.all(
      childSitemaps.map((s) => fetchAndParseSitemap(s, depth + 1, limit)),
    )
    return [...childUrls, ...nested.flat()]
  }

  return childUrls
}
