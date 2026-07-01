'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingState } from '@/components/LoadingState'
import { ErrorState } from '@/components/ErrorState'
import { ArrowLeft, Save, PlusCircle, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface ConvictionListMember {
  id: string
  ticker: string
  companyName?: string
  rank?: number
  weight?: number
  action?: string
  note?: string
  sourceText?: string
}

interface ConvictionListData {
  id: string
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
  sourcePublisher?: string
  confidence: 'verified' | 'needs_review'
  reviewStatus: 'needs_review' | 'verified' | 'rejected'
  members: ConvictionListMember[]
  tickers: string[]
}

export function ConvictionListDetailPage({ id }: { id: string }) {
  const [data, setData] = useState<ConvictionListData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchList = async () => {
      try {
        const res = await fetch(`/api/conviction-lists/${id}`)
        if (!res.ok) throw new Error('Conviction list not found')
        const data = await res.json()
        setData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    fetchList()
  }, [id])

  if (error) return <ErrorState message={error} />
  if (loading || !data) return <LoadingState />

  const handleReviewAction = async (action: 'verified' | 'needs_review' | 'rejected') => {
    // Implement review action PATCH to /api/conviction-lists/${id}
    await fetch(`/api/conviction-lists/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewStatus: action, confidence: action === 'rejected' ? 'needs_review' : action === 'verified' ? 'verified' : 'needs_review' }),
    })
    router.refresh()
  }

  const handleSaveAsBasket = async () => {
    // POST /api/baskets
    const res = await fetch('/api/baskets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `${data.institution} ${data.listName}`, tickers: data.tickers }),
    })
    if (res.ok) alert('Basket saved')
  }

  const handleAddToWatchlist = async () => {
    // POST /api/watchlist
    let added = 0
    let skipped = 0
    for(const ticker of data.tickers) {
        const res = await fetch('/api/watchlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticker }),
        })
        const result = await res.json()
        if (result.duplicate) skipped++
        else added++
    }
    alert(`Added ${added}, skipped ${skipped}`)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <Button variant="ghost" size="sm" className="gap-1 mb-2" onClick={() => router.back()}>
        <ArrowLeft className="h-3 w-3" /> Back
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle>{data.displayName}</CardTitle>
            <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleReviewAction('verified')}><CheckCircle className="h-4 w-4 mr-1"/> Verify</Button>
                <Button variant="outline" size="sm" onClick={() => handleReviewAction('needs_review')}><AlertCircle className="h-4 w-4 mr-1"/> Needs Review</Button>
                <Button variant="destructive" size="sm" onClick={() => handleReviewAction('rejected')}><XCircle className="h-4 w-4 mr-1"/> Reject</Button>
                <Button variant="default" size="sm" onClick={handleSaveAsBasket}><Save className="h-4 w-4 mr-1"/> Save Basket</Button>
                <Button variant="default" size="sm" onClick={handleAddToWatchlist}><PlusCircle className="h-4 w-4 mr-1"/> Watchlist</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div><strong>Institution:</strong> {data.institution}</div>
                <div><strong>Year/Period:</strong> {data.year} {data.period}</div>
                <div><strong>Theme/Sector:</strong> {data.theme} / {data.sector}</div>
                <div><strong>Confidence:</strong> {data.confidence}</div>
                <div><strong>Review Status:</strong> {data.reviewStatus}</div>
            </div>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Rank</TableHead>
                        <TableHead>Ticker</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Action</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.members.map((m) => (
                        <TableRow key={m.id}>
                            <TableCell>{m.rank}</TableCell>
                            <TableCell>{m.ticker}</TableCell>
                            <TableCell>{m.companyName}</TableCell>
                            <TableCell>{m.action}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  )
}
