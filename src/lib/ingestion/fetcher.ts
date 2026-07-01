import type { Source } from '@/lib/storage/types'
import { safeNormalizeUrl } from './url'
import { isSitemapUrl, fetchAndParseSitemap } from './sitemap'

interface FetchedUrl {
  url: string
  sourceId: string
  publishedAt?: string
  title?: string
  urlDiscoveryMethod?: string
}

const DEFAULT_MAX_URLS_PER_SOURCE = 8
const DEFAULT_FETCH_TIMEOUT_MS = 12000
const RESEARCH_URL_PATTERN = /insight|research|commentary|market|outlook|view|perspective|article|publication|memo|letter|strategy|investment|portfolio|econom|thought|analysis/i

export async function fetchUrlsFromSource(source: Source): Promise<FetchedUrl[]> {
  const urls: FetchedUrl[] = []

  if (source.rssUrl) {
    try {
      const rssUrls = await fetchRss(source.rssUrl, source.id)
      rssUrls.forEach((u) => { u.urlDiscoveryMethod = 'rss' })
      urls.push(...rssUrls)
    } catch (err) {
      console.error(`Failed to fetch RSS for ${source.name}:`, err)
    }
  }

  if (source.sitemapUrl) {
    try {
      const sitemapUrls = await fetchSitemap(source.sitemapUrl, source.id)
      sitemapUrls.forEach((u) => { u.urlDiscoveryMethod = 'sitemap' })
      urls.push(...sitemapUrls)
    } catch (err) {
      console.error(`Failed to fetch sitemap for ${source.name}:`, err)
    }
  }

  const expanded: FetchedUrl[] = []
  for (const item of urls) {
    if (isSitemapUrl(item.url)) {
      try {
        const childUrls = await fetchAndParseSitemap(item.url)
        for (const cu of childUrls) {
          const normal = safeNormalizeUrl(cu)
          if (normal) {
            expanded.push({ url: normal, sourceId: source.id, urlDiscoveryMethod: 'sitemap' })
          }
        }
      } catch {
      }
    } else {
      expanded.push(item)
    }
  }

  return prioritizeFetchedUrls(expanded)
}

export async function fetchRss(rssUrl: string, sourceId: string): Promise<FetchedUrl[]> {
  const response = await timedFetch(rssUrl, {
    headers: { 'User-Agent': 'InstitutionalIdeaFeed/1.0' },
  })
  if (!response.ok) {
    throw new Error(`RSS fetch failed with HTTP ${response.status}`)
  }
  const text = await response.text()

  const urls: FetchedUrl[] = []
  const linkRegex = /<link[^>]*>(.*?)<\/link>/gi
  const atomLinkRegex = /<link[^>]+href=["']([^"']+)["'][^>]*>/gi
  const titleRegex = /<title[^>]*>(.*?)<\/title>/gi
  const pubDateRegex = /<pubDate[^>]*>(.*?)<\/pubDate>/gi

  const links: string[] = []
  let m
  while ((m = linkRegex.exec(text)) !== null) {
    const link = m[1].trim()
    if (link.startsWith('http')) links.push(link)
  }
  while ((m = atomLinkRegex.exec(text)) !== null) {
    const link = m[1].trim()
    if (link.startsWith('http')) links.push(link)
  }

  const titles: string[] = []
  while ((m = titleRegex.exec(text)) !== null) {
    titles.push(m[1].trim())
  }

  const dates: string[] = []
  while ((m = pubDateRegex.exec(text)) !== null) {
    dates.push(m[1].trim())
  }

  for (let i = 0; i < links.length; i++) {
    const normalized = safeNormalizeUrl(links[i])
    if (!normalized) continue
    urls.push({
      url: normalized,
      sourceId,
      title: titles[i + 1] || titles[i] || undefined,
      publishedAt: dates[i] || undefined,
    })
  }

  return urls
}

export async function fetchSitemap(sitemapUrl: string, sourceId: string): Promise<FetchedUrl[]> {
  const response = await timedFetch(sitemapUrl, {
    headers: { 'User-Agent': 'InstitutionalIdeaFeed/1.0' },
  })
  if (!response.ok) {
    throw new Error(`Sitemap fetch failed with HTTP ${response.status}`)
  }
  const text = await response.text()

  const urls: FetchedUrl[] = []
  const locRegex = /<loc>(.*?)<\/loc>/gi
  let m
  while ((m = locRegex.exec(text)) !== null) {
    const normalized = safeNormalizeUrl(m[1].trim())
    if (normalized) urls.push({ url: normalized, sourceId })
  }

  return urls
}

function prioritizeFetchedUrls(urls: FetchedUrl[]): FetchedUrl[] {
  const maxUrls = Number(process.env.SCAN_MAX_URLS_PER_SOURCE ?? DEFAULT_MAX_URLS_PER_SOURCE)
  const byUrl = new Map<string, FetchedUrl>()

  for (const item of urls) {
    if (!byUrl.has(item.url)) {
      byUrl.set(item.url, item)
    }
  }

  const uniqueUrls = Array.from(byUrl.values())
  const researchUrls = uniqueUrls.filter((item) => RESEARCH_URL_PATTERN.test(item.url) || RESEARCH_URL_PATTERN.test(item.title ?? ''))
  const prioritized = researchUrls.length > 0 ? researchUrls : uniqueUrls

  return prioritized.slice(0, Math.max(1, maxUrls))
}

export async function fetchArticleHtml(url: string): Promise<string> {
  const response = await timedFetch(url, {
    headers: { 'User-Agent': 'InstitutionalIdeaFeed/1.0' },
  })
  if (!response.ok) {
    throw new Error(`Fetch failed with HTTP ${response.status}`)
  }
  return response.text()
}

async function timedFetch(input: string, init: RequestInit): Promise<Response> {
  const timeoutMs = Number(process.env.SCAN_FETCH_TIMEOUT_MS ?? DEFAULT_FETCH_TIMEOUT_MS)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), Math.max(1000, timeoutMs))

  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}
