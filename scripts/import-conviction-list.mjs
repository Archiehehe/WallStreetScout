import { neon } from '@neondatabase/serverless'

const databaseUrl = process.env.DATABASE_URL || process.env.STORAGE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL must be set. STORAGE_URL is only used as a fallback.')
}

const args = parseArgs(process.argv.slice(2))
const institution = required(args.institution, '--institution')
const listName = required(args.name, '--name')
const tickers = parseTickers(required(args.tickers, '--tickers'))

if (tickers.length < 5) {
  throw new Error('Conviction Lists require at least 5 screenable public equity tickers.')
}

const sourceType = args.sourceType ?? inferSourceType(args.source)
if (!['official_page', 'official_pdf', 'manual', 'api'].includes(sourceType)) {
  throw new Error('--source-type must be official_page, official_pdf, manual, or api.')
}

const confidence = args.confidence ?? 'verified'
if (!['verified', 'needs_review'].includes(confidence)) {
  throw new Error('--confidence must be verified or needs_review.')
}

const displayName = args.displayName ?? `${institution} ${listName}`
const slug = args.slug ?? slugify(displayName)
const sql = neon(databaseUrl)

const rows = await sql`
  insert into conviction_lists (
    slug,
    institution,
    list_name,
    display_name,
    year,
    period,
    theme,
    sector,
    region,
    source_url,
    source_type,
    access_status,
    confidence,
    notes,
    updated_at
  )
  values (
    ${slug},
    ${institution},
    ${listName},
    ${displayName},
    ${args.year ? Number(args.year) : null},
    ${args.period ?? null},
    ${args.theme ?? null},
    ${args.sector ?? null},
    ${args.region ?? null},
    ${args.source ?? null},
    ${sourceType},
    ${args.accessStatus ?? 'public'},
    ${confidence},
    ${args.notes ?? null},
    now()
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
    access_status = excluded.access_status,
    confidence = excluded.confidence,
    notes = excluded.notes,
    updated_at = now()
  returning id
`

const listId = rows[0].id
for (const [index, ticker] of tickers.entries()) {
  await sql`
    insert into conviction_list_members (conviction_list_id, ticker, rank)
    values (${listId}, ${ticker}, ${index + 1})
    on conflict (conviction_list_id, ticker) do update set
      rank = excluded.rank
  `
}

console.log(`Imported ${displayName} with ${tickers.length} tickers.`)

function parseArgs(argv) {
  const parsed = {}
  for (let index = 0; index < argv.length; index++) {
    const key = argv[index]
    if (!key.startsWith('--')) continue
    parsed[toCamel(key.slice(2))] = argv[index + 1]
    index++
  }
  return parsed
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_, char) => char.toUpperCase())
}

function required(value, flag) {
  if (!value) throw new Error(`${flag} is required.`)
  return value
}

function parseTickers(value) {
  return Array.from(new Set(
    value
      .split(',')
      .map((ticker) => ticker.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, ''))
      .filter(Boolean),
  ))
}

function inferSourceType(sourceUrl) {
  if (!sourceUrl) return 'manual'
  return /\.pdf($|\?)/i.test(sourceUrl) ? 'official_pdf' : 'official_page'
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
