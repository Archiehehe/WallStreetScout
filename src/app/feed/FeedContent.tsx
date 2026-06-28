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
interface DiagnosticsData {
  sources: { enabled: number }
  latestScanRun?: { id: string; status?: string } | null
  scanSummary: {
    sourcesScanned: number
    urlsFound: number
    articlesRejected: number
    articlesFailed: number
    commonRejectionReasons: Array<{ reason: string; count: number }>
  }
}

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
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(null)
  const [search, setSearch] = useState('')
  const [firmFilter, setFirmFilter] = useState('')
  const [sectorFilter, setSectorFilter] = useState('')
  const [sourceTierFilter, setSourceTierFilter] = useState('')
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
      if (sourceTierFilter) params.set('sourceTier', sourceTierFilter)
      params.set('window', windowFilter)

      const res = await fetch(`/api/articles?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setArticles(Array.isArray(data) ? data : data.articles)
      const diagnosticsRes = await fetch('/api/diagnostics')
      if (diagnosticsRes.ok) setDiagnostics(await diagnosticsRes.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feed')
    } finally {
      setLoading(false)
    }
  }, [search, firmFilter, sectorFilter, sourceTierFilter, windowFilter])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchArticles() }, [fetchArticles])

  const uniqueFirms = [...new Set(articles.map(a => a.firm).filter(Boolean) as string[])]
  const realSectorNames = new Set(['Communication Services', 'Consumer Discretionary', 'Consumer Staples', 'Energy', 'Financials', 'Health Care', 'Industrials', 'Information Technology', 'Materials', 'Real Estate', 'Utilities'])
  const uniqueSectors = [...new Set(articles.map(a => a.sector).filter((sector): sector is string => Boolean(sector) && realSectorNames.has(sector as string)))]

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
          firmLabel="All institutions"
          sectorLabel="All sectors"
        />
        <div className="mb-4 flex items-center gap-2">
          <span className="text-xs text-[#9CA3AF]">Tier</span>
          <Select value={sourceTierFilter || 'all'} onValueChange={(value) => setSourceTierFilter(!value || value === 'all' ? '' : value)}>
            <SelectTrigger className="h-9 w-[130px] border-[#1F1F1F] bg-[#0A0A0A] text-xs text-[#D1D5DB]">
              <SelectValue placeholder="All tiers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tiers</SelectItem>
              <SelectItem value="core">Core</SelectItem>
              <SelectItem value="secondary">Secondary</SelectItem>
              <SelectItem value="archive">Archive</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
        <div className="space-y-3">
          <div className="rounded-md border border-[#1F1F1F] bg-[#0A0A0A] p-4">
            <h2 className="text-sm font-semibold text-[#E5E7EB]">No qualified institutional research in the selected window.</h2>
            <p className="mt-2 text-xs text-[#9CA3AF]">
              {diagnostics?.latestScanRun
                ? diagnostics.scanSummary.urlsFound > 0
                  ? 'Latest scan found articles, but none passed the 3+ screenable ticker and research-idea filters.'
                  : 'Latest scan ran, but no source URLs were found.'
                : 'No scan has run yet. Run a scan to collect institutional research from enabled core sources.'}
            </p>
            {diagnostics && (
              <div className="mt-3 grid gap-2 text-xs md:grid-cols-4">
                <DiagnosticFact label="Sources enabled" value={String(diagnostics.sources.enabled)} />
                <DiagnosticFact label="Sources scanned" value={String(diagnostics.scanSummary.sourcesScanned)} />
                <DiagnosticFact label="URLs found" value={String(diagnostics.scanSummary.urlsFound)} />
                <DiagnosticFact label="Articles rejected" value={String(diagnostics.scanSummary.articlesRejected)} />
              </div>
            )}
            {diagnostics?.scanSummary.commonRejectionReasons.length ? (
              <div className="mt-3">
                <p className="mb-1 text-xs font-medium text-[#D1D5DB]">Common rejection reasons</p>
                <ul className="list-disc space-y-1 pl-5 text-xs text-[#9CA3AF]">
                  {diagnostics.scanSummary.commonRejectionReasons.slice(0, 4).map((item) => (
                    <li key={item.reason}>{item.reason} ({item.count})</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
          <EmptyState
            title="Strict feed gates are active"
            description="Empty is acceptable when no article has 3+ validated screenable public equity tickers from an eligible institutional research page."
            actions={[
              { label: scanning ? 'Scanning...' : 'Run Scan', onClick: handleRunScan },
              ...(windowFilter !== '90d' && windowFilter !== 'all'
                ? [{ label: 'Show 90 days', onClick: () => handleWindowChange('90d') }]
                : []),
              ...(windowFilter !== 'all'
                ? [{ label: 'Show all eligible', onClick: () => handleWindowChange('all') }]
                : []),
              { label: 'Go to Sources', onClick: () => router.push('/sources') },
              { label: 'View Scan Diagnostics', onClick: () => router.push('/diagnostics') },
            ]}
          />
        </div>
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

function DiagnosticFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#1F1F1F] px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-[#6B7280]">{label}</div>
      <div className="text-sm font-semibold text-[#E5E7EB]">{value}</div>
    </div>
  )
}
