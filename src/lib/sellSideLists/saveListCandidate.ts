import type { SellSideListCandidate } from './types'
import { getStore } from '@/lib/storage'
import { validateListCandidate } from './validateListCandidate'

export interface SaveResult {
  success: boolean
  listId?: string
  errors: string[]
  warnings: string[]
}

export async function saveListCandidate(candidate: SellSideListCandidate): Promise<SaveResult> {
  const validation = validateListCandidate(candidate)
  if (!validation.valid) {
    return { success: false, errors: validation.errors, warnings: validation.warnings }
  }

  const store = getStore()
  const slug = slugify([candidate.institution, candidate.listName, candidate.year].filter(Boolean).join(' '))

  const existing = await store.getConvictionList(slug)
  if (existing) {
    return { success: false, errors: ['A list with this slug already exists.'], warnings: validation.warnings }
  }

  const list = await store.createConvictionList({
    slug,
    institution: candidate.institution,
    listName: candidate.listName,
    displayName: candidate.displayName,
    year: candidate.year,
    period: candidate.period,
    theme: candidate.theme,
    sector: candidate.sector,
    region: candidate.region,
    sourceUrl: candidate.sourceUrl,
    sourceType: candidate.sourceType === 'media_summary' ? 'manual' : (candidate.sourceType === 'official_page' ? 'official_page' : candidate.sourceType === 'official_pdf' ? 'official_pdf' : 'manual'),
    accessStatus: 'public',
    confidence: candidate.confidence,
    notes: [candidate.rawSourceExcerpt, `Imported from: ${candidate.importedFrom ?? 'manual'}`].filter(Boolean).join('\n') || undefined,
  })

  for (const [index, member] of candidate.members.entries()) {
    await store.addConvictionListMember({
      convictionListId: list.id,
      ticker: member.ticker.toUpperCase(),
      companyName: member.companyName,
      rank: member.rank ?? index + 1,
      weight: member.rank ? undefined : undefined,
      action: member.action,
      note: member.note,
      sourceText: member.sourceText,
    })
  }

  return { success: true, listId: list.id, errors: [], warnings: validation.warnings }
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}
