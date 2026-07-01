export interface Source {
  id: string
  name: string
  domain: string
  sourceType: 'primary'
  sourceClass?: 'primary_institutional' | 'public_institutional_research' | 'manual'
  sourceTier?: 'core' | 'secondary' | 'archive'
  rssUrl?: string
  sitemapUrl?: string
  parserType?: string
  enabled: boolean
  defaultEnabled?: boolean
  strictEvidenceRequired?: boolean
  allowTickerlessThemePieces?: boolean
  category?: string
  accessNote?: string
  allowedPathPatterns?: string[]
  blockedPathPatterns?: string[]
  preferredDiscoveryMethod?: string
  knownArticleIndexUrls?: string[]
  sourceNeedsUrlPattern?: boolean
  qualityScore: number
  notes?: string
  createdAt: string
  updatedAt: string
}

export type PageType =
  | 'institutional_research_idea'
  | 'market_outlook'
  | 'sector_or_theme_research'
  | 'stock_basket_research'
  | 'manager_commentary'
  | 'education_page'
  | 'product_page'
  | 'tool_page'
  | 'fund_or_etf_page'
  | 'category_landing_page'
  | 'generic_marketing_page'
  | 'unknown'

export type RejectionCategory =
  | 'rejected_education_page'
  | 'rejected_product_page'
  | 'rejected_tool_page'
  | 'rejected_fund_or_etf_page'
  | 'rejected_category_landing_page'
  | 'rejected_generic_marketing_page'
  | 'rejected_not_research_idea'
  | 'rejected_fewer_than_3_screenable_tickers'
  | 'rejected_media_source_not_allowed'

export interface Article {
  id: string
  sourceId: string
  url: string
  canonicalUrl?: string
  title: string
  author?: string
  publishedAt: string
  fetchedAt: string
  rawText?: string
  cleanedText?: string
  paywallStatus: 'unknown' | 'paywalled' | 'free'
  duplicateKey?: string
  articleScore: number
  status: 'new' | 'scored' | 'saved' | 'dismissed' | 'rejected'
  rejectionReason?: string
  createdAt: string
  updatedAt: string
}

export interface ArticleExtraction {
  id: string
  articleId: string
  firm?: string
  sourceInstitution?: string
  mentionedInstitutions?: string[]
  primaryInstitution?: string
  sourceType?: string
  category?: string
  theme?: string
  sector?: string
  region?: string
  summary?: string
  reasonShown?: string
  pageType?: PageType
  rejectionCategory?: RejectionCategory
  screenableTickers?: string[]
  extractedTickers: string[]
  extractedCompanies: string[]
  scoreBreakdown: Record<string, number>
  confidence: number
  createdAt: string
}

export interface Idea {
  id: string
  articleId: string
  ticker: string
  companyName?: string
  exchange?: string
  country?: string
  sector?: string
  theme?: string
  confidence: number
  isInWatchlist: boolean
  isInPortfolio: boolean
  createdAt: string
}

export interface Basket {
  id: string
  name: string
  articleId?: string
  firm?: string
  theme?: string
  sector?: string
  region?: string
  notes?: string
  createdAt: string
}

export interface BasketMember {
  id: string
  basketId: string
  ticker: string
  companyName?: string
  exchange?: string
  country?: string
  createdAt: string
}

export interface WatchlistItem {
  id: string
  ticker: string
  companyName?: string
  exchange?: string
  country?: string
  sector?: string
  sourceArticleId?: string
  sourceBasketId?: string
  theme?: string
  notes?: string
  createdAt: string
}

export interface MetricsSnapshot {
  id: string
  ticker: string
  provider: string
  snapshotDate: string
  price?: number
  marketCap?: number
  analystRating?: string
  avgPriceTarget?: number
  impliedUpside?: number
  athPrice?: number
  distanceFromAth?: number
  high52Week?: number
  low52Week?: number
  revenueGrowth?: number
  valuationJson?: Record<string, unknown>
  earningsDate?: string
  insiderActivityJson?: Record<string, unknown>
  rawJson?: Record<string, unknown>
  createdAt: string
}

export interface UserFeedback {
  id: string
  articleId: string
  action: 'more_like_this' | 'less_like_this' | 'hide_source' | 'save_basket' | 'dismiss'
  notes?: string
  createdAt: string
}

export interface ScanRun {
  id: string
  startedAt: string
  finishedAt?: string
  status: 'running' | 'completed' | 'failed'
  sourcesChecked: number
  urlsFound: number
  articlesParsed: number
  articlesSaved: number
  errorsJson?: Record<string, unknown>
}

export interface SourceScanResult {
  id: string
  scanRunId: string
  sourceId?: string
  sourceName: string
  sourceDomain: string
  sourceTier?: 'core' | 'secondary' | 'archive'
  status: 'completed' | 'failed' | 'no_urls'
  urlsFound: number
  urlsAttempted: number
  savedCount: number
  rejectedCount: number
  failedCount: number
  error?: string
  startedAt: string
  finishedAt?: string
  createdAt: string
}

export interface ScanUrlResult {
  id: string
  scanRunId: string
  sourceId?: string
  sourceName?: string
  sourceDomain?: string
  url: string
  normalizedUrl?: string
  urlDiscoveryMethod?: string
  status: string
  httpStatus?: number
  rejectionCategory?: string
  rejectionReason?: string
  pageType?: string
  rawExtractedTickers?: string[]
  screenableTickers?: string[]
  previewQuality?: string
  error?: string
  createdAt: string
}

export interface ConvictionList {
  id: string
  slug: string
  institution: string
  listName: string
  displayName: string
  year?: number
  period?: string
  theme?: string
  sector?: string
  region?: string
  sourceUrl?: string
  sourceType: 'official_page' | 'official_pdf' | 'manual' | 'api'
  accessStatus?: string
  confidence: 'verified' | 'needs_review'
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface ConvictionListMember {
  id: string
  convictionListId: string
  ticker: string
  companyName?: string
  rank?: number
  weight?: number
  action?: string
  note?: string
  sourceText?: string
  createdAt: string
}

export interface Manager {
  id: string
  slug: string
  name: string
  cik?: string
  whalewisdomUrl?: string
  strategyTags?: string[]
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface ManagerHolding {
  id: string
  managerId: string
  filingPeriod?: string
  ticker: string
  companyName?: string
  shares?: number
  valueUsd?: number
  weightPct?: number
  changePct?: number
  action?: 'new' | 'increased' | 'reduced' | 'sold_out' | 'unchanged' | 'unknown'
  source: string
  sourceUrl?: string
  createdAt: string
}

export interface ThirteenFOverlap {
  managerId: string
  managerSlug: string
  managerName: string
  whalewisdomUrl?: string
  filingPeriod?: string
  overlapCount: number
  overlapRatio: number
  matchedTickers: string[]
  matchedManagerWeight?: number
  actionSummary?: Record<string, number>
}

export interface Store {
  // Sources
  getSources(): Promise<Source[]>
  getSource(id: string): Promise<Source | null>
  getSourceByDomain(domain: string): Promise<Source | null>
  createSource(source: Omit<Source, 'id' | 'createdAt' | 'updatedAt'>): Promise<Source>
  updateSource(id: string, updates: Partial<Source>): Promise<Source | null>
  deleteSource(id: string): Promise<boolean>

  // Articles
  getArticles(filters?: { minScore?: number; limit?: number; offset?: number; status?: Article['status']; from?: string; to?: string }): Promise<Article[]>
  getArticle(id: string): Promise<Article | null>
  getArticleByUrl(url: string): Promise<Article | null>
  getArticleByDuplicateKey(key: string): Promise<Article | null>
  createArticle(article: Omit<Article, 'id' | 'createdAt' | 'updatedAt'>): Promise<Article>
  updateArticle(id: string, updates: Partial<Article>): Promise<Article | null>

  // Article Extractions
  getExtraction(articleId: string): Promise<ArticleExtraction | null>
  createExtraction(extraction: Omit<ArticleExtraction, 'id' | 'createdAt'>): Promise<ArticleExtraction>

  // Ideas
  getIdeasForArticle(articleId: string): Promise<Idea[]>
  createIdea(idea: Omit<Idea, 'id' | 'createdAt'>): Promise<Idea>

  // Baskets
  getBaskets(): Promise<Basket[]>
  getBasket(id: string): Promise<Basket | null>
  createBasket(basket: Omit<Basket, 'id' | 'createdAt'>): Promise<Basket>
  deleteBasket(id: string): Promise<boolean>

  // Basket Members
  getBasketMembers(basketId: string): Promise<BasketMember[]>
  addBasketMember(member: Omit<BasketMember, 'id' | 'createdAt'>): Promise<BasketMember>
  removeBasketMember(id: string): Promise<boolean>

  // Watchlist
  getWatchlist(): Promise<WatchlistItem[]>
  getWatchlistItem(ticker: string): Promise<WatchlistItem | null>
  addWatchlistItem(item: Omit<WatchlistItem, 'id' | 'createdAt'>): Promise<WatchlistItem>
  removeWatchlistItem(id: string): Promise<boolean>

  // Metrics
  getMetricsSnapshot(ticker: string): Promise<MetricsSnapshot | null>
  saveMetricsSnapshot(snapshot: Omit<MetricsSnapshot, 'id' | 'createdAt'>): Promise<MetricsSnapshot>

  // Feedback
  createFeedback(feedback: Omit<UserFeedback, 'id' | 'createdAt'>): Promise<UserFeedback>

  // Scan Runs
  createScanRun(run: Omit<ScanRun, 'id'>): Promise<ScanRun>
  updateScanRun(id: string, updates: Partial<ScanRun>): Promise<ScanRun | null>
  getScanRuns(limit?: number): Promise<ScanRun[]>
  createSourceScanResult(result: Omit<SourceScanResult, 'id' | 'createdAt'>): Promise<SourceScanResult>
  getLatestSourceScanResults(): Promise<SourceScanResult[]>
  createScanUrlResult(result: Omit<ScanUrlResult, 'id' | 'createdAt'>): Promise<ScanUrlResult>
  getScanUrlResults(scanRunId: string): Promise<ScanUrlResult[]>

  // Conviction Lists
  getConvictionLists(): Promise<ConvictionList[]>
  getConvictionList(id: string): Promise<ConvictionList | null>
  getConvictionListMembers(convictionListId: string): Promise<ConvictionListMember[]>
  createConvictionList(list: Omit<ConvictionList, 'id' | 'createdAt' | 'updatedAt'>): Promise<ConvictionList>
  addConvictionListMember(member: Omit<ConvictionListMember, 'id' | 'createdAt'>): Promise<ConvictionListMember>

  // 13F Overlap
  getManagers(): Promise<Manager[]>
  getManagerHoldingsCount(): Promise<number>
  get13FOverlapsForTickers(tickers: string[]): Promise<ThirteenFOverlap[]>
}
