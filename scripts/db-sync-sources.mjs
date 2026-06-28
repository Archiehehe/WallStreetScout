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

const MEDIA_BLACKLIST = new Set([
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

// Delete media sources from the DB
for (const blockedDomain of MEDIA_BLACKLIST) {
  await sql`
    delete from sources
    where lower(domain) = ${blockedDomain}
       or lower(domain) like ${`%.${blockedDomain}`}
  `
}

const syncedDomains = new Set()
const coreDomainsSynced = new Set()
for (const source of sources) {
  const domainLower = source.domain.toLowerCase()
  
  // Skip media sources completely
  if (isMediaDomain(domainLower)) continue

  const isCore = CORE_DOMAINS.has(domainLower)
  const tier = isCore ? 'core' : 'secondary'
  const shouldBeEnabled = isCore
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
      enabled,
      default_enabled,
      strict_evidence_required,
      allow_tickerless_theme_pieces,
      category,
      access_note,
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
      ${shouldBeEnabled},
      ${shouldBeEnabled},
      ${source.strictEvidenceRequired ?? true},
      ${source.allowTickerlessThemePieces ?? false},
      ${source.category ?? null},
      ${source.accessNote ?? null},
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
      enabled = excluded.enabled,
      default_enabled = excluded.default_enabled,
      strict_evidence_required = excluded.strict_evidence_required,
      allow_tickerless_theme_pieces = excluded.allow_tickerless_theme_pieces,
      category = excluded.category,
      access_note = excluded.access_note,
      quality_score = excluded.quality_score,
      notes = excluded.notes,
      updated_at = now()
  `
}

await sql`
  update sources
  set enabled = false,
      default_enabled = false,
      source_tier = case when source_tier = 'archive' then 'archive' else 'secondary' end,
      updated_at = now()
  where lower(domain) <> all(${Array.from(CORE_DOMAINS)})
`

console.log(
  `Synced ${syncedDomains.size} institutional source domains (${coreDomainsSynced.size} core default-enabled).`,
)

function isMediaDomain(domain) {
  return Array.from(MEDIA_BLACKLIST).some((blocked) => (
    domain === blocked || domain.endsWith(`.${blocked}`)
  ))
}
