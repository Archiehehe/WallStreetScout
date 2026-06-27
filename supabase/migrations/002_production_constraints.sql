-- Production hardening for dynamic, Supabase-backed data.
-- Apply after 001_create_tables.sql.
--
-- RLS note for the MVP:
-- The app uses Supabase from Next.js route handlers on the server. Keep finance
-- provider keys and SUPABASE_SERVICE_ROLE_KEY server-only. If you enable RLS,
-- either use the service role key only from route handlers or add policies that
-- allow the app's authenticated admin role to read/write these tables.

CREATE UNIQUE INDEX IF NOT EXISTS idx_sources_domain_unique
  ON sources (lower(domain));

CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_url_unique
  ON articles (lower(url));

CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_canonical_url_unique
  ON articles (lower(canonical_url))
  WHERE canonical_url IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_duplicate_key_unique
  ON articles (duplicate_key)
  WHERE duplicate_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_article_extractions_article_unique
  ON article_extractions (article_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ideas_article_ticker_unique
  ON ideas (article_id, ticker);

CREATE UNIQUE INDEX IF NOT EXISTS idx_basket_members_basket_ticker_unique
  ON basket_members (basket_id, ticker);

CREATE UNIQUE INDEX IF NOT EXISTS idx_watchlist_ticker_unique
  ON watchlist (ticker);

CREATE INDEX IF NOT EXISTS idx_articles_created_at
  ON articles (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_articles_source_id
  ON articles (source_id);

CREATE INDEX IF NOT EXISTS idx_article_extractions_firm
  ON article_extractions (firm);

CREATE INDEX IF NOT EXISTS idx_article_extractions_theme
  ON article_extractions (theme);

CREATE INDEX IF NOT EXISTS idx_article_extractions_sector
  ON article_extractions (sector);

CREATE INDEX IF NOT EXISTS idx_article_extractions_region
  ON article_extractions (region);

CREATE INDEX IF NOT EXISTS idx_baskets_created_at
  ON baskets (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_metrics_snapshots_ticker
  ON metrics_snapshots (ticker);

CREATE INDEX IF NOT EXISTS idx_scan_runs_started_at
  ON scan_runs (started_at DESC);
