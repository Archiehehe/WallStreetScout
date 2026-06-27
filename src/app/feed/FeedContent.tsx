'use client'

import { useEffect, useState, useCallback } from 'react'
import { ArticleCard } from '@/components/ArticleCard'
import { FilterBar } from '@/components/FilterBar'
import { EmptyState } from '@/components/EmptyState'
import { LoadingState } from '@/components/LoadingState'
import { ErrorState } from '@/components/ErrorState'
import { useRouter } from 'next/navigation'
import { getSnapJudgementUrl } from '@/lib/integrations/snapJudgement'

interface ArticleData {
  id: string
  title: string
  url?: string
  sourceName: string
  sourceType: string
  firm?: string
  publishedAt: string
  theme?: string
  sector?: string
  tickers: string[]
  score: number
  reasonShown?: string
}

export function FeedPage() {
  const [articles, setArticles] = useState<ArticleData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [firmFilter, setFirmFilter] = useState('')
  const [sectorFilter, setSectorFilter] = useState('')
  const router = useRouter()

  const fetchArticles = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (firmFilter) params.set('firm', firmFilter)
      if (sectorFilter) params.set('sector', sectorFilter)

      const res = await fetch(`/api/articles?${params}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setArticles(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feed')
    } finally {
      setLoading(false)
    }
  }, [search, firmFilter, sectorFilter])

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

  if (error) return <ErrorState message={error} />
  if (loading) return <LoadingState />

  return (
    <div>
      <h1 className="text-lg font-semibold mb-4">Feed</h1>

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

      {articles.length === 0 ? (
        <EmptyState
          title="No institutional ideas yet"
          description="Add a source to start building your feed. Articles are fetched automatically via API and parsers."
          actions={[
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
              publishedAt={a.publishedAt}
              theme={a.theme}
              sector={a.sector}
              tickers={a.tickers}
              score={a.score}
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
