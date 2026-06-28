import { neon } from '@neondatabase/serverless'

if (!process.argv.includes('--confirm')) {
  throw new Error('Cleanup requires explicit confirmation: node scripts/cleanup-generic-pages.mjs --confirm')
}

const databaseUrl = process.env.DATABASE_URL || process.env.STORAGE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL must be set. STORAGE_URL is only used as a fallback.')
}

const sql = neon(databaseUrl)

const hardRejected = await sql`
  update articles
  set status = 'rejected',
      rejection_reason = case
        when title ~* '(compare|comparison tool|calculator|screener|fund comparison)' then 'rejected_tool_page'
        when title ~* '(ETF[s]? vs[.]? mutual funds?|ETF basics|mutual funds?|funds?|SMAs?|commingled funds?|prospectus)' then 'rejected_fund_or_etf_page'
        when title ~* '(what is|how to|guide|learn|education|investing basics|glossary|retirement|account|fees|forms)' then 'rejected_education_page'
        when title ~* '(ESG investing|responsible investing|sustainable investing overview)' then 'rejected_generic_marketing_page'
        when title ~* '(product|solutions|strategies|institutional solutions|advisor resources|client resources)' then 'rejected_product_page'
        when url ~* '/(education|learn|how-to|investing-basics|glossary)(/|$)' then 'rejected_education_page'
        when url ~* '/(tools?|calculator|compare|comparison)(/|$)' then 'rejected_tool_page'
        when url ~* '/(funds?|etfs?|mutual-funds)(/|$)' then 'rejected_fund_or_etf_page'
        when url ~* '/(products?|solutions|strategies|resources|advisor-resources|client-resources)(/|$)' then 'rejected_product_page'
        when url ~* '/(esg-investing)(/|$)' then 'rejected_generic_marketing_page'
        else 'rejected_not_research_idea'
      end,
      updated_at = now()
  where status = 'saved'
    and (
      title ~* '(compare|comparison tool|calculator|screener|fund comparison|ETF[s]? vs[.]? mutual funds?|ETF basics|mutual funds?|funds?|SMAs?|commingled funds?|prospectus|what is|how to|guide|learn|education|investing basics|glossary|retirement|account|fees|forms|ESG investing|responsible investing|sustainable investing overview|product|solutions|strategies|institutional solutions|advisor resources|client resources)'
      or url ~* '/(education|learn|how-to|investing-basics|glossary|tools?|calculator|compare|comparison|funds?|etfs?|mutual-funds|products?|solutions|strategies|resources|advisor-resources|client-resources|esg-investing)(/|$)'
    )
  returning id
`

const mediaRejected = await sql`
  update articles a
  set status = 'rejected',
      rejection_reason = 'rejected_media_source_not_allowed',
      updated_at = now()
  from sources s
  where a.source_id = s.id
    and a.status = 'saved'
    and (
      lower(s.domain) = any(${[
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
      ]})
      or lower(s.name) ~ '(cnbc|benzinga|seeking alpha|yahoo finance|marketwatch|reuters|investing.com|tipranks|the fly|stockanalysis|marketbeat|streetinsider|gurufocus)'
    )
  returning a.id
`

const lowTickerRejected = await sql`
  update articles a
  set status = 'rejected',
      rejection_reason = 'rejected_fewer_than_3_screenable_tickers',
      updated_at = now()
  from article_extractions e
  where e.article_id = a.id
    and a.status = 'saved'
    and (
      (jsonb_array_length(e.screenable_tickers) > 0 and jsonb_array_length(e.screenable_tickers) < 3)
      or (jsonb_array_length(e.screenable_tickers) = 0 and jsonb_array_length(e.extracted_tickers) < 3)
    )
  returning a.id
`

const exampleRows = await sql`
  select title
  from articles
  where status = 'saved'
    and title = any(${[
      'ETFs vs. Mutual Funds: Which To Choose | Vanguard',
      'Compare ETFs - Fund Comparison Tool | Vanguard',
      'How to Invest - Institutional, SMAs & Commingled Funds | Research Affiliates',
      'ESG Investing | Research Affiliates',
    ]})
`

console.log(`Hard-rejected generic pages: ${hardRejected.length}`)
console.log(`Rejected media-source rows: ${mediaRejected.length}`)
console.log(`Rejected fewer-than-3 ticker rows: ${lowTickerRejected.length}`)
console.log(`Blocked example rows still saved: ${exampleRows.length}`)
