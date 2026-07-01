import { SOURCE_MODULES } from '@/lib/source-registry/sources'
import type { Source } from '@/lib/storage/types'

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
}

export const CORE_DOMAINS = new Set([
  'goldmansachs.com',
  'morganstanley.com',
  'jpmorgan.com',
  'privatebank.jpmorgan.com',
  'ubs.com',
  'privatebank.bankofamerica.com',
  'dbresearch.com',
  'sc.com',
  'think.ing.com',
  'wellsfargo.com',
  'blackrock.com',
  'pimco.com',
  'vanguard.com',
  'schwab.com',
  'fidelity.com',
  'troweprice.com',
  'capitalgroup.com',
  'franklintempleton.com',
  'invesco.com',
  'ssga.com',
  'wellington.com',
  'aqr.com',
  'researchaffiliates.com',
  'gmo.com',
  'amundi.com',
  'schroders.com',
  'apollo.com',
  'kkr.com',
  'aresmgmt.com',
  'oaktreecapital.com',
  'brookfield.com',
  'carlyle.com',
  'blueowl.com',
  'hamiltonlane.com',
  'bridgewater.com',
  'man.com',
  'twosigma.com',
  'janestreet.com',
  'lazardassetmanagement.com',
  'northerntrust.com',
])

export const MEDIA_BLACKLIST = new Set([
  'cnbc.com',
  'benzinga.com',
  'seekingalpha.com',
  'finance.yahoo.com',
  'yahoo.com',
  'marketwatch.com',
  'reuters.com',
  'investing.com',
  'tipranks.com',
  'thefly.com',
  'stockanalysis.com',
  'marketbeat.com',
  'streetinsider.com',
  'gurufocus.com',
])

export const SOURCE_REGISTRY = SOURCE_MODULES as SourceRegistryEntry[]

export const DEFAULT_ENABLED_SOURCE_REGISTRY = SOURCE_REGISTRY.filter((source) => {
  const domainLower = source.domain.toLowerCase()
  const isCore = CORE_DOMAINS.has(domainLower)
  const isMedia = isMediaDomain(domainLower)
  return isCore && !isMedia
})

export function toStarterSource(source: SourceRegistryEntry): Omit<Source, 'id' | 'createdAt' | 'updatedAt'> {
  const domainLower = source.domain.toLowerCase()
  const isCore = CORE_DOMAINS.has(domainLower)
  const isMedia = isMediaDomain(domainLower)

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
    enabled: shouldBeEnabled,
    defaultEnabled: shouldBeEnabled,
    strictEvidenceRequired: source.strictEvidenceRequired,
    allowTickerlessThemePieces: source.allowTickerlessThemePieces,
    category: source.category,
    accessNote: source.accessNote,
    allowedPathPatterns: source.allowedPathPatterns,
    blockedPathPatterns: source.blockedPathPatterns,
    preferredDiscoveryMethod: source.preferredDiscoveryMethod,
    qualityScore: source.qualityScore,
    notes: source.notes,
  }
}

export function isMediaDomain(domain: string): boolean {
  const normalized = domain.toLowerCase()
  return Array.from(MEDIA_BLACKLIST).some((blocked) => (
    normalized === blocked || normalized.endsWith(`.${blocked}`)
  ))
}
