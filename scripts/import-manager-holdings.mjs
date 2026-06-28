import { neon } from '@neondatabase/serverless'

const databaseUrl = process.env.DATABASE_URL || process.env.STORAGE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL must be set. STORAGE_URL is only used as a fallback.')
}

const args = parseArgs(process.argv.slice(2))
const managerSlug = required(args.manager, '--manager')
const filingPeriod = required(args.filingPeriod, '--filing-period')
const holdings = parseHoldings(required(args.holdings, '--holdings'))
const sql = neon(databaseUrl)

const managers = await sql`
  select id, name
  from managers
  where slug = ${managerSlug}
  limit 1
`

if (managers.length === 0) {
  throw new Error(`Manager not found: ${managerSlug}. Add it to managers before importing holdings.`)
}

const manager = managers[0]
for (const holding of holdings) {
  await sql`
    insert into manager_holdings (
      manager_id,
      filing_period,
      ticker,
      weight_pct,
      action,
      source,
      source_url
    )
    values (
      ${manager.id},
      ${filingPeriod},
      ${holding.ticker},
      ${holding.weightPct},
      ${holding.action},
      'manual',
      ${args.sourceUrl ?? null}
    )
    on conflict (manager_id, filing_period, ticker) do update set
      weight_pct = excluded.weight_pct,
      action = excluded.action,
      source = excluded.source,
      source_url = excluded.source_url
  `
}

console.log(`Imported ${holdings.length} reported 13F holdings for ${manager.name} (${filingPeriod}).`)

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

function parseHoldings(value) {
  const allowedActions = new Set(['new', 'increased', 'reduced', 'sold_out', 'unchanged', 'unknown'])
  return value.split(',').map((entry) => {
    const [tickerRaw, weightRaw, actionRaw = 'unknown'] = entry.split(':')
    const ticker = tickerRaw.trim().toUpperCase().replace(/[^A-Z0-9.-]/g, '')
    const weightPct = Number(weightRaw)
    const action = actionRaw.trim()

    if (!ticker) throw new Error(`Invalid holding entry: ${entry}`)
    if (!Number.isFinite(weightPct)) throw new Error(`Invalid weight for ${ticker}: ${weightRaw}`)
    if (!allowedActions.has(action)) throw new Error(`Invalid action for ${ticker}: ${action}`)

    return { ticker, weightPct, action }
  })
}
