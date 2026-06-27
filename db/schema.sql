-- WallStreetScout Neon schema
-- Apply with the Vercel/Neon connection that provides DATABASE_URL.

create extension if not exists pgcrypto;

create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text not null,
  source_type text not null default 'primary',
  source_class text not null default 'primary_institutional',
  rss_url text,
  sitemap_url text,
  parser_type text,
  enabled boolean not null default true,
  default_enabled boolean not null default false,
  strict_evidence_required boolean not null default true,
  allow_tickerless_theme_pieces boolean not null default false,
  category text,
  access_note text,
  quality_score integer not null default 5,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table sources alter column id set default gen_random_uuid();
alter table sources add column if not exists source_class text not null default 'primary_institutional';
alter table sources add column if not exists default_enabled boolean not null default false;
alter table sources add column if not exists strict_evidence_required boolean not null default true;
alter table sources add column if not exists allow_tickerless_theme_pieces boolean not null default false;
alter table sources add column if not exists category text;
alter table sources add column if not exists access_note text;

create unique index if not exists idx_sources_domain_unique on sources (lower(domain));

alter table sources alter column source_type set default 'primary';
update sources set source_type = 'primary' where source_type is distinct from 'primary';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sources_source_type_primary_check'
  ) then
    alter table sources
      add constraint sources_source_type_primary_check
      check (source_type = 'primary');
  end if;
end $$;

create table if not exists articles (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references sources(id) on delete set null,
  url text not null,
  canonical_url text,
  title text not null,
  author text,
  published_at timestamptz not null default now(),
  fetched_at timestamptz not null default now(),
  raw_text text,
  cleaned_text text,
  paywall_status text not null default 'unknown',
  duplicate_key text,
  article_score integer not null default 0,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table articles alter column id set default gen_random_uuid();

create unique index if not exists idx_articles_url_unique on articles (lower(url));
create unique index if not exists idx_articles_canonical_url_unique on articles (lower(canonical_url)) where canonical_url is not null;
create unique index if not exists idx_articles_duplicate_key_unique on articles (duplicate_key) where duplicate_key is not null;
create index if not exists idx_articles_score on articles(article_score);
create index if not exists idx_articles_published on articles(published_at desc);
create index if not exists idx_articles_created_at on articles(created_at desc);
create index if not exists idx_articles_source_id on articles(source_id);

create table if not exists article_extractions (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references articles(id) on delete cascade,
  firm text,
  source_type text,
  category text,
  theme text,
  sector text,
  region text,
  summary text,
  reason_shown text,
  extracted_tickers jsonb not null default '[]',
  extracted_companies jsonb not null default '[]',
  score_breakdown jsonb not null default '{}',
  confidence real not null default 0,
  created_at timestamptz not null default now()
);

alter table article_extractions alter column id set default gen_random_uuid();

create unique index if not exists idx_article_extractions_article_unique on article_extractions(article_id);
create index if not exists idx_article_extractions_firm on article_extractions(firm);
create index if not exists idx_article_extractions_theme on article_extractions(theme);
create index if not exists idx_article_extractions_sector on article_extractions(sector);
create index if not exists idx_article_extractions_region on article_extractions(region);

create table if not exists ideas (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references articles(id) on delete cascade,
  ticker text not null,
  company_name text,
  exchange text,
  country text,
  sector text,
  theme text,
  confidence real not null default 0,
  is_in_watchlist boolean not null default false,
  is_in_portfolio boolean not null default false,
  created_at timestamptz not null default now()
);

alter table ideas alter column id set default gen_random_uuid();

create index if not exists idx_ideas_ticker on ideas(ticker);
create index if not exists idx_ideas_article on ideas(article_id);
create unique index if not exists idx_ideas_article_ticker_unique on ideas(article_id, ticker);

create table if not exists baskets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  article_id uuid references articles(id) on delete set null,
  firm text,
  theme text,
  sector text,
  region text,
  notes text,
  created_at timestamptz not null default now()
);

alter table baskets alter column id set default gen_random_uuid();

create index if not exists idx_baskets_created_at on baskets(created_at desc);

create table if not exists basket_members (
  id uuid primary key default gen_random_uuid(),
  basket_id uuid references baskets(id) on delete cascade,
  ticker text not null,
  company_name text,
  exchange text,
  country text,
  created_at timestamptz not null default now()
);

alter table basket_members alter column id set default gen_random_uuid();

create index if not exists idx_basket_members_basket on basket_members(basket_id);
create unique index if not exists idx_basket_members_basket_ticker_unique on basket_members(basket_id, ticker);

create table if not exists watchlist (
  id uuid primary key default gen_random_uuid(),
  ticker text not null,
  company_name text,
  exchange text,
  country text,
  sector text,
  source_article_id uuid references articles(id) on delete set null,
  source_basket_id uuid references baskets(id) on delete set null,
  theme text,
  notes text,
  created_at timestamptz not null default now()
);

alter table watchlist alter column id set default gen_random_uuid();

create unique index if not exists idx_watchlist_ticker_unique on watchlist(ticker);

create table if not exists metrics_snapshots (
  id uuid primary key default gen_random_uuid(),
  ticker text not null,
  provider text not null,
  snapshot_date timestamptz not null default now(),
  price real,
  market_cap bigint,
  analyst_rating text,
  avg_price_target real,
  implied_upside real,
  ath_price real,
  distance_from_ath real,
  high52_week real,
  low52_week real,
  revenue_growth real,
  valuation_json jsonb,
  earnings_date text,
  insider_activity_json jsonb,
  raw_json jsonb,
  created_at timestamptz not null default now()
);

alter table metrics_snapshots alter column id set default gen_random_uuid();

create index if not exists idx_metrics_snapshots_ticker on metrics_snapshots(ticker);
create index if not exists idx_metrics_date on metrics_snapshots(snapshot_date desc);

create table if not exists user_feedback (
  id uuid primary key default gen_random_uuid(),
  article_id uuid references articles(id) on delete cascade,
  action text not null,
  notes text,
  created_at timestamptz not null default now()
);

alter table user_feedback alter column id set default gen_random_uuid();

create table if not exists scan_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running',
  sources_checked integer not null default 0,
  urls_found integer not null default 0,
  articles_parsed integer not null default 0,
  articles_saved integer not null default 0,
  errors_json jsonb
);

alter table scan_runs alter column id set default gen_random_uuid();

create index if not exists idx_scan_runs_started_at on scan_runs(started_at desc);
