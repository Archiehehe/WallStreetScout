import type { SellSideListCandidate, SellSideListMember } from './types'
import { normalizeTicker, isScreenableEquityTicker } from '@/lib/utils/screenableTicker'

export function parsePastedList(text: string): Partial<SellSideListCandidate> {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const header = lines[0] ?? ''
  const tickerLines = lines.slice(1)

  const institution = guessInstitution(header)
  const listName = guessListName(header, institution)
  const period = guessPeriod(header)
  const year = guessYear(header)
  const members: SellSideListMember[] = []

  for (const line of tickerLines) {
    const parsed = parseTickerLine(line)
    if (parsed) members.push(parsed)
  }

  return {
    institution,
    listName,
    displayName: `${institution} ${listName}`.trim(),
    period: period ?? undefined,
    year,
    members,
    sourceType: 'paste',
    confidence: 'needs_review',
  }
}

function guessInstitution(header: string): string {
  const known = [
    'BofA', 'Bank of America', 'Morgan Stanley', 'Goldman Sachs',
    'JPMorgan', 'J.P. Morgan', 'UBS', 'Citi', 'Jefferies',
    'Barclays', 'Evercore', 'Piper Sandler', 'BTIG',
    'Oppenheimer', 'Mizuho', 'Bernstein', 'Raymond James',
    'RBC', 'Wells Fargo', 'Deutsche Bank',
  ]
  for (const name of known) {
    if (header.toLowerCase().includes(name.toLowerCase())) return name
  }
  return 'Unknown Institution'
}

function guessListName(header: string, institution: string): string {
  let remainder = header
  if (institution !== 'Unknown Institution') {
    remainder = header.replace(new RegExp(institution, 'i'), '').trim()
  }
  return remainder.replace(/\s+/g, ' ').trim() || 'Untitled List'
}

function guessPeriod(header: string): string | null {
  const periodMatch = header.match(/\b(H[12]|Q[1-4])\b/i)
  return periodMatch ? periodMatch[1].toUpperCase() : null
}

function guessYear(header: string): number | undefined {
  const yearMatch = header.match(/\b(20\d{2})\b/)
  return yearMatch ? parseInt(yearMatch[1], 10) : undefined
}

function parseTickerLine(line: string): SellSideListMember | null {
  const cleaned = line.replace(/^[-*\d.]+\)?\s*/, '').trim()
  const parts = cleaned.split(/\s+-\s+/)
  let ticker = parts[0]?.trim().toUpperCase() ?? ''
  let companyName: string | undefined

  if (parts.length > 1 && parts[1]) {
    companyName = parts.slice(1).join(' - ').trim()
  }

  const actionMatch = ticker.match(/\(([^)]+)\)$/)
  let action: SellSideListMember['action'] = 'unknown'
  if (actionMatch) {
    const a = actionMatch[1].toLowerCase()
    if (a.includes('buy') || a.includes('overweight')) action = 'buy'
    else if (a.includes('sell') || a.includes('underweight')) action = 'sell'
    else if (a.includes('underperform')) action = 'underperform'
    ticker = ticker.replace(/\([^)]+\)$/, '').trim()
  }

  ticker = normalizeTicker(ticker)
  if (!ticker || !isScreenableEquityTicker(ticker)) return null

  return { ticker, companyName, action }
}
