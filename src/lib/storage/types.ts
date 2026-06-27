export interface Source {
  id: string
  name: string
  domain: string
  sourceType: 'primary'
  rssUrl?: string
  sitemapUrl?: string
  parserType?: string
  enabled: boolean
  qualityScore: number
  notes?: string
  createdAt: string
  updatedAt: string
}

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
  status: 'new' | 'scored' | 'saved' | 'dismissed'
  createdAt: string
  updatedAt: string
}

export interface ArticleExtraction {
  id: string
  articleId: string
  firm?: string
  sourceType?: string
  category?: string
  theme?: string
  sector?: string
  region?: string
  summary?: string
  reasonShown?: string
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

export interface Store {
  // Sources
  getSources(): Promise<Source[]>
  getSource(id: string): Promise<Source | null>
  getSourceByDomain(domain: string): Promise<Source | null>
  createSource(source: Omit<Source, 'id' | 'createdAt' | 'updatedAt'>): Promise<Source>
  updateSource(id: string, updates: Partial<Source>): Promise<Source | null>
  deleteSource(id: string): Promise<boolean>

  // Articles
  getArticles(filters?: { minScore?: number; limit?: number; offset?: number }): Promise<Article[]>
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
}
