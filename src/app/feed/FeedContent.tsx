'use client'

import { useEffect, useState, useCallback } from 'react'
import { ArticleCard } from '@/components/ArticleCard'
import { FilterBar } from '@/components/FilterBar'
import { EmptyState } from '@/components/EmptyState'
import { LoadingState } from '@/components/LoadingState'
import { ErrorState } from '@/components/ErrorState'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSnapJudgementUrl } from '@/lib/integrations/snapJudgement'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ArticleData {
  id: string
  title: string
  url?: string
  sourceName: string
  sourceType: string
  sourceClass?: string
  sourceTier?: string
  firm?: string
  publishedAt: string
  theme?: string
  sector?: string
  pageType?: string
  tickers: string[]
  score: number
  reasonShown?: string
}

type FeedWindow = '7d' | '30d' | '90d' | 'all'

const WINDOW_LABELS: Record<FeedWindow, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  all: 'All eligible',
}

export function FeedPage() {
  const [articles, setArticles] = useState<ArticleData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [firmFilter, setFirmFilter] = useState('')
  const [sectorFilter, setSectorFilter] = useState('')
  const [scanning, setScanning] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedWindow = searchParams.get('window')
  const windowFilter: FeedWindow = requestedWindow === '7d' || requestedWindow === '90d' || requestedWindow === 'all'
    ? requestedWindow
    : '30d'

  const fetchArticles = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (firmFilter) params.set('firm', firmFilter)
      if (sectorFilter) params.set('sector', sectorFilter)
      params.set('window', windowFilter)

      const res = await fetch(`/api/articles?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setArticles(Array.isArray(data) ? data : data.articles)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feed')
    } finally {
      setLoading(false)
    }
  }, [search, firmFilter, sectorFilter, windowFilter])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchArticles() }, [fetchArticles])

  const uniqueFirms = [...new Set(articles.map(a => a.firm).filter(Boolean) as string[])]
  const uniqueSectors = [...new Set(articles.map(a => a.sector).filter(Boolean) as string[])]

  const handleFeedback = async (articleId: string, action: string) => {
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleId, action }),
    })
  }

  const handleAnalyze = (article: ArticleData) => {
    window.open(getSnapJudgementUrl(article.tickers), '_blank', 'noopener,noreferrer')
  }

  const handleSaveBasket = async (article: ArticleData) => {
    const name = [article.firm, article.theme, 'Basket'].filter(Boolean).join(' ') || `Basket from ${article.title.slice(0, 40)}`
    await fetch('/api/baskets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        articleId: article.id,
        firm: article.firm,
        theme: article.theme,
        sector: article.sector,
        tickers: article.tickers,
      }),
    })
    handleFeedback(article.id, 'save_basket')
  }

  const handleRunScan = async () => {
    setScanning(true)
    try {
      await fetch('/api/scan/trigger', { method: 'POST' })
      await fetchArticles()
    } finally {
      setScanning(false)
    }
  }

  const handleWindowChange = (value: string | null) => {
    const nextWindow: FeedWindow = value === '7d' || value === '90d' || value === 'all' ? value : '30d'
    const params = new URLSearchParams(searchParams.toString())
    params.set('window', nextWindow)
    router.replace(`/feed?${params.toString()}`)
  }

  if (error) return <ErrorState message={error} />
  if (loading) return <LoadingState />

  return (
    <div>
      <h1 className="text-lg font-semibold mb-4">Feed</h1>

      <div className="flex flex-wrap items-center gap-2 mb-2">
        <FilterBar
          firms={uniqueFirms}
          sectors={uniqueSectors}
          selectedFirm={firmFilter}
          selectedSector={sectorFilter}
          searchQuery={search}
          onFirmChange={setFirmFilter}
          onSectorChange={setSectorFilter}
          onSearchChange={setSearch}
        />
        <div className="mb-4 flex items-center gap-2">
          <span className="text-xs text-[#9CA3AF]">Window</span>
          <Select value={windowFilter} onValueChange={handleWindowChange}>
            <SelectTrigger className="h-9 w-[150px] border-[#1F1F1F] bg-[#0A0A0A] text-xs text-[#D1D5DB]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All eligible</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="mb-4 text-xs text-[#6B7280]">
        {articles.length} result{articles.length === 1 ? '' : 's'} - Showing qualified institutional research {windowFilter === 'all' ? 'from all eligible dates' : `from the ${WINDOW_LABELS[windowFilter].toLowerCase()}`}.
      </p>

      {articles.length === 0 ? (
        <EmptyState
          title={`No qualified institutional research in the ${WINDOW_LABELS[windowFilter].toLowerCase()}.`}
          description={windowFilter === 'all' ? 'Run a scan across enabled institutional sources, or review the source catalog.' : 'Try a wider time window or run a fresh scan.'}
          actions={[
            ...(windowFilter !== '90d' && windowFilter !== 'all'
              ? [{ label: 'Switch to 90 days', onClick: () => handleWindowChange('90d') }]
              : []),
            ...(windowFilter !== 'all'
              ? [{ label: 'Show all eligible', onClick: () => handleWindowChange('all') }]
              : []),
            { label: scanning ? 'Scanning...' : 'Run Scan', onClick: handleRunScan },
            { label: 'Go to Sources', onClick: () => router.push('/sources') },
          ]}
        />
      ) : (
        <div className="space-y-3">
          {articles.map((a) => (
            <ArticleCard
              key={a.id}
              id={a.id}
              title={a.title}
              url={a.url}
              source={a.sourceName}
              firm={a.firm}
              sourceType={a.sourceType}
              sourceClass={a.sourceClass}
              sourceTier={a.sourceTier}
              publishedAt={a.publishedAt}
              theme={a.theme}
              sector={a.sector}
              pageType={a.pageType}
              tickers={a.tickers}
              reasonShown={a.reasonShown}
              onSaveBasket={() => handleSaveBasket(a)}
              onRunMetrics={() => router.push(`/article/${a.id}`)}
              onAddAllToWatchlist={async () => {
                for (const t of a.tickers) {
                  await fetch('/api/watchlist', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ticker: t }),
                  })
                }
              }}
              onAnalyze={() => handleAnalyze(a)}
              onMoreLikeThis={() => handleFeedback(a.id, 'more_like_this')}
              onLessLikeThis={() => handleFeedback(a.id, 'less_like_this')}
              onHideSource={() => handleFeedback(a.id, 'hide_source')}
            />
          ))}
        </div>
      )}
    </div>
  )
}
