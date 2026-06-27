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

for (const source of sources) {
  await sql`
    insert into sources (
      name,
      domain,
      source_type,
      source_class,
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
      ${source.domain.toLowerCase()},
      ${source.sourceType ?? 'primary'},
      ${source.sourceClass ?? 'primary_institutional'},
      ${source.rssUrl ?? null},
      ${source.sitemapUrl ?? null},
      ${source.parserType ?? 'generic'},
      ${source.defaultEnabled ?? source.enabled ?? false},
      ${source.defaultEnabled ?? false},
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

console.log(
  `Synced ${sources.length} primary sources (${sources.filter((source) => source.defaultEnabled).length} default-enabled).`,
)
