import type { Source } from '@/lib/storage/types'
import { SOURCE_REGISTRY, toStarterSource } from '@/lib/sourceRegistry'

/**
 * Real starter source definitions for the scanner.
 * No fake articles, baskets, watchlist items, or metrics.
 * Only primary source definitions - users import these to populate their source list.
 */
export const STARTER_SOURCES: Omit<Source, 'id' | 'createdAt' | 'updatedAt'>[] =
  SOURCE_REGISTRY.map(toStarterSource)
