import { neon } from '@neondatabase/serverless'
import type { BasketMember, ConvictionListMember, Store, ThirteenFOverlap, WatchlistItem } from './types'
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
      values.push(toDbValue(value))
    }
  }

  return [columns, values]
}

function toDbValue(value: unknown): unknown {
  if (value === null) return null
  if (Array.isArray(value) || typeof value === 'object') {
    return JSON.stringify(value)
  }
  return value
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
      if (filters?.status) {
        params.push(filters.status)
        where.push(`status = $${params.length}`)
      }
      if (filters?.from) {
        params.push(filters.from)
        where.push(`coalesce(published_at, created_at) >= $${params.length}`)
      }
      if (filters?.to) {
        params.push(filters.to)
        where.push(`coalesce(published_at, created_at) <= $${params.length}`)
      }
      const clauses = where.length ? `where ${where.join(' and ')}` : ''
      const limit = filters?.limit ?? 50
      const offset = filters?.offset ?? 0
      params.push(limit, offset)
      return many(
        `select * from articles ${clauses} order by published_at desc nulls last, created_at desc limit $${params.length - 1} offset $${params.length}`,
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
    async createSourceScanResult(input) {
      const [query, params] = insertQuery('source_scan_results', input as Row)
      return one(query, params)
    },
    async getLatestSourceScanResults() {
      return many(`
        select distinct on (source_id) *
        from source_scan_results
        order by source_id, started_at desc
      `)
    },

    async getConvictionLists() {
      return many('select * from conviction_lists order by updated_at desc, display_name asc')
    },
    async getConvictionList(id) {
      return maybeOne('select * from conviction_lists where id = $1 or slug = $1 limit 1', [id])
    },
    async getConvictionListMembers(convictionListId) {
      return many(
        'select * from conviction_list_members where conviction_list_id = $1 order by rank nulls last, ticker asc',
        [convictionListId],
      )
    },
    async createConvictionList(input) {
      const [query, params] = insertQuery('conviction_lists', input as Row)
      return one(query, params)
    },
    async addConvictionListMember(input) {
      const existing = await maybeOne<ConvictionListMember>(
        'select * from conviction_list_members where conviction_list_id = $1 and ticker = upper($2)',
        [input.convictionListId, input.ticker],
      )
      if (existing) return existing

      const [query, params] = insertQuery('conviction_list_members', { ...input, ticker: input.ticker.toUpperCase() } as Row)
      return one(query, params)
    },

    async getManagers() {
      return many('select * from managers order by name asc')
    },
    async getManagerHoldingsCount() {
      const rows = await getClient().query('select count(*)::int as count from manager_holdings', [])
      return Number((rows[0] as Row | undefined)?.count ?? 0)
    },
    async get13FOverlapsForTickers(tickers) {
      const uniqueTickers = Array.from(new Set(tickers.map((ticker) => ticker.toUpperCase()).filter(Boolean)))
      if (uniqueTickers.length === 0) return []

      const rows = await getClient().query(
        `
          with latest_period as (
            select manager_id, max(filing_period) as filing_period
            from manager_holdings
            where filing_period is not null
            group by manager_id
          )
          select
            m.id as manager_id,
            m.slug as manager_slug,
            m.name as manager_name,
            m.whalewisdom_url,
            h.filing_period,
            h.ticker,
            h.weight_pct,
            h.action
          from managers m
          join latest_period lp on lp.manager_id = m.id
          join manager_holdings h
            on h.manager_id = m.id
           and h.filing_period = lp.filing_period
          where m.enabled = true
            and upper(h.ticker) = any($1)
        `,
        [uniqueTickers],
      )

      const byManager = new Map<string, ThirteenFOverlap & { _weights: number[] }>()
      for (const row of rows as Row[]) {
        const managerId = String(row.manager_id)
        const ticker = String(row.ticker).toUpperCase()
        const existing = byManager.get(managerId)
        const weight = row.weight_pct === null || row.weight_pct === undefined ? undefined : Number(row.weight_pct)
        const action = typeof row.action === 'string' ? row.action : undefined

        if (!existing) {
          byManager.set(managerId, {
            managerId,
            managerSlug: String(row.manager_slug),
            managerName: String(row.manager_name),
            whalewisdomUrl: row.whalewisdom_url ? String(row.whalewisdom_url) : undefined,
            filingPeriod: row.filing_period ? String(row.filing_period) : undefined,
            overlapCount: 1,
            overlapRatio: 1 / uniqueTickers.length,
            matchedTickers: [ticker],
            matchedManagerWeight: weight,
            actionSummary: action ? { [action]: 1 } : undefined,
            _weights: weight === undefined ? [] : [weight],
          })
          continue
        }

        if (!existing.matchedTickers.includes(ticker)) {
          existing.matchedTickers.push(ticker)
          existing.overlapCount = existing.matchedTickers.length
          existing.overlapRatio = existing.overlapCount / uniqueTickers.length
        }
        if (weight !== undefined) existing._weights.push(weight)
        if (action) {
          existing.actionSummary = existing.actionSummary ?? {}
          existing.actionSummary[action] = (existing.actionSummary[action] ?? 0) + 1
        }
      }

      return Array.from(byManager.values())
        .filter((overlap) => overlap.overlapCount >= 2)
        .map(({ _weights, ...overlap }) => ({
          ...overlap,
          matchedManagerWeight: _weights.length > 0
            ? Number(_weights.reduce((sum, value) => sum + value, 0).toFixed(2))
            : undefined,
        }))
        .sort((a, b) => (
          (b.matchedManagerWeight ?? -1) - (a.matchedManagerWeight ?? -1) ||
          b.overlapCount - a.overlapCount ||
          b.overlapRatio - a.overlapRatio ||
          a.managerName.localeCompare(b.managerName)
        ))
    },
  }
  return store
}
