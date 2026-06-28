import { readFile } from 'node:fs/promises'
import { neon } from '@neondatabase/serverless'

const databaseUrl = process.env.DATABASE_URL || process.env.STORAGE_URL
if (!databaseUrl) throw new Error('DATABASE_URL must be set. STORAGE_URL is only used as a fallback.')

const filePath = process.argv[2]
if (!filePath) throw new Error('Usage: npm run conviction:import -- ./data/conviction-lists.csv')

const sql = neon(databaseUrl)
const rows = parseCsv(await readFile(filePath, 'utf8'))
const groups = new Map()

for (const row of rows) {
  const institution = required(row.institution, 'institution')
  const listName = required(row.list_name, 'list_name')
  const year = row.year ? Number(row.year) : null
  const key = [institution, listName, year ?? ''].join('|')
  const ticker = normalizeTicker(required(row.ticker, 'ticker'))
  if (!isScreenableTicker(ticker)) throw new Error(`Invalid screenable ticker in CSV: ${row.ticker}`)

  if (!groups.has(key)) {
    const confidence = row.confidence === 'verified' ? 'verified' : 'needs_review'
    if (confidence === 'verified' && !row.source_url) {
      throw new Error(`Verified list requires source_url: ${institution} ${listName}`)
    }
    groups.set(key, {
      institution,
      listName,
      year,
      period: row.period || null,
      theme: row.theme || null,
      sector: row.sector || null,
      region: row.region || null,
      sourceUrl: row.source_url || null,
      confidence,
      members: [],
    })
  }

  groups.get(key).members.push({
    ticker,
    companyName: row.company_name || null,
    rank: row.rank ? Number(row.rank) : null,
    note: row.note || null,
  })
}

let importedLists = 0
let importedTickers = 0
for (const group of groups.values()) {
  const uniqueMembers = dedupeMembers(group.members)
  if (uniqueMembers.length < 5) {
    throw new Error(`${group.institution} ${group.listName} has ${uniqueMembers.length} unique tickers; minimum is 5.`)
  }

  const displayName = `${group.institution} ${group.listName}`
  const slug = slugify([group.institution, group.listName, group.year].filter(Boolean).join(' '))
  const sourceType = group.sourceUrl?.toLowerCase().includes('.pdf') ? 'official_pdf' : group.sourceUrl ? 'official_page' : 'manual'
  const [list] = await sql`
    insert into conviction_lists (
      slug, institution, list_name, display_name, year, period, theme, sector,
      region, source_url, source_type, access_status, confidence, updated_at
    )
    values (
      ${slug}, ${group.institution}, ${group.listName}, ${displayName}, ${group.year},
      ${group.period}, ${group.theme}, ${group.sector}, ${group.region}, ${group.sourceUrl},
      ${sourceType}, 'public', ${group.confidence}, now()
    )
    on conflict (slug) do update set
      institution = excluded.institution,
      list_name = excluded.list_name,
      display_name = excluded.display_name,
      year = excluded.year,
      period = excluded.period,
      theme = excluded.theme,
      sector = excluded.sector,
      region = excluded.region,
      source_url = excluded.source_url,
      source_type = excluded.source_type,
      confidence = excluded.confidence,
      updated_at = now()
    returning id
  `

  for (const member of uniqueMembers) {
    await sql`
      insert into conviction_list_members (conviction_list_id, ticker, company_name, rank, note)
      values (${list.id}, ${member.ticker}, ${member.companyName}, ${member.rank}, ${member.note})
      on conflict (conviction_list_id, ticker) do update set
        company_name = excluded.company_name,
        rank = excluded.rank,
        note = excluded.note
    `
    importedTickers++
  }
  importedLists++
}

console.log(`Imported ${importedLists} conviction list(s) with ${importedTickers} ticker rows.`)

function parseCsv(input) {
  const lines = input.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean)
  const headers = splitCsvLine(lines.shift() ?? '').map((header) => header.trim())
  return lines.map((line) => {
    const values = splitCsvLine(line)
    return Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() ?? '']))
  })
}

function splitCsvLine(line) {
  const result = []
  let current = ''
  let quoted = false
  for (let index = 0; index < line.length; index++) {
    const char = line[index]
    if (char === '"' && line[index + 1] === '"') {
      current += '"'
      index++
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === ',' && !quoted) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

function required(value, field) {
  if (!value) throw new Error(`CSV field required: ${field}`)
  return value.trim()
}

function normalizeTicker(ticker) {
  return ticker.trim().replace(/^\$/, '').toUpperCase()
}

function isScreenableTicker(ticker) {
  const stoplist = new Set(['HICP', 'APP', 'PEPP', 'NLP', 'RAFT', 'IG', 'OAS', 'ECB', 'CPI', 'GDP', 'PMI', 'AI', 'ETF', 'ETFS', 'ESG', 'SMA', 'NAV', 'AUM', 'BTC', 'ETH', 'SPY', 'QQQ'])
  return /^[A-Z][A-Z0-9.-]{0,4}$/.test(ticker) && !stoplist.has(ticker)
}

function dedupeMembers(members) {
  const byTicker = new Map()
  for (const member of members) {
    if (!byTicker.has(member.ticker)) byTicker.set(member.ticker, member)
  }
  return Array.from(byTicker.values())
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}
