'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { LoadingState } from '@/components/LoadingState'
import { ErrorState } from '@/components/ErrorState'
import Link from 'next/link'

export default function SellSideListFinderPage() {
  const [windowInfo, setWindowInfo] = useState<{ from: string; to: string } | null>(null)
  const [queries, setQueries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/sell-side-list-finder/queries')
      .then(res => res.json())
      .then(data => {
        setWindowInfo({
            from: new Date(data.window.fromDate).toLocaleDateString(),
            to: new Date(data.window.toDate).toLocaleDateString()
        })
        setQueries(data.queries)
        setLoading(false)
      })
  }, [])

  if (loading) return <LoadingState />

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Sell-Side List Finder</h1>
        <Link href="/conviction-lists">
            <Button variant="outline">Back to Conviction Lists</Button>
        </Link>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Current Search Window</CardTitle>
        </CardHeader>
        <CardContent>
          {windowInfo?.from} → {windowInfo?.to}
          <p className="text-xs text-muted-foreground mt-2">Year-ahead, Q1, H1, and H2 sell-side stock-pick lists usually start appearing in December of the prior year.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Query Generator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {queries.map((q: any, i: number) => (
            <div key={i} className="flex justify-between items-center border p-2 rounded">
              <span className="text-sm">{q.bank}: {q.query}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(q.query)}>Copy</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">Media summaries can be used as evidence for needs-review Conviction Lists, but they are not feed sources.</p>
    </div>
  )
}
