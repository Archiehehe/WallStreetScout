import { v4 as uuidv4 } from 'uuid'
import type {
  Store, Source, Article, ArticleExtraction, Idea,
  Basket, BasketMember, WatchlistItem, MetricsSnapshot,
  UserFeedback, ScanRun
} from './types'

const DB_PATH = 'data/local-dev-db'

function dbFile(collection: string): string {
  return `${DB_PATH}/${collection}.json`
}

async function readCollection<T>(name: string): Promise<T[]> {
  try {
    const fs = await import('fs/promises')
    const data = await fs.readFile(dbFile(name), 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

async function writeCollection<T>(name: string, data: T[]): Promise<void> {
  const fs = await import('fs/promises')
  const path = await import('path')
  const dir = path.dirname(dbFile(name))
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(dbFile(name), JSON.stringify(data, null, 2), 'utf-8')
}

function now(): string {
  return new Date().toISOString()
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj }
  for (const [k, v] of Object.entries(out)) {
    if (v === undefined) delete out[k as keyof T]
  }
  return out
}

export function createJsonStore(): Store {
  const store: Store = {
    async getSources() {
      return readCollection<Source>('sources')
    },
    async getSource(id: string) {
      const items = await readCollection<Source>('sources')
      return items.find(s => s.id === id) ?? null
    },
    async getSourceByDomain(domain: string) {
      const normalized = domain.toLowerCase()
      const items = await readCollection<Source>('sources')
      return items.find(s => s.domain.toLowerCase() === normalized) ?? null
    },
    async createSource(data) {
      const items = await readCollection<Source>('sources')
      const item: Source = { ...data, id: uuidv4(), createdAt: now(), updatedAt: now() }
      items.push(item)
      await writeCollection('sources', items)
      return item
    },
    async updateSource(id, updates) {
      const items = await readCollection<Source>('sources')
      const idx = items.findIndex(s => s.id === id)
      if (idx === -1) return null
      items[idx] = { ...items[idx], ...stripUndefined(updates as Record<string, unknown>), updatedAt: now() }
      await writeCollection('sources', items)
      return items[idx]
    },
    async deleteSource(id) {
      const items = await readCollection<Source>('sources')
      const filtered = items.filter(s => s.id !== id)
      if (filtered.length === items.length) return false
      await writeCollection('sources', filtered)
      return true
    },

    async getArticles(filters) {
      let items = await readCollection<Article>('articles')
      if (filters?.minScore !== undefined) {
        items = items.filter(a => a.articleScore >= filters.minScore!)
      }
      items.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      if (filters?.offset) items = items.slice(filters.offset)
      if (filters?.limit) items = items.slice(0, filters.limit)
      return items
    },
    async getArticle(id) {
      const items = await readCollection<Article>('articles')
      return items.find(a => a.id === id) ?? null
    },
    async getArticleByUrl(url) {
      const items = await readCollection<Article>('articles')
      return items.find(a => a.url === url || a.canonicalUrl === url) ?? null
    },
    async getArticleByDuplicateKey(key) {
      const items = await readCollection<Article>('articles')
      return items.find(a => a.duplicateKey === key) ?? null
    },
    async createArticle(data) {
      const items = await readCollection<Article>('articles')
      const item: Article = { ...data, id: uuidv4(), createdAt: now(), updatedAt: now() }
      items.push(item)
      await writeCollection('articles', items)
      return item
    },
    async updateArticle(id, updates) {
      const items = await readCollection<Article>('articles')
      const idx = items.findIndex(a => a.id === id)
      if (idx === -1) return null
      items[idx] = { ...items[idx], ...stripUndefined(updates as Record<string, unknown>), updatedAt: now() }
      await writeCollection('articles', items)
      return items[idx]
    },

    async getExtraction(articleId) {
      const items = await readCollection<ArticleExtraction>('extractions')
      return items.find(e => e.articleId === articleId) ?? null
    },
    async createExtraction(data) {
      const items = await readCollection<ArticleExtraction>('extractions')
      const item: ArticleExtraction = { ...data, id: uuidv4(), createdAt: now() }
      items.push(item)
      await writeCollection('extractions', items)
      return item
    },

    async getIdeasForArticle(articleId) {
      const items = await readCollection<Idea>('ideas')
      return items.filter(i => i.articleId === articleId)
    },
    async createIdea(data) {
      const items = await readCollection<Idea>('ideas')
      const item: Idea = { ...data, id: uuidv4(), createdAt: now() }
      items.push(item)
      await writeCollection('ideas', items)
      return item
    },

    async getBaskets() {
      return readCollection<Basket>('baskets')
    },
    async getBasket(id) {
      const items = await readCollection<Basket>('baskets')
      return items.find(b => b.id === id) ?? null
    },
    async createBasket(data) {
      const items = await readCollection<Basket>('baskets')
      const item: Basket = { ...data, id: uuidv4(), createdAt: now() }
      items.push(item)
      await writeCollection('baskets', items)
      return item
    },
    async deleteBasket(id) {
      const items = await readCollection<Basket>('baskets')
      const filtered = items.filter(b => b.id !== id)
      if (filtered.length === items.length) return false
      await writeCollection('baskets', filtered)
      return true
    },

    async getBasketMembers(basketId) {
      const items = await readCollection<BasketMember>('basket_members')
      return items.filter(m => m.basketId === basketId)
    },
    async addBasketMember(data) {
      const items = await readCollection<BasketMember>('basket_members')
      const existing = items.find(m => (
        m.basketId === data.basketId &&
        m.ticker.toUpperCase() === data.ticker.toUpperCase()
      ))
      if (existing) return existing
      const item: BasketMember = { ...data, id: uuidv4(), createdAt: now() }
      items.push(item)
      await writeCollection('basket_members', items)
      return item
    },
    async removeBasketMember(id) {
      const items = await readCollection<BasketMember>('basket_members')
      const filtered = items.filter(m => m.id !== id)
      if (filtered.length === items.length) return false
      await writeCollection('basket_members', filtered)
      return true
    },

    async getWatchlist() {
      return readCollection<WatchlistItem>('watchlist')
    },
    async getWatchlistItem(ticker) {
      const items = await readCollection<WatchlistItem>('watchlist')
      return items.find(w => w.ticker.toUpperCase() === ticker.toUpperCase()) ?? null
    },
    async addWatchlistItem(data) {
      const items = await readCollection<WatchlistItem>('watchlist')
      const existing = items.find(w => w.ticker.toUpperCase() === data.ticker.toUpperCase())
      if (existing) return existing
      const item: WatchlistItem = { ...data, ticker: data.ticker.toUpperCase(), id: uuidv4(), createdAt: now() }
      items.push(item)
      await writeCollection('watchlist', items)
      return item
    },
    async removeWatchlistItem(id) {
      const items = await readCollection<WatchlistItem>('watchlist')
      const filtered = items.filter(w => w.id !== id)
      if (filtered.length === items.length) return false
      await writeCollection('watchlist', filtered)
      return true
    },

    async getMetricsSnapshot(ticker) {
      const items = await readCollection<MetricsSnapshot>('metrics_snapshots')
      const matches = items.filter(m => m.ticker.toUpperCase() === ticker.toUpperCase())
      matches.sort((a, b) => new Date(b.snapshotDate).getTime() - new Date(a.snapshotDate).getTime())
      return matches[0] ?? null
    },
    async saveMetricsSnapshot(data) {
      const items = await readCollection<MetricsSnapshot>('metrics_snapshots')
      const item: MetricsSnapshot = { ...data, id: uuidv4(), createdAt: now() }
      items.push(item)
      await writeCollection('metrics_snapshots', items)
      return item
    },

    async createFeedback(data) {
      const items = await readCollection<UserFeedback>('feedback')
      const item: UserFeedback = { ...data, id: uuidv4(), createdAt: now() }
      items.push(item)
      await writeCollection('feedback', items)
      return item
    },

    async createScanRun(data) {
      const items = await readCollection<ScanRun>('scan_runs')
      const item: ScanRun = { ...data, id: uuidv4() }
      items.push(item)
      await writeCollection('scan_runs', items)
      return item
    },
    async updateScanRun(id, updates) {
      const items = await readCollection<ScanRun>('scan_runs')
      const idx = items.findIndex(r => r.id === id)
      if (idx === -1) return null
      items[idx] = { ...items[idx], ...stripUndefined(updates as Record<string, unknown>) }
      await writeCollection('scan_runs', items)
      return items[idx]
    },
    async getScanRuns(limit = 10) {
      const items = await readCollection<ScanRun>('scan_runs')
      return items
        .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
        .slice(0, limit)
    },
  }
  return store
}
