'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadingState } from '@/components/LoadingState'
import { TickerPill } from '@/components/TickerPill'
import { ThirteenFOverlapPanel } from '@/components/ThirteenFOverlapPanel'
import type { ConvictionListMember, ThirteenFOverlap } from '@/lib/storage/types'
import { Download, ExternalLink, Eye, FolderPlus, Plus, Upload } from 'lucide-react'

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
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    institution: '',
    listName: '',
    year: '',
    period: '',
    theme: '',
    sector: '',
    region: '',
    sourceUrl: '',
    confidence: 'needs_review',
    tickers: '',
    notes: '',
  })

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

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [])

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

  const handleAddList = async () => {
    setFormError(null)
    const res = await fetch('/api/conviction-lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })
    const data = await res.json()
    if (!res.ok) {
      setFormError(data.error ?? 'Could not create conviction list.')
      return
    }
    setDialogOpen(false)
    setFormData({
      institution: '',
      listName: '',
      year: '',
      period: '',
      theme: '',
      sector: '',
      region: '',
      sourceUrl: '',
      confidence: 'needs_review',
      tickers: '',
      notes: '',
    })
    await load()
  }

  if (error) return <ErrorState message={error} />
  if (loading) return <LoadingState />

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Conviction Lists</h1>
        <div className="flex gap-2">
          <a href="/conviction-lists.example.csv" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-1">
              <Download className="h-3 w-3" /> View CSV Template
            </Button>
          </a>
          <Button variant="outline" size="sm" className="gap-1" onClick={() => alert('Use: npm run conviction:import -- ./data/conviction-lists.csv')}>
            <Upload className="h-3 w-3" /> Import CSV
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger>
              <Button variant="outline" size="sm" className="gap-1">
                <Plus className="h-3 w-3" /> Add Conviction List
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Add Conviction List</DialogTitle></DialogHeader>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Institution" value={formData.institution} onChange={(value) => setFormData({ ...formData, institution: value })} />
                <Field label="List name" value={formData.listName} onChange={(value) => setFormData({ ...formData, listName: value })} />
                <Field label="Year" value={formData.year} onChange={(value) => setFormData({ ...formData, year: value })} />
                <Field label="Period" value={formData.period} onChange={(value) => setFormData({ ...formData, period: value })} />
                <Field label="Theme" value={formData.theme} onChange={(value) => setFormData({ ...formData, theme: value })} />
                <Field label="Sector" value={formData.sector} onChange={(value) => setFormData({ ...formData, sector: value })} />
                <Field label="Region" value={formData.region} onChange={(value) => setFormData({ ...formData, region: value })} />
                <div>
                  <label className="text-xs text-muted-foreground">Confidence</label>
                  <Select value={formData.confidence} onValueChange={(value) => setFormData({ ...formData, confidence: value ?? 'needs_review' })}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="needs_review">needs_review</SelectItem>
                      <SelectItem value="verified">verified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Field label="Source URL" value={formData.sourceUrl} onChange={(value) => setFormData({ ...formData, sourceUrl: value })} />
              <div>
                <label className="text-xs text-muted-foreground">Tickers comma-separated</label>
                <Textarea value={formData.tickers} onChange={(event) => setFormData({ ...formData, tickers: event.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Notes</label>
                <Textarea value={formData.notes} onChange={(event) => setFormData({ ...formData, notes: event.target.value })} />
              </div>
              {formError && <p className="text-xs text-red-500">{formError}</p>}
              <Button onClick={handleAddList}>Save Conviction List</Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      {lists.length === 0 ? (
        <EmptyState
          title="No conviction lists imported yet."
          description="Add a verified bank or firm stock-pick list, or import a CSV of named lists with 5+ screenable public equity tickers."
          actions={[
            { label: 'Add Conviction List', onClick: () => setDialogOpen(true) },
            { label: 'Import CSV', onClick: () => alert('Use: npm run conviction:import -- ./data/conviction-lists.csv') },
            { label: 'View CSV Template', onClick: () => window.open('/conviction-lists.example.csv', '_blank') },
          ]}
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

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} className="h-9 text-xs" />
    </div>
  )
}
