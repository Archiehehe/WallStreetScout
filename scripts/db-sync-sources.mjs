import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { neon } from '@neondatabase/serverless'

const databaseUrl = process.env.DATABASE_URL || process.env.STORAGE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL must be set. STORAGE_URL is only used as a fallback.')
}

const sql = neon(databaseUrl)
const sourceDir = new URL('../src/lib/source-registry/sources/', import.meta.url)
const files = (await readdir(sourceDir))
  .filter((file) => file.endsWith('.json'))
  .sort()
const sources = await Promise.all(
  files.map(async (file) => JSON.parse(await readFile(new URL(path.basename(file), sourceDir), 'utf8'))),
)

const CORE_DOMAINS = new Set([
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

const syncedDomains = new Set()
const coreDomainsSynced = new Set()
for (const source of sources) {
  const domainLower = source.domain.toLowerCase()

  const isCore = CORE_DOMAINS.has(domainLower)
  const tier = isCore ? 'core' : 'secondary'
  const shouldBeEnabled = isCore && (source.enabled !== false)
  const sourceClass = ['primary_institutional', 'public_institutional_research', 'manual'].includes(source.sourceClass)
    ? source.sourceClass
    : 'primary_institutional'

  syncedDomains.add(domainLower)
  if (isCore) coreDomainsSynced.add(domainLower)

  await sql`
    insert into sources (
      name,
      domain,
      source_type,
      source_class,
      source_tier,
      rss_url,
      sitemap_url,
      parser_type,
      parser_key,
      requires_dedicated_parser,
      enabled,
      default_enabled,
      strict_evidence_required,
      allow_tickerless_theme_pieces,
      category,
      access_note,
      allowed_path_patterns,
      blocked_path_patterns,
      preferred_discovery_method,
      known_article_index_urls,
      source_needs_url_pattern,
      quality_score,
      notes,
      updated_at
    )
    values (
      ${source.name},
      ${domainLower},
      ${source.sourceType ?? 'primary'},
      ${sourceClass},
      ${tier},
      ${source.rssUrl ?? null},
      ${source.sitemapUrl ?? null},
      ${source.parserType ?? 'generic'},
      ${source.parserKey ?? null},
      ${source.requiresDedicatedParser ?? false},
      ${shouldBeEnabled},
      ${shouldBeEnabled},
      ${source.strictEvidenceRequired ?? true},
      ${source.allowTickerlessThemePieces ?? false},
      ${source.category ?? null},
      ${source.accessNote ?? null},
      ${source.allowedPathPatterns ?? []},
      ${source.blockedPathPatterns ?? []},
      ${source.preferredDiscoveryMethod ?? null},
      ${source.knownArticleIndexUrls ?? []},
      ${source.sourceNeedsUrlPattern ?? false},
      ${source.qualityScore ?? 5},
      ${source.notes ?? null},
      now()
    )
    on conflict (lower(domain))
    do update set
      name = excluded.name,
      source_type = excluded.source_type,
      source_class = excluded.source_class,
      source_tier = excluded.source_tier,
      rss_url = excluded.rss_url,
      sitemap_url = excluded.sitemap_url,
      parser_type = excluded.parser_type,
      parser_key = excluded.parser_key,
      requires_dedicated_parser = excluded.requires_dedicated_parser,
      enabled = excluded.enabled,
      default_enabled = excluded.default_enabled,
      strict_evidence_required = excluded.strict_evidence_required,
      allow_tickerless_theme_pieces = excluded.allow_tickerless_theme_pieces,
      category = excluded.category,
      access_note = excluded.access_note,
      allowed_path_patterns = excluded.allowed_path_patterns,
      blocked_path_patterns = excluded.blocked_path_patterns,
      preferred_discovery_method = excluded.preferred_discovery_method,
      known_article_index_urls = excluded.known_article_index_urls,
      source_needs_url_pattern = excluded.source_needs_url_pattern,
      quality_score = excluded.quality_score,
      notes = excluded.notes,
      updated_at = now()
  `
}

await sql`
  update sources
  set enabled = false,
      default_enabled = false,
      source_tier = 'secondary',
      updated_at = now()
  where lower(domain) <> all(${Array.from(CORE_DOMAINS)})
`

const [coreEnabled] = await sql`
  select count(*)::int as count
  from sources
  where enabled = true and source_tier = 'core'
`
const duplicateRows = await sql`
  select lower(domain) as domain, count(*)::int as count
  from sources
  group by lower(domain)
  having count(*) > 1
`
const coreRows = await sql`
  select name, domain, enabled, parser_key, parser_type
  from sources
  where lower(domain) = any(${Array.from(CORE_DOMAINS)})
  order by name
`
const enabledCoreDomains = new Set(coreRows.filter((row) => row.enabled).map((row) => String(row.domain).toLowerCase()))
const missingCoreDomains = Array.from(CORE_DOMAINS).filter((domain) => !enabledCoreDomains.has(domain))
const enabledWithoutParser = coreRows.filter((row) => row.enabled && !row.parser_key && row.parser_type !== 'dedicated')

console.log(`Synced ${syncedDomains.size} institutional source domains (${coreDomainsSynced.size} core registry domains).`)
console.log(`Expected default-enabled sources: ${CORE_DOMAINS.size}`)
console.log(`Actual core enabled sources: ${Number(coreEnabled.count)}`)
console.log(`Duplicate domains: ${duplicateRows.length}`)

if (missingCoreDomains.length > 0) {
  console.log(`Missing/disabled core domains: ${missingCoreDomains.join(', ')}`)
}

if (enabledWithoutParser.length > 0) {
  console.log(`WARNING: Enabled sources without dedicated parser:`)
  for (const row of enabledWithoutParser) {
    console.log(`  - ${row.name} (${row.domain}) parser_type=${row.parser_type} parser_key=${row.parser_key ?? 'null'}`)
  }
}

if (Number(coreEnabled.count) !== CORE_DOMAINS.size || duplicateRows.length > 0) {
  process.exitCode = 1
}
