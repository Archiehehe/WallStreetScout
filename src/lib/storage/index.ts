import type { Store } from './types'
import { createJsonStore } from './jsonStore'
import { createSupabaseStore } from './supabaseStore'

let store: Store | null = null
let storeMode: StorageMode | null = null

export type StorageMode = 'supabase' | 'local-dev' | 'misconfigured'

export class StorageConfigurationError extends Error {
  constructor(message = 'Supabase is not configured for production storage.') {
    super(message)
    this.name = 'StorageConfigurationError'
  }
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY)
}

export function getStorageMode(): StorageMode {
  if (isSupabaseConfigured()) return 'supabase'
  if (process.env.NODE_ENV === 'development') return 'local-dev'
  return 'misconfigured'
}

export function getStore(): Store {
  if (store) return store

  storeMode = getStorageMode()

  if (storeMode === 'supabase') {
    store = createSupabaseStore()
  } else if (storeMode === 'local-dev') {
    store = createJsonStore()
  } else {
    throw new StorageConfigurationError(
      'Supabase not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables. ' +
      'JSON file store is only available in development mode.'
    )
  }

  return store
}

export function getActiveStorageMode(): StorageMode {
  return storeMode ?? getStorageMode()
}

export type { Store }
export * from './types'
