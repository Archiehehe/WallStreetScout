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
}

export const SOURCE_REGISTRY = SOURCE_MODULES as SourceRegistryEntry[]

export const DEFAULT_ENABLED_SOURCE_REGISTRY = SOURCE_REGISTRY.filter((source) => source.defaultEnabled)

export function toStarterSource(source: SourceRegistryEntry): Omit<Source, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    name: source.name,
    domain: source.domain,
    sourceType: 'primary',
    sourceClass: source.sourceClass,
    rssUrl: source.rssUrl,
    sitemapUrl: source.sitemapUrl,
    parserType: source.parserType ?? 'generic',
    enabled: source.defaultEnabled,
    defaultEnabled: source.defaultEnabled,
    strictEvidenceRequired: source.strictEvidenceRequired,
    allowTickerlessThemePieces: source.allowTickerlessThemePieces,
    category: source.category,
    accessNote: source.accessNote,
    qualityScore: source.qualityScore,
    notes: source.notes,
  }
}
