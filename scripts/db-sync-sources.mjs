import { readFile } from 'node:fs/promises'
import { neon } from '@neondatabase/serverless'

const databaseUrl = process.env.DATABASE_URL || process.env.STORAGE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL must be set. STORAGE_URL is only used as a fallback.')
}

const sql = neon(databaseUrl)
const sources = JSON.parse(await readFile(new URL('../db/starter-sources.json', import.meta.url), 'utf8'))

for (const source of sources) {
  await sql`
    insert into sources (
      name,
      domain,
      source_type,
      rss_url,
      sitemap_url,
      parser_type,
      enabled,
      quality_score,
      notes,
      updated_at
    )
    values (
      ${source.name},
      ${source.domain.toLowerCase()},
      ${source.sourceType},
      ${source.rssUrl ?? null},
      ${source.sitemapUrl ?? null},
      ${source.parserType ?? 'generic'},
      ${source.enabled ?? true},
      ${source.qualityScore ?? 5},
      ${source.notes ?? null},
      now()
    )
    on conflict (lower(domain))
    do update set
      name = excluded.name,
      source_type = excluded.source_type,
      rss_url = excluded.rss_url,
      sitemap_url = excluded.sitemap_url,
      parser_type = excluded.parser_type,
      enabled = excluded.enabled,
      quality_score = excluded.quality_score,
      notes = excluded.notes,
      updated_at = now()
  `
}

console.log(`Synced ${sources.length} primary sources.`)
