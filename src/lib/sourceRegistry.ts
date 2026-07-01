import { SOURCE_MODULES } from '@/lib/source-registry/sources'
import type { Source } from '@/lib/storage/types'
import { isDisallowedMediaDomain } from '@/lib/safety/disallowedDomains'

export type SourceClass = 'primary_institutional' | 'public_institutional_research' | 'manual'

export interface SourceRegistryEntry extends Omit<Source, 'id' | 'createdAt' | 'updatedAt'> {
  id: string
  sourceClass: SourceClass
  defaultEnabled: boolean
  strictEvidenceRequired?: boolean
  allowTickerlessThemePieces?: boolean
  category?: string
  accessNote?: string
  allowedPathPatterns?: string[]
  blockedPathPatterns?: string[]
  preferredDiscoveryMethod?: string
  knownArticleIndexUrls?: string[]
  sourceNeedsUrlPattern?: boolean
  parserKey?: string
  requiresDedicatedParser?: boolean
}

export const CORE_DOMAINS = new Set([
  'morganstanley.com',
  'goldmansachs.com',
  'privatebank.jpmorgan.com',
  'ubs.com',
  'privatebank.bankofamerica.com',
  'schwab.com',
  'fidelity.com',
  'troweprice.com',
  'capitalgroup.com',
  'wellington.com',
  'blackrock.com',
  'franklintempleton.com',
])

export const SOURCE_REGISTRY = SOURCE_MODULES as SourceRegistryEntry[]

export const DEFAULT_ENABLED_SOURCE_REGISTRY = SOURCE_REGISTRY.filter((source) => {
  const domainLower = source.domain.toLowerCase()
  return CORE_DOMAINS.has(domainLower)
})

export function toStarterSource(source: SourceRegistryEntry): Omit<Source, 'id' | 'createdAt' | 'updatedAt'> {
  const domainLower = source.domain.toLowerCase()
  const isCore = CORE_DOMAINS.has(domainLower)
  const isMedia = isDisallowedMediaDomain(domainLower)

  const tier = isMedia ? 'archive' : (isCore ? 'core' : 'secondary')
  const shouldBeEnabled = isCore && !isMedia
  const sourceClass = source.sourceClass === 'manual' || source.sourceClass === 'public_institutional_research'
    ? source.sourceClass
    : 'primary_institutional'

  return {
    name: source.name,
    domain: source.domain,
    sourceType: 'primary',
    sourceClass,
    sourceTier: tier,
    rssUrl: source.rssUrl,
    sitemapUrl: source.sitemapUrl,
    parserType: source.parserType ?? 'generic',
    parserKey: source.parserKey,
    requiresDedicatedParser: source.requiresDedicatedParser,
    enabled: shouldBeEnabled,
    defaultEnabled: shouldBeEnabled,
    strictEvidenceRequired: source.strictEvidenceRequired,
    allowTickerlessThemePieces: source.allowTickerlessThemePieces,
    category: source.category,
    accessNote: source.accessNote,
    knownArticleIndexUrls: source.knownArticleIndexUrls,
    sourceNeedsUrlPattern: source.sourceNeedsUrlPattern,
    qualityScore: source.qualityScore,
    notes: source.notes,
  }
}

export function isMediaDomain(domain: string): boolean {
  return isDisallowedMediaDomain(domain)
}
