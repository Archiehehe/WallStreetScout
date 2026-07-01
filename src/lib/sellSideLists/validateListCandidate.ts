import type { SellSideListCandidate } from './types'

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

export function validateListCandidate(candidate: SellSideListCandidate): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!candidate.institution || !candidate.institution.trim()) {
    errors.push('Institution is required.')
  }

  if (!candidate.listName || !candidate.listName.trim()) {
    errors.push('List name is required.')
  }

  if (!candidate.sourceUrl && !['manual', 'csv', 'paste'].includes(candidate.sourceType)) {
    errors.push('Source URL is required for non-manual source types.')
  }

  const tickerSet = new Set(candidate.members.map((m) => m.ticker.toUpperCase()))
  if (tickerSet.size !== candidate.members.length) {
    warnings.push('Duplicate tickers found and deduplicated.')
  }

  if (tickerSet.size < 3) {
    errors.push('List must have at least 3 validated tickers.')
  }

  if (candidate.theme === undefined && candidate.sector === undefined) {
    warnings.push('No theme or sector specified.')
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}
