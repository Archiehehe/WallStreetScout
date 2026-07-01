import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL || process.env.STORAGE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL must be set. STORAGE_URL is only used as a fallback.')
}

const sql = neon(databaseUrl)

async function printSection(title) {
  console.log(`\n=== ${title} ===`);
}

async function runAudit() {
  try {
    console.log('Starting Database Audit...');

    // 1. Source Totals
    const [sourceTotals] = await sql`
      SELECT 
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE enabled AND source_tier = 'core')::int AS enabled_core,
        COUNT(*) FILTER (WHERE enabled AND source_tier = 'secondary')::int AS enabled_secondary,
        COUNT(*) FILTER (WHERE enabled AND source_tier = 'archive')::int AS enabled_archive,
        COUNT(*) FILTER (WHERE enabled AND source_class = 'primary_institutional')::int AS primary_institutional,
        COUNT(*) FILTER (WHERE enabled AND source_class = 'public_institutional_research')::int AS public_research,
        COUNT(*) FILTER (WHERE enabled AND source_class = 'manual')::int AS manual
      FROM sources
    `;
    printSection('Source totals');
    console.table([sourceTotals]);

    // 2. Enabled Sources Breakdown
    const enabledSources = await sql`
      SELECT name, domain, source_class, source_tier, enabled, default_enabled
      FROM sources
      WHERE enabled = true
      ORDER BY source_tier, name
    `;
    printSection('Enabled sources');
    console.table(enabledSources);

    // 3. Articles by Source/Status
    const articleBySource = await sql`
      SELECT 
        s.name, 
        s.domain, 
        s.source_class, 
        s.source_tier, 
        a.status, 
        COUNT(a.id)::int as count
      FROM sources s
      LEFT JOIN articles a ON s.id = a.source_id
      GROUP BY s.name, s.domain, s.source_class, s.source_tier, a.status
      ORDER BY s.name, a.status
    `;
    printSection('Articles by source/status');
    console.table(articleBySource);

    // 4. Latest Per-Source Scan Summary
    const latestScanResults = await sql`
      SELECT DISTINCT ON (source_id)
        source_id,
        source_name,
        source_domain,
        source_tier,
        status,
        urls_found,
        urls_attempted,
        saved_count,
        rejected_count,
        failed_count,
        error,
        started_at
      FROM source_scan_results
      ORDER BY source_id, started_at DESC
    `;
    printSection('Latest per-source scan summary');
    console.table(latestScanResults);

    // 5. Rejection Categories (from scan_url_results)
    try {
      const urlRejections = await sql`
        SELECT 
          rejection_category, 
          COUNT(*)::int as count,
          MAX(source_name) as example_source,
          MAX(url) as example_url
        FROM scan_url_results
        WHERE status = 'rejected' AND rejection_category IS NOT NULL
        GROUP BY rejection_category
        ORDER BY count DESC
      `;
      printSection('Rejection breakdown (scan_url_results)');
      console.table(urlRejections);
    } catch {
      console.log('\n[!] scan_url_results rejection query failed:', e.message);
    }

    // 5b. Rejection reasons (from articles table)
    try {
      const articleRejectionsByReason = await sql`
        SELECT 
          rejection_reason as rejection_category, 
          COUNT(*)::int as count,
          MAX(s.name) as example_source
        FROM articles a
        LEFT JOIN sources s ON s.id = a.source_id
        WHERE a.status = 'rejected' AND a.rejection_reason IS NOT NULL
        GROUP BY a.rejection_reason
        ORDER BY count DESC
      `;
      printSection('Rejection reasons (articles table)');
      console.table(articleRejectionsByReason);
    } catch {
      console.log('\n[!] Articles rejection query failed:', e.message);
    }

    // 6. Failure Categories (from articles)
    try {
      const failures = await sql`
        SELECT 
          LEFT(rejection_reason, 80) as error_prefix, 
          COUNT(*)::int as count
        FROM articles
        WHERE status = 'rejected' AND rejection_reason IS NOT NULL
        GROUP BY LEFT(rejection_reason, 80)
        ORDER BY count DESC
        LIMIT 20
      `;
      printSection('Failure categories (articles)');
      console.table(failures);
    } catch {
      console.log('\n[!] Articles failure query failed:', e.message);
    }

    // 7. URL Discovery Method (from scan_url_results if it exists)
    try {
      const discoveryMethods = await sql`
        SELECT 
          url_discovery_method, 
          COUNT(*)::int as count
        FROM scan_url_results
        GROUP BY url_discovery_method
        ORDER BY count DESC
      `;
      printSection('URL discovery method breakdown');
      console.table(discoveryMethods);
    } catch {
      console.log('\n[!] scan_url_results table not found. Skipping discovery method audit.');
    }

    // 8. Rejection breakdown by reason (from articles table)
    try {
      const articleRejections = await sql`
        SELECT 
          rejection_reason as reason,
          COUNT(*)::int as count,
          MAX(s.name) as example_source,
          MAX(a.title) as example_title
        FROM articles a
        LEFT JOIN sources s ON s.id = a.source_id
        WHERE a.status = 'rejected' AND a.rejection_reason IS NOT NULL
        GROUP BY a.rejection_reason
        ORDER BY count DESC
      `;
      printSection('Rejection breakdown by reason (articles table)');
      console.table(articleRejections);
    } catch {
      console.log('\n[!] Articles rejection analysis failed:', e.message);
    }

    // 8c. Failure breakdown from scan_url_results
    try {
      const urlFailures = await sql`
        SELECT 
          LEFT(error, 80) as error_prefix,
          COUNT(*)::int as count,
          MAX(source_name) as example_source,
          MAX(url) as example_url,
          MAX(http_status) as example_http_status
        FROM scan_url_results
        WHERE status = 'failed' AND error IS NOT NULL
        GROUP BY LEFT(error, 80)
        ORDER BY count DESC
      `;
      printSection('Failure breakdown (scan_url_results)');
      console.table(urlFailures);
    } catch {
      console.log('\n[!] scan_url_results failure analysis failed:', e.message);
    }

    // 9. Core source health check
    const expectedCoreDomains = [
      'goldmansachs.com', 'morganstanley.com', 'jpmorgan.com', 'privatebank.jpmorgan.com',
      'ubs.com', 'privatebank.bankofamerica.com', 'dbresearch.com', 'sc.com',
      'think.ing.com', 'wellsfargo.com', 'blackrock.com', 'pimco.com',
      'vanguard.com', 'schwab.com', 'fidelity.com', 'troweprice.com',
      'capitalgroup.com', 'franklintempleton.com', 'invesco.com', 'ssga.com',
      'wellington.com', 'aqr.com', 'researchaffiliates.com', 'gmo.com',
      'amundi.com', 'schroders.com', 'apollo.com', 'kkr.com',
      'aresmgmt.com', 'oaktreecapital.com', 'brookfield.com', 'carlyle.com',
      'blueowl.com', 'hamiltonlane.com', 'bridgewater.com', 'man.com',
      'twosigma.com', 'janestreet.com', 'lazardassetmanagement.com', 'northerntrust.com',
    ];
    const coreStatus = await sql`
      SELECT name, domain, enabled, source_tier
      FROM sources
      WHERE lower(domain) = ANY(${expectedCoreDomains})
      ORDER BY name
    `;
    printSection('Core source status');
    console.table(coreStatus);

    const disabledCore = coreStatus.filter(r => !r.enabled);
    const missingCore = expectedCoreDomains.filter(d => !coreStatus.some(r => r.domain === d));
    if (disabledCore.length > 0) {
      console.log(`\n[!] DISABLED core sources: ${disabledCore.map(r => r.name).join(', ')}`);
    }
    if (missingCore.length > 0) {
      console.log(`\n[!] MISSING core domains: ${missingCore.join(', ')}`);
    }

    // 10. Latest scan URL results summary
    try {
      const latestScanRun = await sql`
        SELECT id, started_at, status
        FROM scan_runs
        ORDER BY started_at DESC
        LIMIT 1
      `;
      if (latestScanRun.length > 0) {
        const scanId = latestScanRun[0].id;
        const urlSummary = await sql`
          SELECT 
            status,
            COUNT(*)::int as count
          FROM scan_url_results
          WHERE scan_run_id = ${scanId}
          GROUP BY status
        `;
        printSection('Latest scan URL results by status');
        console.table(urlSummary);
      }
    } catch {
      console.log('\n[!] Could not query scan_url_results:', e.message);
    }

  } catch (error) {
    console.error('Audit failed:', error);
    process.exit(1);
  }
}

runAudit();
