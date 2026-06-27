import type { Source } from '@/lib/storage/types'

/**
 * Real starter source definitions for the scanner.
 * No fake articles, baskets, watchlist items, or metrics.
 * Only primary source definitions - users import these to populate their source list.
 */
export const STARTER_SOURCES: Omit<Source, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { name: 'Goldman Sachs Insights', domain: 'goldmansachs.com', sourceType: 'primary', rssUrl: undefined, parserType: 'generic', enabled: true, qualityScore: 9 },
  { name: 'Morgan Stanley Insights', domain: 'morganstanley.com', sourceType: 'primary', rssUrl: undefined, parserType: 'generic', enabled: true, qualityScore: 9 },
  { name: 'J.P. Morgan Research', domain: 'jpmorgan.com', sourceType: 'primary', rssUrl: undefined, parserType: 'generic', enabled: true, qualityScore: 9 },
  { name: 'BofA Research', domain: 'bofa.com', sourceType: 'primary', rssUrl: undefined, parserType: 'generic', enabled: true, qualityScore: 9 },
  { name: 'UBS CIO', domain: 'ubs.com', sourceType: 'primary', rssUrl: undefined, parserType: 'generic', enabled: true, qualityScore: 9 },
  { name: 'BlackRock Investment Institute', domain: 'blackrock.com', sourceType: 'primary', rssUrl: undefined, parserType: 'generic', enabled: true, qualityScore: 9 },
  { name: 'Citi Research', domain: 'citigroup.com', sourceType: 'primary', rssUrl: undefined, parserType: 'generic', enabled: true, qualityScore: 9 },
  { name: 'PIMCO', domain: 'pimco.com', sourceType: 'primary', rssUrl: undefined, parserType: 'generic', enabled: true, qualityScore: 8 },
  { name: 'Fidelity', domain: 'fidelity.com', sourceType: 'primary', rssUrl: undefined, parserType: 'generic', enabled: true, qualityScore: 8 },
  { name: 'T. Rowe Price', domain: 'troweprice.com', sourceType: 'primary', rssUrl: undefined, parserType: 'generic', enabled: true, qualityScore: 8 },
]
