import { neon } from '@neondatabase/serverless'
import type { BasketMember, Store, WatchlistItem } from './types'
import { getDatabaseUrl } from './env'

type Row = Record<string, unknown>

function getClient() {
  const databaseUrl = getDatabaseUrl()
  if (!databaseUrl) {
    throw new Error('DATABASE_URL must be set. STORAGE_URL is only used as a fallback.')
  }

  return neon(databaseUrl)
}

function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
}

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

function mapKeysToCamel<T>(obj: Row): T {
  const result: Row = {}
  for (const [key, value] of Object.entries(obj)) {
    result[toCamelCase(key)] = value
  }
  return result as T
}

function mapArrayToCamel<T>(arr: Row[]): T[] {
  return arr.map((item) => mapKeysToCamel<T>(item))
}

function writeEntries(obj: Row): [string[], unknown[]] {
  const columns: string[] = []
  const values: unknown[] = []

  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      columns.push(toSnakeCase(key))
      values.push(value)
    }
  }

  return [columns, values]
}

function insertQuery(table: string, obj: Row): [string, unknown[]] {
  const [columns, values] = writeEntries(obj)
  const placeholders = values.map((_, index) => `$${index + 1}`)
  return [
    `insert into ${table} (${columns.join(', ')}) values (${placeholders.join(', ')}) returning *`,
    values,
  ]
}

function updateQuery(table: string, id: string, obj: Row): [string, unknown[]] {
  const [columns, values] = writeEntries(obj)
  if (columns.length === 0) {
    return [`select * from ${table} where id = $1`, [id]]
  }

  const assignments = columns.map((column, index) => `${column} = $${index + 1}`)
  return [
    `update ${table} set ${assignments.join(', ')} where id = $${values.length + 1} returning *`,
    [...values, id],
  ]
}

async function one<T>(query: string, params: unknown[]): Promise<T> {
  const rows = await getClient().query(query, params)
  return mapKeysToCamel<T>(rows[0] as Row)
}

async function maybeOne<T>(query: string, params: unknown[]): Promise<T | null> {
  const rows = await getClient().query(query, params)
  return rows[0] ? mapKeysToCamel<T>(rows[0] as Row) : null
}

async function many<T>(query: string, params: unknown[] = []): Promise<T[]> {
  const rows = await getClient().query(query, params)
  return mapArrayToCamel<T>(rows as Row[])
}

export function createNeonStore(): Store {
  const store: Store = {
    async getSources() {
      return many('select * from sources order by name')
    },
    async getSource(id: string) {
      return maybeOne('select * from sources where id = $1', [id])
    },
    async getSourceByDomain(domain: string) {
      return maybeOne('select * from sources where lower(domain) = lower($1)', [domain])
    },
    async createSource(input) {
      const [query, params] = insertQuery('sources', input as Row)
      return one(query, params)
    },
    async updateSource(id, updates) {
      const [query, params] = updateQuery('sources', id, updates as Row)
      return maybeOne(query, params)
    },
    async deleteSource(id) {
      const rows = await getClient().query('delete from sources where id = $1 returning id', [id])
      return rows.length > 0
    },

    async getArticles(filters) {
      const where: string[] = []
      const params: unknown[] = []
      if (filters?.minScore !== undefined) {
        params.push(filters.minScore)
        where.push(`article_score >= $${params.length}`)
      }
      const clauses = where.length ? `where ${where.join(' and ')}` : ''
      const limit = filters?.limit ?? 50
      const offset = filters?.offset ?? 0
      params.push(limit, offset)
      return many(
        `select * from articles ${clauses} order by published_at desc limit $${params.length - 1} offset $${params.length}`,
        params,
      )
    },
    async getArticle(id) {
      return maybeOne('select * from articles where id = $1', [id])
    },
    async getArticleByUrl(url) {
      return maybeOne('select * from articles where url = $1 or canonical_url = $1 limit 1', [url])
    },
    async getArticleByDuplicateKey(key) {
      return maybeOne('select * from articles where duplicate_key = $1', [key])
    },
    async createArticle(input) {
      const [query, params] = insertQuery('articles', input as Row)
      return one(query, params)
    },
    async updateArticle(id, updates) {
      const [query, params] = updateQuery('articles', id, updates as Row)
      return maybeOne(query, params)
    },

    async getExtraction(articleId) {
      return maybeOne('select * from article_extractions where article_id = $1', [articleId])
    },
    async createExtraction(input) {
      const [query, params] = insertQuery('article_extractions', input as Row)
      return one(query, params)
    },

    async getIdeasForArticle(articleId) {
      return many('select * from ideas where article_id = $1', [articleId])
    },
    async createIdea(input) {
      const [query, params] = insertQuery('ideas', input as Row)
      return one(query, params)
    },

    async getBaskets() {
      return many('select * from baskets order by created_at desc')
    },
    async getBasket(id) {
      return maybeOne('select * from baskets where id = $1', [id])
    },
    async createBasket(input) {
      const [query, params] = insertQuery('baskets', input as Row)
      return one(query, params)
    },
    async deleteBasket(id) {
      const rows = await getClient().query('delete from baskets where id = $1 returning id', [id])
      return rows.length > 0
    },

    async getBasketMembers(basketId) {
      return many('select * from basket_members where basket_id = $1', [basketId])
    },
    async addBasketMember(input) {
      const existing = await maybeOne<BasketMember>(
        'select * from basket_members where basket_id = $1 and ticker = upper($2)',
        [input.basketId, input.ticker],
      )
      if (existing) return existing

      const [query, params] = insertQuery('basket_members', { ...input, ticker: input.ticker.toUpperCase() } as Row)
      return one(query, params)
    },
    async removeBasketMember(id) {
      const rows = await getClient().query('delete from basket_members where id = $1 returning id', [id])
      return rows.length > 0
    },

    async getWatchlist() {
      return many('select * from watchlist order by created_at desc')
    },
    async getWatchlistItem(ticker) {
      return maybeOne('select * from watchlist where ticker = upper($1)', [ticker])
    },
    async addWatchlistItem(input) {
      const existing = await maybeOne<WatchlistItem>('select * from watchlist where ticker = upper($1)', [input.ticker])
      if (existing) return existing

      const [query, params] = insertQuery('watchlist', { ...input, ticker: input.ticker.toUpperCase() } as Row)
      return one(query, params)
    },
    async removeWatchlistItem(id) {
      const rows = await getClient().query('delete from watchlist where id = $1 returning id', [id])
      return rows.length > 0
    },

    async getMetricsSnapshot(ticker) {
      return maybeOne(
        'select * from metrics_snapshots where ticker = upper($1) order by snapshot_date desc limit 1',
        [ticker],
      )
    },
    async saveMetricsSnapshot(input) {
      const [query, params] = insertQuery('metrics_snapshots', input as Row)
      return one(query, params)
    },

    async createFeedback(input) {
      const [query, params] = insertQuery('user_feedback', input as Row)
      return one(query, params)
    },

    async createScanRun(input) {
      const [query, params] = insertQuery('scan_runs', input as Row)
      return one(query, params)
    },
    async updateScanRun(id, updates) {
      const [query, params] = updateQuery('scan_runs', id, updates as Row)
      return maybeOne(query, params)
    },
    async getScanRuns(limit = 10) {
      return many('select * from scan_runs order by started_at desc limit $1', [limit])
    },
  }
  return store
}
