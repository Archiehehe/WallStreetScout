import { createClient } from '@supabase/supabase-js'
import type { Store } from './types'

type DbError = { message?: string } | null

function getClient() {
  const url = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || anonKey

  if (!url || !anonKey || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be set')
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

function assertNoError(error: DbError): void {
  if (error) throw new Error(error.message ?? 'Supabase request failed')
}

function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
}

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

function mapKeysToSnake(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[toSnakeCase(key)] = value
    }
  }
  return result
}

function mapKeysToCamel<T>(obj: Record<string, unknown>): T {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    result[toCamelCase(key)] = value
  }
  return result as T
}

function mapArrayToCamel<T>(arr: Record<string, unknown>[]): T[] {
  return arr.map(item => mapKeysToCamel<T>(item))
}

export function createSupabaseStore(): Store {
  const store: Store = {
    async getSources() {
      const { data, error } = await getClient().from('sources').select('*').order('name')
      assertNoError(error)
      return data ? mapArrayToCamel(data) : []
    },
    async getSource(id: string) {
      const { data, error } = await getClient().from('sources').select('*').eq('id', id).maybeSingle()
      assertNoError(error)
      return data ? mapKeysToCamel(data) : null
    },
    async getSourceByDomain(domain: string) {
      const { data, error } = await getClient()
        .from('sources')
        .select('*')
        .eq('domain', domain.toLowerCase())
        .maybeSingle()
      assertNoError(error)
      return data ? mapKeysToCamel(data) : null
    },
    async createSource(input) {
      const { data, error } = await getClient()
        .from('sources')
        .insert(mapKeysToSnake(input as Record<string, unknown>))
        .select()
        .single()
      assertNoError(error)
      return mapKeysToCamel(data!)
    },
    async updateSource(id, updates) {
      const { data, error } = await getClient()
        .from('sources')
        .update(mapKeysToSnake(updates as Record<string, unknown>))
        .eq('id', id)
        .select()
        .maybeSingle()
      assertNoError(error)
      return data ? mapKeysToCamel(data) : null
    },
    async deleteSource(id) {
      const { count, error } = await getClient()
        .from('sources')
        .delete({ count: 'exact' })
        .eq('id', id)
      assertNoError(error)
      return (count ?? 0) > 0
    },

    async getArticles(filters) {
      let query = getClient().from('articles').select('*').order('published_at', { ascending: false })
      if (filters?.minScore !== undefined) {
        query = query.gte('article_score', filters.minScore)
      }
      if (filters?.offset) query = query.range(filters.offset, filters.offset + (filters.limit ?? 50) - 1)
      if (filters?.limit) query = query.limit(filters.limit)
      const { data, error } = await query
      assertNoError(error)
      return data ? mapArrayToCamel(data) : []
    },
    async getArticle(id) {
      const { data, error } = await getClient().from('articles').select('*').eq('id', id).maybeSingle()
      assertNoError(error)
      return data ? mapKeysToCamel(data) : null
    },
    async getArticleByUrl(url) {
      const client = getClient()
      const byUrl = await client.from('articles').select('*').eq('url', url).maybeSingle()
      assertNoError(byUrl.error)
      if (byUrl.data) return mapKeysToCamel(byUrl.data)

      const byCanonical = await client.from('articles').select('*').eq('canonical_url', url).maybeSingle()
      assertNoError(byCanonical.error)
      return byCanonical.data ? mapKeysToCamel(byCanonical.data) : null
    },
    async getArticleByDuplicateKey(key) {
      const { data, error } = await getClient()
        .from('articles')
        .select('*')
        .eq('duplicate_key', key)
        .maybeSingle()
      assertNoError(error)
      return data ? mapKeysToCamel(data) : null
    },
    async createArticle(input) {
      const { data, error } = await getClient()
        .from('articles')
        .insert(mapKeysToSnake(input as Record<string, unknown>))
        .select()
        .single()
      assertNoError(error)
      return mapKeysToCamel(data!)
    },
    async updateArticle(id, updates) {
      const { data, error } = await getClient()
        .from('articles')
        .update(mapKeysToSnake(updates as Record<string, unknown>))
        .eq('id', id)
        .select()
        .maybeSingle()
      assertNoError(error)
      return data ? mapKeysToCamel(data) : null
    },

    async getExtraction(articleId) {
      const { data, error } = await getClient().from('article_extractions').select('*').eq('article_id', articleId).maybeSingle()
      assertNoError(error)
      return data ? mapKeysToCamel(data) : null
    },
    async createExtraction(input) {
      const { data, error } = await getClient()
        .from('article_extractions')
        .insert(mapKeysToSnake(input as Record<string, unknown>))
        .select()
        .single()
      assertNoError(error)
      return mapKeysToCamel(data!)
    },

    async getIdeasForArticle(articleId) {
      const { data, error } = await getClient().from('ideas').select('*').eq('article_id', articleId)
      assertNoError(error)
      return data ? mapArrayToCamel(data) : []
    },
    async createIdea(input) {
      const { data, error } = await getClient()
        .from('ideas')
        .insert(mapKeysToSnake(input as Record<string, unknown>))
        .select()
        .single()
      assertNoError(error)
      return mapKeysToCamel(data!)
    },

    async getBaskets() {
      const { data, error } = await getClient().from('baskets').select('*').order('created_at', { ascending: false })
      assertNoError(error)
      return data ? mapArrayToCamel(data) : []
    },
    async getBasket(id) {
      const { data, error } = await getClient().from('baskets').select('*').eq('id', id).maybeSingle()
      assertNoError(error)
      return data ? mapKeysToCamel(data) : null
    },
    async createBasket(input) {
      const { data, error } = await getClient()
        .from('baskets')
        .insert(mapKeysToSnake(input as Record<string, unknown>))
        .select()
        .single()
      assertNoError(error)
      return mapKeysToCamel(data!)
    },
    async deleteBasket(id) {
      const { count, error } = await getClient()
        .from('baskets')
        .delete({ count: 'exact' })
        .eq('id', id)
      assertNoError(error)
      return (count ?? 0) > 0
    },

    async getBasketMembers(basketId) {
      const { data, error } = await getClient().from('basket_members').select('*').eq('basket_id', basketId)
      assertNoError(error)
      return data ? mapArrayToCamel(data) : []
    },
    async addBasketMember(input) {
      const existing = await getClient()
        .from('basket_members')
        .select('*')
        .eq('basket_id', input.basketId)
        .eq('ticker', input.ticker.toUpperCase())
        .maybeSingle()
      assertNoError(existing.error)
      if (existing.data) return mapKeysToCamel(existing.data)

      const { data, error } = await getClient()
        .from('basket_members')
        .insert(mapKeysToSnake({ ...input, ticker: input.ticker.toUpperCase() } as Record<string, unknown>))
        .select()
        .single()
      assertNoError(error)
      return mapKeysToCamel(data!)
    },
    async removeBasketMember(id) {
      const { count, error } = await getClient()
        .from('basket_members')
        .delete({ count: 'exact' })
        .eq('id', id)
      assertNoError(error)
      return (count ?? 0) > 0
    },

    async getWatchlist() {
      const { data, error } = await getClient().from('watchlist').select('*').order('created_at', { ascending: false })
      assertNoError(error)
      return data ? mapArrayToCamel(data) : []
    },
    async getWatchlistItem(ticker) {
      const { data, error } = await getClient()
        .from('watchlist')
        .select('*')
        .eq('ticker', ticker.toUpperCase())
        .maybeSingle()
      assertNoError(error)
      return data ? mapKeysToCamel(data) : null
    },
    async addWatchlistItem(input) {
      const existing = await getClient()
        .from('watchlist')
        .select('*')
        .eq('ticker', input.ticker.toUpperCase())
        .maybeSingle()
      assertNoError(existing.error)
      if (existing.data) return mapKeysToCamel(existing.data)

      const { data, error } = await getClient()
        .from('watchlist')
        .insert(mapKeysToSnake({ ...input, ticker: input.ticker.toUpperCase() } as Record<string, unknown>))
        .select()
        .single()
      assertNoError(error)
      return mapKeysToCamel(data!)
    },
    async removeWatchlistItem(id) {
      const { count, error } = await getClient()
        .from('watchlist')
        .delete({ count: 'exact' })
        .eq('id', id)
      assertNoError(error)
      return (count ?? 0) > 0
    },

    async getMetricsSnapshot(ticker) {
      const { data, error } = await getClient()
        .from('metrics_snapshots')
        .select('*')
        .eq('ticker', ticker.toUpperCase())
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .maybeSingle()
      assertNoError(error)
      return data ? mapKeysToCamel(data) : null
    },
    async saveMetricsSnapshot(input) {
      const { data, error } = await getClient()
        .from('metrics_snapshots')
        .insert(mapKeysToSnake(input as Record<string, unknown>))
        .select()
        .single()
      assertNoError(error)
      return mapKeysToCamel(data!)
    },

    async createFeedback(input) {
      const { data, error } = await getClient()
        .from('user_feedback')
        .insert(mapKeysToSnake(input as Record<string, unknown>))
        .select()
        .single()
      assertNoError(error)
      return mapKeysToCamel(data!)
    },

    async createScanRun(input) {
      const { data, error } = await getClient()
        .from('scan_runs')
        .insert(mapKeysToSnake(input as Record<string, unknown>))
        .select()
        .single()
      assertNoError(error)
      return mapKeysToCamel(data!)
    },
    async updateScanRun(id, updates) {
      const { data, error } = await getClient()
        .from('scan_runs')
        .update(mapKeysToSnake(updates as Record<string, unknown>))
        .eq('id', id)
        .select()
        .maybeSingle()
      assertNoError(error)
      return data ? mapKeysToCamel(data) : null
    },
    async getScanRuns(limit = 10) {
      const { data, error } = await getClient()
        .from('scan_runs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(limit)
      assertNoError(error)
      return data ? mapArrayToCamel(data) : []
    },
  }
  return store
}
