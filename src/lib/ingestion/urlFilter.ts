import type { Source } from '@/lib/storage/types'
import { isSitemapUrl } from './sitemap'

export type SkipReason =
  | 'sitemap_xml'
  | 'blocked_path'
  | 'outside_domain'
  | 'xml_file'
  | 'duplicate_url'

function pathMatchesAny(pathname: string, prefixes: string[]): boolean {
  const lower = pathname.toLowerCase()
  return prefixes.some((p) => lower.startsWith(p))
}

function pathMatchesGlobalBlocked(pathname: string): boolean {
  const lower = pathname.toLowerCase()
  const segments = lower.split('/').filter(Boolean)
  for (const s of segments) {
    if (GLOBAL_BLOCKED_SEGMENTS.has(s)) return true
  }
  if (/\.(xml|pdf)$/i.test(pathname)) return true
  return false
}

const GLOBAL_BLOCKED_SEGMENTS = new Set([
  'press-release',
  'press-releases',
  'newsroom',
  'media',
  'careers',
  'about',
  'contact',
  'charitable',
  'philanthropy',
  'foundation',
  'giving',
  'brochure',
  'factsheet',
  'fact-sheet',
  'products',
  'product',
  'solutions',
  'education',
  'learn',
  'tools',
  'calculator',
  'compare',
  'forms',
  'prospectus',
  'resources',
  'glossary',
  'login',
  'sitemap',
])

export function isArticleCandidateUrl(
  url: string,
  source: Source,
): { ok: true } | { ok: false; reason: SkipReason } {
  if (isSitemapUrl(url)) {
    return { ok: false, reason: 'sitemap_xml' }
  }

  let pathname: string
  try {
    pathname = new URL(url).pathname
  } catch {
    return { ok: false, reason: 'outside_domain' }
  }

  if (source.blockedPathPatterns && source.blockedPathPatterns.length > 0) {
    if (pathMatchesAny(pathname, source.blockedPathPatterns)) {
      return { ok: false, reason: 'blocked_path' }
    }
  }

  if (pathMatchesGlobalBlocked(pathname)) {
    return { ok: false, reason: 'blocked_path' }
  }

  const sourceDomain = source.domain.toLowerCase()
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.toLowerCase()
    if (!host.endsWith(sourceDomain) && host !== sourceDomain) {
      return { ok: false, reason: 'outside_domain' }
    }
  } catch {
    return { ok: false, reason: 'outside_domain' }
  }

  if (source.allowedPathPatterns && source.allowedPathPatterns.length > 0) {
    if (!pathMatchesAny(pathname, source.allowedPathPatterns)) {
      return { ok: false, reason: 'blocked_path' }
    }
  }

  return { ok: true }
}
