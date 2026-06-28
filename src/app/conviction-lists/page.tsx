'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadingState } from '@/components/LoadingState'
import { TickerPill } from '@/components/TickerPill'
import { ThirteenFOverlapPanel } from '@/components/ThirteenFOverlapPanel'
import type { ConvictionListMember, ThirteenFOverlap } from '@/lib/storage/types'
import { ExternalLink, Eye, FolderPlus } from 'lucide-react'

interface ConvictionListData {
  id: string
  slug: string
  institution: string
  listName: string
  displayName: string
  year?: number
  period?: string
  theme?: string
  sector?: string
  region?: string
  sourceUrl?: string
  sourceType: string
  accessStatus?: string
  confidence: 'verified' | 'needs_review'
  updatedAt: string
  members: ConvictionListMember[]
  tickers: string[]
  tickerCount: number
  overlaps?: ThirteenFOverlap[]
}

export default function ConvictionListsPage() {
  const [lists, setLists] = useState<ConvictionListData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/conviction-lists')
        if (!res.ok) throw new Error('Failed to load conviction lists')
        setLists(await res.json())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load conviction lists')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const saveBasket = async (list: ConvictionListData) => {
    await fetch('/api/baskets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `${list.institution} ${list.listName}`,
        firm: list.institution,
        theme: list.theme ?? list.listName,
        sector: list.sector,
        region: list.region,
        notes: `Saved from conviction list ${list.displayName}.`,
        tickers: list.tickers,
      }),
    })
  }

  const addAllToWatchlist = async (list: ConvictionListData) => {
    for (const ticker of list.tickers) {
      await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker }),
      })
    }
  }

  if (error) return <ErrorState message={error} />
  if (loading) return <LoadingState />

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">Conviction Lists</h1>
      {lists.length === 0 ? (
        <EmptyState
          title="No curated conviction lists yet"
          description="Import only named, verified institution lists with 5+ screenable public equity tickers."
        />
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {lists.map((list) => (
            <Card key={list.id} className="border border-[#1F1F1F] bg-[#0A0A0A]">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-[#E5E7EB]">{list.displayName}</h2>
                    <p className="mt-1 text-xs text-[#9CA3AF]">Institution: {list.institution}</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1">
                    <Badge variant="outline" className="text-xs capitalize">{list.confidence.replace('_', ' ')}</Badge>
                    <Badge variant="secondary" className="text-xs">{list.tickerCount} tickers</Badge>
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#9CA3AF]">
                  {list.year && <span>Year: {list.year}</span>}
                  {list.period && <span>Period: {list.period}</span>}
                  {list.theme && <span>Theme: {list.theme}</span>}
                  {list.sector && <span>Sector: {list.sector}</span>}
                  {list.region && <span>Region: {list.region}</span>}
                  {list.accessStatus && <span>Access: {list.accessStatus}</span>}
                  <span>Last updated: {new Date(list.updatedAt).toLocaleDateString()}</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {list.tickers.map((ticker) => (
                    <TickerPill key={ticker} ticker={ticker} />
                  ))}
                </div>

                <ThirteenFOverlapPanel overlaps={list.overlaps} />

                <div className="flex flex-wrap gap-1 border-t border-[#1F1F1F] pt-2">
                  <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => saveBasket(list)}>
                    <FolderPlus className="h-3 w-3" /> Save as basket
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => addAllToWatchlist(list)}>
                    <Eye className="h-3 w-3" /> Add all to watchlist
                  </Button>
                  {list.sourceUrl && (
                    <a href={list.sourceUrl} target="_blank" rel="noopener noreferrer" className="ml-auto">
                      <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                        <ExternalLink className="h-3 w-3" /> Open source
                      </Button>
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
