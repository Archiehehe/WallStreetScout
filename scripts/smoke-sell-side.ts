import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { validateListCandidate } from '../src/lib/sellSideLists/validateListCandidate'

process.env.WALLSTREETSCOUT_USE_LOCAL_STORE = '1'

async function main() {
  const samplePath = path.join(process.cwd(), 'public', 'conviction-lists.example.csv')
  const source = await readFile(samplePath, 'utf8')
  const lines = source.split(/\r?\n/).filter(Boolean)
  const rows = lines.slice(1).map((line) => line.split(','))

  const institution = rows[0]?.[0] ?? 'Sample Desk'
  const listName = rows[0]?.[1] ?? 'Sample List'
  const members = rows.slice(0, 3).map((row) => ({
    ticker: row[9]?.trim() ?? '',
    companyName: row[10]?.trim() ?? undefined,
    rank: Number(row[11] ?? 0),
    note: row[12]?.trim() ?? undefined,
  })).filter((member) => member.ticker)

  const validation = validateListCandidate({
    institution,
    listName,
    displayName: `${institution} ${listName}`.trim(),
    sourceType: 'csv',
    confidence: 'needs_review',
    reviewStatus: 'needs_review',
    members,
  })

  if (!validation.valid) {
    console.error('Sell-side smoke check failed:', validation.errors)
    process.exit(1)
  }

  console.log('Sell-side smoke check passed:', members.length, 'candidate members parsed')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
