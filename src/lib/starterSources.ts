import type { Source } from '@/lib/storage/types'
import starterSources from '../../db/starter-sources.json'

/**
 * Real starter source definitions for the scanner.
 * No fake articles, baskets, watchlist items, or metrics.
 * Only primary source definitions - users import these to populate their source list.
 */
export const STARTER_SOURCES = starterSources as Omit<Source, 'id' | 'createdAt' | 'updatedAt'>[]
