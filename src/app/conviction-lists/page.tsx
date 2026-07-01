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
import { ExternalLink, Eye, FolderPlus, Plus, Search, ClipboardPaste, Database } from 'lucide-react'

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

interface Diagnostics {
  totalLists: number
  needsReview: number
  verified: number
  seedAvailable: number
  partialCandidates: number
  listFinderWindow: { fromDate: string; toDate: string; yearLabel: number }
  generatedQueryCount: number
}

interface PageData {
  lists: ConvictionListData[]
  diagnostics: Diagnostics
}

interface PasteParseResult {
  institution: string
  listName: string
  displayName: string
  period?: string
  year?: number
  members: { ticker: string; companyName?: string; action?: string }[]
  sourceType: string
  confidence: string
}

interface QueryData {
  query: string
  bank: string
  category: string
}

export default function ConvictionListsPage() {
  const [data, setData] = useState<PageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [pasteDialogOpen, setPasteDialogOpen] = useState(false)
  const [queriesDialogOpen, setQueriesDialogOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [seedResult, setSeedResult] = useState<string | null>(null)
  const [pasteText, setPasteText] = useState('')
  const [parsedPaste, setParsedPaste] = useState<PasteParseResult | null>(null)
  const [queries, setQueries] = useState<QueryData[]>([])
  const [queryWindow, setQueryWindow] = useState<{ fromDate: string; toDate: string; yearLabel: number } | null>(null)
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
      setData(await res.json())
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
    const resData = await res.json()
    if (!res.ok) {
      setFormError(resData.error ?? 'Could not create conviction list.')
      return
    }
    setAddDialogOpen(false)
    setFormData({ institution: '', listName: '', year: '', period: '', theme: '', sector: '', region: '', sourceUrl: '', confidence: 'needs_review', tickers: '', notes: '' })
    await load()
  }

  const handleImportSeed = async () => {
    setSeedResult(null)
    const res = await fetch('/api/conviction-lists/import-seed', { method: 'POST' })
    const result = await res.json()
    setSeedResult(`Imported: ${result.imported}, Failed: ${result.failed}${result.failed > 0 ? '. Check console for details.' : ''}`)
    if (result.failed > 0) console.error('Seed import failures:', result.results?.filter((r: { success: boolean }) => !r.success))
    await load()
  }

  const handleParsePaste = async () => {
    if (!pasteText.trim()) return
    const res = await fetch('/api/conviction-lists/parse-paste', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: pasteText }),
    })
    const result = await res.json()
    setParsedPaste(result)
  }

  const handleSaveParsed = async () => {
    if (!parsedPaste) return
    const tickers = parsedPaste.members.map((m) => m.ticker).join(', ')
    const res = await fetch('/api/conviction-lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        institution: parsedPaste.institution,
        listName: parsedPaste.listName,
        year: String(parsedPaste.year ?? ''),
        period: parsedPaste.period ?? '',
        tickers,
      }),
    })
    if (res.ok) {
      setPasteDialogOpen(false)
      setPasteText('')
      setParsedPaste(null)
      await load()
    }
  }

  const handleLoadQueries = async () => {
    const res = await fetch('/api/conviction-lists/generate-search-queries')
    const result = await res.json()
    setQueries(result.queries ?? [])
    setQueryWindow(result.window ?? null)
    setQueriesDialogOpen(true)
  }

  if (error) return <ErrorState message={error} />
  if (loading || !data) return <LoadingState />

  const { lists, diagnostics } = data

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Conviction Lists</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1" onClick={handleLoadQueries}>
            <Search className="h-3 w-3" /> Search Queries
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={handleImportSeed}>
            <Database className="h-3 w-3" /> Seed Known 2026
          </Button>
          <Dialog open={pasteDialogOpen} onOpenChange={setPasteDialogOpen}>
            <DialogTrigger>
              <Button variant="outline" size="sm" className="gap-1">
                <ClipboardPaste className="h-3 w-3" /> Paste List
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader><DialogTitle>Paste List</DialogTitle></DialogHeader>
              <p className="text-xs text-muted-foreground">Format: header line with institution and list name, then ticker lines (TICKER - Company Name).</p>
              <Textarea value={pasteText} onChange={(e) => setPasteText(e.target.value)} rows={8} placeholder="BofA Fab Five Software Stocks for H2 2026&#10;SNOW - Snowflake&#10;DDOG - Datadog&#10;FROG - JFrog&#10;MDB - MongoDB&#10;TWLO - Twilio" />
              <Button onClick={handleParsePaste} disabled={!pasteText.trim()}>Parse</Button>
              {parsedPaste && (
                <div className="space-y-2 rounded border border-[#1F1F1F] bg-[#0A0A0A] p-3">
                  <p className="text-xs font-medium">{parsedPaste.institution} - {parsedPaste.listName}</p>
                  <p className="text-xs text-muted-foreground">{parsedPaste.members.length} tickers parsed</p>
                  <div className="flex flex-wrap gap-1">
                    {parsedPaste.members.map((m) => (
                      <TickerPill key={m.ticker} ticker={m.ticker} />
                    ))}
                  </div>
                  <Button size="sm" className="mt-2" onClick={handleSaveParsed}>Save List</Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger>
              <Button variant="outline" size="sm" className="gap-1">
                <Plus className="h-3 w-3" /> Add
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Add Conviction List</DialogTitle></DialogHeader>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Institution" value={formData.institution} onChange={(v) => setFormData({ ...formData, institution: v })} />
                <Field label="List name" value={formData.listName} onChange={(v) => setFormData({ ...formData, listName: v })} />
                <Field label="Year" value={formData.year} onChange={(v) => setFormData({ ...formData, year: v })} />
                <Field label="Period" value={formData.period} onChange={(v) => setFormData({ ...formData, period: v })} />
                <Field label="Theme" value={formData.theme} onChange={(v) => setFormData({ ...formData, theme: v })} />
                <Field label="Sector" value={formData.sector} onChange={(v) => setFormData({ ...formData, sector: v })} />
                <Field label="Region" value={formData.region} onChange={(v) => setFormData({ ...formData, region: v })} />
                <div>
                  <label className="text-xs text-muted-foreground">Confidence</label>
                  <Select value={formData.confidence} onValueChange={(v) => setFormData({ ...formData, confidence: v ?? 'needs_review' })}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="needs_review">needs_review</SelectItem>
                      <SelectItem value="verified">verified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Field label="Source URL" value={formData.sourceUrl} onChange={(v) => setFormData({ ...formData, sourceUrl: v })} />
              <div>
                <label className="text-xs text-muted-foreground">Tickers comma-separated</label>
                <Textarea value={formData.tickers} onChange={(e) => setFormData({ ...formData, tickers: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Notes</label>
                <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
              </div>
              {formError && <p className="text-xs text-red-500">{formError}</p>}
              <Button onClick={handleAddList}>Save Conviction List</Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {seedResult && (
        <div className="rounded-md border border-green-700 bg-green-900/20 px-3 py-2 text-xs text-green-400">
          {seedResult}
        </div>
      )}

      <div className="grid gap-2 md:grid-cols-5">
        <SummaryCell label="Imported lists" value={String(diagnostics.totalLists)} />
        <SummaryCell label="Verified" value={String(diagnostics.verified)} />
        <SummaryCell label="Needs review" value={String(diagnostics.needsReview)} />
        <SummaryCell label="Seed available" value={String(diagnostics.seedAvailable)} />
        <SummaryCell label="Partial candidates" value={String(diagnostics.partialCandidates)} />
      </div>

      {lists.length === 0 ? (
        <EmptyState
          title="No conviction lists imported yet."
          description="Import seed candidates, paste a list, or add a verified bank stock-pick list with 3+ screenable public equity tickers."
          actions={[
            { label: 'Seed Known 2026 Candidates', onClick: handleImportSeed },
            { label: 'Paste a List', onClick: () => setPasteDialogOpen(true) },
            { label: 'Search Queries', onClick: handleLoadQueries },
          ]}
        />
      ) : (
        <>
          {lists.filter((l) => l.confidence === 'verified').length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-green-400">Verified Lists</h2>
              <div className="grid gap-3 xl:grid-cols-2">
                {lists.filter((l) => l.confidence === 'verified').map((list) => renderListCard(list))}
              </div>
            </div>
          )}
          {lists.filter((l) => l.confidence === 'needs_review').length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-yellow-400">Needs Review</h2>
              <div className="grid gap-3 xl:grid-cols-2">
                {lists.filter((l) => l.confidence === 'needs_review').map((list) => renderListCard(list, true))}
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={queriesDialogOpen} onOpenChange={setQueriesDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Sell-Side List Finder Queries</DialogTitle></DialogHeader>
          {queryWindow && (
            <p className="text-xs text-muted-foreground">
              Window: {new Date(queryWindow.fromDate).toLocaleDateString()} → {new Date(queryWindow.toDate).toLocaleDateString()} (year {queryWindow.yearLabel})
            </p>
          )}
          {queryWindow && (
            <p className="text-xs text-muted-foreground">
              Source-type explanation: Official bank pages are verified evidence. Media summaries are allowed as list evidence but start as needs_review.
            </p>
          )}
          <p className="text-xs text-muted-foreground">{queries.length} queries generated</p>
          <div className="max-h-96 space-y-1 overflow-y-auto">
            {queries.map((q, i) => (
              <div key={i} className="flex items-center justify-between rounded border border-[#1F1F1F] px-3 py-1.5 text-xs">
                <span>{q.query}</span>
                <div className="flex gap-1">
                  <Badge variant="outline" className="text-[10px]">{q.bank}</Badge>
                  <button
                    className="text-blue-400 hover:text-blue-300"
                    onClick={() => navigator.clipboard.writeText(q.query)}
                  >
                    Copy
                  </button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )

  function renderListCard(list: ConvictionListData, _showReviewActions?: boolean) {
    return (
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
            {list.sourceType && <span>Source: {list.sourceType.replace('_', ' ')}</span>}
            <span>Updated: {new Date(list.updatedAt).toLocaleDateString()}</span>
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
    )
  }
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#1F1F1F] bg-[#0A0A0A] px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-[#6B7280]">{label}</div>
      <div className="text-lg font-semibold text-[#E5E7EB]">{value}</div>
    </div>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground">{label}</label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-9 text-xs" />
    </div>
  )
}
