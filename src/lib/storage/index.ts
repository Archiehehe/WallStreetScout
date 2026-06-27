import type { Store } from './types'
import { createJsonStore } from './jsonStore'
import { createNeonStore } from './neonStore'
import { getDatabaseUrl } from './env'

let store: Store | null = null
let storeMode: StorageMode | null = null

export type StorageMode = 'neon' | 'local-dev' | 'misconfigured'

export class StorageConfigurationError extends Error {
  constructor(message = 'Neon is not configured for production storage.') {
    super(message)
    this.name = 'StorageConfigurationError'
  }
}

export function isNeonConfigured(): boolean {
  return Boolean(getDatabaseUrl())
}

export function getStorageMode(): StorageMode {
  if (isNeonConfigured()) return 'neon'
  if (process.env.NODE_ENV === 'development') return 'local-dev'
  return 'misconfigured'
}

export function getStore(): Store {
  if (store) return store

  storeMode = getStorageMode()

  if (storeMode === 'neon') {
    store = createNeonStore()
  } else if (storeMode === 'local-dev') {
    store = createJsonStore()
  } else {
    throw new StorageConfigurationError(
      'Neon not configured. Set the DATABASE_URL environment variable. ' +
      'STORAGE_URL is only used as a fallback. JSON file store is only available in development mode.'
    )
  }

  return store
}

export function getActiveStorageMode(): StorageMode {
  return storeMode ?? getStorageMode()
}

export type { Store }
export * from './types'
