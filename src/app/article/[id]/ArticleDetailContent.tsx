'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FirmBadge } from '@/components/FirmBadge'
import { ThemeBadge, SectorBadge, SourceTypeBadge, SourceTierBadge, PageTypeBadge } from '@/components/ThemeBadge'
import { TickerPill } from '@/components/TickerPill'
import { LoadingState } from '@/components/LoadingState'
import { ErrorState } from '@/components/ErrorState'
import { ThirteenFOverlapPanel } from '@/components/ThirteenFOverlapPanel'
import type { ThirteenFOverlap } from '@/lib/storage/types'
import { ArrowLeft, ExternalLink } from 'lucide-react'

interface ArticleData {
  article: {
    id: string
    title: string
    url: string
    canonicalUrl?: string
    author?: string
    publishedAt: string
    cleanedText?: string
    paywallStatus: string
    articleScore: number
    status: string
  }
  extraction: {
    firm?: string
    sourceType?: string
    category?: string
    theme?: string
    sector?: string
    summary?: string
    reasonShown?: string
    extractedTickers: string[]
    extractedCompanies: string[]
    confidence: number
  }
  qualification?: {
    qualified: boolean
    reason: string
    pageType: string
    screenableTickers: string[]
  }
  source: {
    name: string
    domain: string
    sourceClass?: string
    sourceTier?: string
  }
  overlaps?: ThirteenFOverlap[]
}

export function ArticleDetailPage({ id }: { id: string }) {
  const [data, setData] = useState<ArticleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const res = await fetch(`/api/articles/${id}`)
        if (!res.ok) throw new Error('Article not found')
        const data = await res.json()
        setData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    fetchArticle()
  }, [id])

  if (error) return <ErrorState message={error} />
  if (loading || !data) return <LoadingState />

  const { article, extraction, source } = data
  const displayTickers = data.qualification?.screenableTickers?.length
    ? data.qualification.screenableTickers
    : extraction.extractedTickers

  function getTickerExcerpts(text: string, tickers: string[]): Record<string, string[]> {
    const sentences = text.split(/(?<=[.!?])\s+|\n+/).filter(Boolean)
    const excerpts: Record<string, string[]> = {}
    for (const t of tickers) {
      const pattern = new RegExp(`\\b${t}\\b`, 'i')
      const matches = sentences.filter(s => pattern.test(s)).map(s => s.trim())
      if (matches.length > 0) excerpts[t] = matches
    }
    return excerpts
  }

  const excerpts = article.cleanedText
    ? getTickerExcerpts(article.cleanedText, displayTickers)
    : {}

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Button variant="ghost" size="sm" className="gap-1 mb-2" onClick={() => router.back()}>
        <ArrowLeft className="h-3 w-3" /> Back
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base">{article.title}</CardTitle>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {extraction.firm && <FirmBadge firm={extraction.firm} />}
                {source.sourceClass && <SourceTypeBadge type={source.sourceClass} />}
                {source.sourceTier && <SourceTierBadge tier={source.sourceTier} />}
                {extraction.theme && <ThemeBadge theme={extraction.theme} />}
                {extraction.sector && extraction.sector.toLowerCase() !== extraction.theme?.toLowerCase() && <SectorBadge sector={extraction.sector} />}
                {data.qualification?.pageType && <PageTypeBadge pageType={data.qualification.pageType} />}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{source.name}</span>
            <span>-</span>
            <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
            {article.author && <><span>-</span><span>{article.author}</span></>}
            <a href={article.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline ml-auto">
              <ExternalLink className="h-3 w-3" /> Open original
            </a>
          </div>

          {displayTickers.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Screenable Tickers</p>
              <div className="flex flex-wrap gap-1">
                {displayTickers.map((t) => <TickerPill key={t} ticker={t} />)}
              </div>
            </div>
          )}

          {extraction.extractedCompanies.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Extracted Companies</p>
              <div className="flex flex-wrap gap-1">
                {extraction.extractedCompanies.map((c) => (
                  <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                ))}
              </div>
            </div>
          )}

          {data.qualification?.qualified && data.qualification.reason && (
            <p className="text-xs text-muted-foreground">Why shown: {data.qualification.reason}</p>
          )}

          {Object.keys(excerpts).length > 0 && (
            <div className="space-y-3 pt-2 border-t border-[#1F1F1F]">
              <p className="text-xs font-medium text-muted-foreground">Mentions by Ticker</p>
              {displayTickers.map((ticker) => {
                const tickerExcerpts = excerpts[ticker]
                if (!tickerExcerpts) return null
                return (
                  <div key={ticker} className="border-l-2 border-[#3B82F6]/40 pl-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-[#F59E0B]">{ticker}</span>
                      <span className="text-[11px] text-muted-foreground">{tickerExcerpts.length} mention{tickerExcerpts.length > 1 ? 's' : ''}</span>
                    </div>
                    <div className="space-y-1">
                      {tickerExcerpts.map((excerpt, i) => (
                        <p key={i} className="text-xs text-[#9CA3AF] leading-relaxed">
                          {excerpt.slice(0, 300)}{excerpt.length > 300 ? '...' : ''}
                        </p>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {Object.keys(excerpts).length === 0 && article.cleanedText && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Article Excerpt</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {article.cleanedText.slice(0, 1500)}
                {article.cleanedText.length > 1500 ? '...' : ''}
              </p>
            </div>
          )}

          <ThirteenFOverlapPanel overlaps={data.overlaps} />
        </CardContent>
      </Card>
    </div>
  )
}
