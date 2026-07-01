export type SellSideListMember = {
  ticker: string
  companyName?: string
  action?: 'buy' | 'sell' | 'underperform' | 'addition' | 'removal' | 'unknown'
  rank?: number
  note?: string
  sourceText?: string
}

export type SellSideListCandidate = {
  institution: string
  listName: string
  displayName: string
  period?: string
  year?: number
  publishedAt?: string
  theme?: string
  sector?: string
  region?: string
  sourceUrl?: string
  sourcePublisher?: string
  sourceType: 'official_page' | 'official_pdf' | 'media_summary' | 'manual' | 'csv' | 'paste'
  confidence: 'verified' | 'needs_review'
  reviewStatus?: 'pending' | 'approved' | 'rejected'
  rawSourceTitle?: string
  rawSourceExcerpt?: string
  importedFrom?: string
  members: SellSideListMember[]
}

export type PartialCandidate = {
  institution: string
  listName: string
  period?: string
  year?: number
  theme?: string
  sector?: string
  sourceType: 'media_summary' | 'manual'
  confidence: 'needs_review'
  reviewStatus: 'needs_extraction'
  visibleTickers: string[]
  expectedCount?: number
  sourceUrl?: string
  sourcePublisher?: string
}

export interface ListFinderWindow {
  fromDate: Date
  toDate: Date
  yearLabel: number
  queryYear: number
}

export interface ListFinderQuery {
  query: string
  bank: string
  category: string
}
