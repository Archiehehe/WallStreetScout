'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
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
import { ExternalLink, Eye, FolderPlus, Plus, Search, ClipboardPaste, Database, CheckCircle2, XCircle, Clock } from 'lucide-react'

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
  sourcePublisher?: string
  accessStatus?: string
  confidence: 'verified' | 'needs_review'
  reviewStatus?: string
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

interface ImportResult {
  ok: boolean
  message: string
  created: number
  updated: number
  skipped: number
  failed: number
  total: number
  errors: { institution: string; listName: string; errors: string[] }[]
}

export default function ConvictionListsPage() {
  const [data, setData] = useState<PageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [pasteDialogOpen, setPasteDialogOpen] = useState(false)
  const [queriesDialogOpen, setQueriesDialogOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
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
  const [filters, setFilters] = useState({
    search: '',
    institution: '',
    year: '',
    theme: '',
    sector: '',
    reviewStatus: '',
    confidence: '',
    sourceType: '',
    sortBy: 'updatedAt',
    sortOrder: 'desc',
  })

  const load = async () => {
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })
      const res = await fetch(`/api/conviction-lists?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to load conviction lists')
      setData(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conviction lists')
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(() => { load() }, [filters])

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
    setImportResult(null)
    const res = await fetch('/api/conviction-lists/import-seed', { method: 'POST' })
    const result = await res.json()
    setImportResult(result)
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

  const handleReviewAction = async (listId: string, action: 'verified' | 'needs_review' | 'rejected') => {
    try {
      const updates: Partial<{ confidence: 'verified' | 'needs_review'; reviewStatus: 'verified' | 'needs_review' | 'rejected' }> = {}
      if (action === 'verified') {
        updates.confidence = 'verified'
        updates.reviewStatus = 'verified'
      } else if (action === 'needs_review') {
        updates.confidence = 'needs_review'
        updates.reviewStatus = 'needs_review'
      } else if (action === 'rejected') {
        updates.reviewStatus = 'rejected'
      }

      const res = await fetch(`/api/conviction-lists/${listId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (res.ok) {
        await load()
      }
    } catch (err) {
      console.error('Failed to update review status:', err)
    }
  }

  if (error) return <ErrorState message={error} />
  if (loading || !data) return <LoadingState />

  const { lists, diagnostics } = data

  // Get unique values for filter options
  const institutions = Array.from(new Set(data.lists.map((l) => l.institution))).sort()
  const years = Array.from(new Set(data.lists.map((l) => l.year).filter((y): y is number => y !== undefined))).sort((a, b) => b - a)
  const themes = Array.from(new Set(data.lists.map((l) => l.theme).filter((t): t is string => t !== undefined))).sort()
  const sectors = Array.from(new Set(data.lists.map((l) => l.sector).filter((s): s is string => s !== undefined))).sort()

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Conviction Lists</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1" onClick={handleLoadQueries}>
            <Search className="h-3 w-3" /> Search Queries
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={handleImportSeed}>
            <Database className="h-3 w-3" /> Import Starter Lists ({diagnostics.seedAvailable})
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

      {/* Import Result */}
      {importResult && (
        <div className="rounded-md border border-[#1F1F1F] bg-[#0A0A0A] p-4">
          <h3 className="text-sm font-medium mb-2">{importResult.message}</h3>
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{importResult.created}</div>
              <div className="text-xs text-muted-foreground">Created</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{importResult.updated}</div>
              <div className="text-xs text-muted-foreground">Updated</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-400">{importResult.skipped}</div>
              <div className="text-xs text-muted-foreground">Skipped</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{importResult.failed}</div>
              <div className="text-xs text-muted-foreground">Failed</div>
            </div>
          </div>
          {importResult.errors.length > 0 && (
            <details>
              <summary className="text-xs cursor-pointer">View failed items</summary>
              <div className="mt-2 space-y-2 text-xs">
                {importResult.errors.map((item, i) => (
                  <div key={i} className="rounded border border-red-800 bg-red-900/20 p-2">
                    <div className="font-medium">{item.institution} - {item.listName}</div>
                    <div className="text-red-400">{item.errors.join(', ')}</div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 p-4 rounded-md border border-[#1F1F1F] bg-[#0A0A0A]">
        <div className="col-span-2 md:col-span-4 lg:col-span-6">
          <Input
            placeholder="Search lists..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="h-9 text-xs"
          />
        </div>
        <Select value={filters.institution || ''} onValueChange={(v) => setFilters({ ...filters, institution: v || '' })}>
          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Institution" /></SelectTrigger>
          <SelectContent>
            {institutions.map((inst) => (
              <SelectItem key={inst} value={inst}>{inst}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.year || ''} onValueChange={(v) => setFilters({ ...filters, year: v || '' })}>
          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Year" /></SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={String(year)}>{year}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.theme || ''} onValueChange={(v) => setFilters({ ...filters, theme: v || '' })}>
          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Theme" /></SelectTrigger>
          <SelectContent>
            {themes.map((theme) => (
              <SelectItem key={theme} value={theme}>{theme}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.sector || ''} onValueChange={(v) => setFilters({ ...filters, sector: v || '' })}>
          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Sector" /></SelectTrigger>
          <SelectContent>
            {sectors.map((sector) => (
              <SelectItem key={sector} value={sector}>{sector}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.reviewStatus || ''} onValueChange={(v) => setFilters({ ...filters, reviewStatus: v || '' })}>
          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Review Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="needs_review">Needs Review</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.confidence || ''} onValueChange={(v) => setFilters({ ...filters, confidence: v || '' })}>
          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Confidence" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="needs_review">Needs Review</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.sourceType || ''} onValueChange={(v) => setFilters({ ...filters, sourceType: v || '' })}>
          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Source Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="official_page">Official Page</SelectItem>
            <SelectItem value="official_pdf">Official PDF</SelectItem>
            <SelectItem value="media_summary">Media Summary</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="csv">CSV</SelectItem>
            <SelectItem value="paste">Paste</SelectItem>
            <SelectItem value="api">API</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.sortBy || 'updatedAt'} onValueChange={(v) => setFilters({ ...filters, sortBy: v || 'updatedAt' })}>
          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Sort By" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="updatedAt">Updated At</SelectItem>
            <SelectItem value="createdAt">Created At</SelectItem>
            <SelectItem value="institution">Institution</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.sortOrder || 'desc'} onValueChange={(v) => setFilters({ ...filters, sortOrder: v || 'desc' })}>
          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Sort Order" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">Descending</SelectItem>
            <SelectItem value="asc">Ascending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cells */}
      <div className="grid gap-2 md:grid-cols-5">
        <SummaryCell label="Imported lists" value={String(diagnostics.totalLists)} />
        <SummaryCell label="Verified" value={String(diagnostics.verified)} />
        <SummaryCell label="Needs Review" value={String(diagnostics.needsReview)} />
        <SummaryCell label="Seed Available" value={String(diagnostics.seedAvailable)} />
        <SummaryCell label="Partial Candidates" value={String(diagnostics.partialCandidates)} />
      </div>

      {/* Lists */}
      {lists.length === 0 ? (
        <EmptyState
          title="No conviction lists imported yet."
          description="Import seed candidates, paste a list, or add a verified bank stock-pick list with 3+ screenable public equity tickers."
          actions={[
            { label: 'Import Starter Lists', onClick: handleImportSeed },
            { label: 'Paste a List', onClick: () => setPasteDialogOpen(true) },
            { label: 'Search Queries', onClick: handleLoadQueries },
          ]}
        />
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {lists.map((list) => renderListCard(list, handleReviewAction))}
        </div>
      )}

      {/* Search Queries Dialog */}
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

  function renderListCard(list: ConvictionListData, onReviewAction: (id: string, action: 'verified' | 'needs_review' | 'rejected') => Promise<void>) {
    return (
      <Card key={list.id} className="border border-[#1F1F1F] bg-[#0A0A0A]">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Link href={`/conviction-lists/${list.id}`} className="text-sm font-semibold text-[#E5E7EB] hover:underline">{list.displayName}</Link>
              <p className="mt-1 text-xs text-[#9CA3AF]">Institution: {list.institution}</p>
            </div>
            <div className="flex flex-wrap justify-end gap-1">
              <Badge variant="outline" className="text-xs capitalize">{list.confidence.replace('_', ' ')}</Badge>
              {list.reviewStatus && (
                <Badge variant="outline" className="text-xs capitalize">{list.reviewStatus.replace('_', ' ')}</Badge>
              )}
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
            {list.sourcePublisher && <span>Publisher: {list.sourcePublisher}</span>}
            <span>Updated: {new Date(list.updatedAt).toLocaleDateString()}</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {list.tickers.map((ticker) => (
              <TickerPill key={ticker} ticker={ticker} />
            ))}
          </div>

          <ThirteenFOverlapPanel overlaps={list.overlaps} />

          {/* Review Actions */}
          <div className="flex flex-wrap gap-2 border-t border-[#1F1F1F] pt-2">
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => onReviewAction(list.id, 'verified')}>
              <CheckCircle2 className="h-3 w-3" /> Mark Verified
            </Button>
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => onReviewAction(list.id, 'needs_review')}>
              <Clock className="h-3 w-3" /> Keep Needs Review
            </Button>
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => onReviewAction(list.id, 'rejected')}>
              <XCircle className="h-3 w-3" /> Reject
            </Button>
            <div className="ml-auto flex gap-2">
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => saveBasket(list)}>
                <FolderPlus className="h-3 w-3" /> Save as basket
              </Button>
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => addAllToWatchlist(list)}>
                <Eye className="h-3 w-3" /> Add all to watchlist
              </Button>
              {list.sourceUrl && (
                <a href={list.sourceUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                    <ExternalLink className="h-3 w-3" /> Open source
                  </Button>
                </a>
              )}
            </div>
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
