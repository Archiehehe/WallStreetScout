import type { Source } from '@/lib/storage/types'

export interface DiscoveredUrl {
  url: string
  title?: string
  publishedAt?: string
  urlDiscoveryMethod?: string
}

export interface ParsedSourceArticle {
  url: string
  title?: string
  publishedAt?: string
  author?: string
  rawText?: string
  cleanedText?: string
  error?: string
}

export interface SourceParser {
  key: string
  displayName: string
  discoverArticleUrls(source: Source): Promise<DiscoveredUrl[]>
  parseArticle(url: string, source: Source): Promise<ParsedSourceArticle>
}
