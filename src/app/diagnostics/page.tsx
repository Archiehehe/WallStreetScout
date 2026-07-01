'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { LoadingState } from '@/components/LoadingState'
import { ErrorState } from '@/components/ErrorState'
import { Activity, Database, RefreshCw } from 'lucide-react'

interface ParserCoverageItem {
  name: string
  domain: string
  parserKey: string | null
  parserExists: boolean
  enabled: boolean
  sourceTier: string
}

interface FeedDiagnostics {
  enabledSources: number
  parserCoverage: ParserCoverageItem[]
  latestScan: {
    status?: string
    startedAt?: string
    finishedAt?: string
    articleCandidatesAttempted: number
    feedSaved: number
    feedRejected: number
    feedFailed: number
  } | null
  note: string
}

interface ConvictionListDiagnostics {
  importedLists: number
  totalMembers: number
  needsReview: number
  verified: number
  seedAvailable: number
  partialCandidates: number
  listFinderWindow: { fromDate: string; toDate: string; yearLabel: number }
  generatedQueryCount: number
}

interface DiagnosticsData {
  sources: { total: number; enabled: number; enabledCore: number; enabledMedia: number; expectedCore: number; parserCoverage: ParserCoverageItem[]; registeredParsers: number }
  feed?: FeedDiagnostics
  convictionLists?: ConvictionListDiagnostics
  latestScanRun?: {
    id: string
    startedAt?: string
    finishedAt?: string
    status?: string
    urlsFound?: number
    articlesParsed?: number
    articlesSaved?: number
  } | null
  scanSummary: {
    startedAt?: string
    finishedAt?: string
    status?: string
    sourcesScanned: number
    urlsFound: number
    urlsAttempted: number
    articlesSaved: number
    articlesRejected: number
    articlesFailed: number
    commonRejectionReasons: Array<{ reason: string; count: number }>
    skippedBreakdown?: Array<{ reason: string; count: number; exampleSource: string; exampleUrl: string }>
    rejectionBreakdown?: Array<{ category: string; count: number; exampleSource: string; exampleUrl: string; pageType: string }>
    failureBreakdown?: Array<{ error: string; count: number; exampleSource: string; exampleUrl: string; httpStatus?: number }>
    discoveryMethodBreakdown?: Array<{ method: string; count: number }>
  }
  sourceScans: Array<{
    sourceName: string
    sourceDomain: string
    sourceTier?: string
    status: string
    urlsFound: number
    urlsAttempted: number
    savedCount: number
    rejectedCount: number
    failedCount: number
    error?: string
    finishedAt?: string
    startedAt: string
  }>
  scanUrlResults?: Array<{
    sourceName?: string
    sourceDomain?: string
    url: string
    urlDiscoveryMethod?: string
    status: string
    httpStatus?: number
    rejectionCategory?: string
    rejectionReason?: string
    rawExtractedTickers?: string[]
    screenableTickers?: string[]
    pageType?: string
    error?: string
  }>
  bootstrap: { convictionListsImported: number; managerHoldingsImported: number }
}

export default function DiagnosticsPage() {
  const [data, setData] = useState<DiagnosticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [urlFilter, setUrlFilter] = useState<string>('all')
  const [sourceFilter, setSourceFilter] = useState<string>('all')

  const load = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/diagnostics')
      if (!res.ok) throw new Error('Failed to load diagnostics')
      setData(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load diagnostics')
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [])

  if (error) return <ErrorState message={error} />
  if (loading || !data) return <LoadingState />

  const scan = data.scanSummary
  const rejectionBreakdown = scan.rejectionBreakdown ?? []
  const failureBreakdown = scan.failureBreakdown ?? []
  const skippedBreakdown = scan.skippedBreakdown ?? []
  const discoveryMethodBreakdown = scan.discoveryMethodBreakdown ?? []
  const scanUrlResults = data.scanUrlResults ?? []

  const uniqueSources = [...new Set(scanUrlResults.map(r => r.sourceName ?? r.sourceDomain ?? 'unknown').filter(Boolean))]

  const filteredUrlResults = scanUrlResults.filter(r => {
    if (urlFilter !== 'all' && r.status !== urlFilter) return false
    if (sourceFilter !== 'all') {
      const sourceVal = r.sourceName ?? r.sourceDomain ?? ''
      if (sourceVal !== sourceFilter) return false
    }
    return true
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Diagnostics</h1>
        <Button variant="outline" size="sm" className="gap-1" onClick={load}>
          <RefreshCw className="h-3 w-3" /> Refresh
        </Button>
      </div>

      <div className="grid gap-2 md:grid-cols-5">
        <SummaryCell label="Enabled sources" value={String(data.sources.enabled)} />
        <SummaryCell label="Core enabled" value={`${data.sources.enabledCore}/${data.sources.expectedCore}`} />
        <SummaryCell label="Parsers registered" value={String(data.sources.registeredParsers)} />
        <SummaryCell label="URLs found" value={String(scan.urlsFound)} />
        <SummaryCell label="Rejected" value={String(scan.articlesRejected)} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Parser Coverage</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Parser Key</TableHead>
                <TableHead>Parser Exists</TableHead>
                <TableHead>Enabled</TableHead>
                <TableHead>Tier</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.sources.parserCoverage
                .filter((s) => s.sourceTier === 'core' || s.parserKey)
                .sort((a, b) => (a.enabled === b.enabled ? 0 : a.enabled ? -1 : 1))
                .map((s) => (
                  <TableRow key={s.domain}>
                    <TableCell className="text-xs font-medium">{s.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{s.domain}</TableCell>
                    <TableCell className="text-xs">{s.parserKey ?? 'none'}</TableCell>
                    <TableCell>{s.parserExists ? <Badge className="bg-green-700 text-xs">Yes</Badge> : <Badge variant="destructive" className="text-xs">No</Badge>}</TableCell>
                    <TableCell>{s.enabled ? <Badge variant="outline" className="text-xs bg-blue-900">Yes</Badge> : <Badge variant="secondary" className="text-xs">No</Badge>}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{s.sourceTier}</Badge></TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="h-4 w-4" /> Latest Scan Run
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-xs md:grid-cols-3">
          <Fact label="Started at" value={formatDate(scan.startedAt)} />
          <Fact label="Finished at" value={formatDate(scan.finishedAt)} />
          <Fact label="Status" value={scan.status ?? 'No scan has run yet'} />
          <Fact label="Enabled sources scanned" value={String(scan.sourcesScanned)} />
          <Fact label="URLs attempted" value={String(scan.urlsAttempted)} />
          <Fact label="Articles saved" value={String(scan.articlesSaved)} />
          <Fact label="Articles rejected" value={String(scan.articlesRejected)} />
          <Fact label="Articles failed" value={String(scan.articlesFailed)} />
          <Fact label="Media sources enabled" value={String(data.sources.enabledMedia)} />
        </CardContent>
      </Card>

      {/* Feed Diagnostics */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Activity className="h-4 w-4" /> Feed Diagnostics</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {data.feed ? (
            <>
              <div className="grid gap-2 md:grid-cols-4">
                <Fact label="Enabled feed sources" value={String(data.feed.enabledSources)} />
                <Fact label="Article candidates" value={String(data.feed.latestScan?.articleCandidatesAttempted ?? 0)} />
                <Fact label="Feed saved" value={String(data.feed.latestScan?.feedSaved ?? 0)} />
                <Fact label="Feed rejected" value={String(data.feed.latestScan?.feedRejected ?? 0)} />
              </div>
              <p className="text-xs italic text-muted-foreground">{data.feed.note}</p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Feed diagnostics not available.</p>
          )}
        </CardContent>
      </Card>

      {/* Conviction List Diagnostics */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Database className="h-4 w-4" /> Conviction List Diagnostics</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {data.convictionLists ? (
            <>
              <div className="grid gap-2 md:grid-cols-4">
                <Fact label="Imported lists" value={String(data.convictionLists.importedLists)} />
                <Fact label="Total members" value={String(data.convictionLists.totalMembers)} />
                <Fact label="Verified" value={String(data.convictionLists.verified)} />
                <Fact label="Needs review" value={String(data.convictionLists.needsReview)} />
              </div>
              <div className="grid gap-2 md:grid-cols-4">
                <Fact label="Seed available" value={String(data.convictionLists.seedAvailable)} />
                <Fact label="Partial candidates" value={String(data.convictionLists.partialCandidates)} />
                <Fact label="Generated queries" value={String(data.convictionLists.generatedQueryCount)} />
                <Fact label="Finder window" value={`Dec 1, ${data.convictionLists.listFinderWindow.yearLabel - 1} → today`} />
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Conviction list diagnostics not available.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Rejection Breakdown</CardTitle></CardHeader>
        <CardContent>
          {rejectionBreakdown.length === 0 ? (
            <p className="text-xs text-muted-foreground">No rejection data available yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Count</TableHead>
                  <TableHead>Example Source</TableHead>
                  <TableHead>Example URL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rejectionBreakdown.map((item) => (
                  <TableRow key={item.category}>
                    <TableCell className="text-xs font-medium">{item.category}</TableCell>
                    <TableCell className="text-xs">{item.count}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{item.exampleSource}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground" title={item.exampleUrl}>{item.exampleUrl}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Skipped Before Fetch</CardTitle></CardHeader>
        <CardContent>
          {skippedBreakdown.length === 0 ? (
            <p className="text-xs text-muted-foreground">No skipped URL data available yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reason</TableHead>
                  <TableHead>Count</TableHead>
                  <TableHead>Example Source</TableHead>
                  <TableHead>Example URL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {skippedBreakdown.map((item) => (
                  <TableRow key={item.reason}>
                    <TableCell className="text-xs font-medium">{item.reason}</TableCell>
                    <TableCell className="text-xs">{item.count}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{item.exampleSource}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground" title={item.exampleUrl}>{item.exampleUrl}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Failure Breakdown</CardTitle></CardHeader>
        <CardContent>
          {failureBreakdown.length === 0 ? (
            <p className="text-xs text-muted-foreground">No failure data available yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Error</TableHead>
                  <TableHead>Count</TableHead>
                  <TableHead>Example Source</TableHead>
                  <TableHead>Example URL</TableHead>
                  <TableHead>HTTP Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {failureBreakdown.map((item, i) => (
                  <TableRow key={i}>
                    <TableCell className="max-w-[300px] truncate text-xs" title={item.error}>{item.error}</TableCell>
                    <TableCell className="text-xs">{item.count}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{item.exampleSource}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground" title={item.exampleUrl}>{item.exampleUrl}</TableCell>
                    <TableCell className="text-xs">{item.httpStatus ?? '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">URL Discovery Method Breakdown</CardTitle></CardHeader>
        <CardContent>
          {discoveryMethodBreakdown.length === 0 ? (
            <p className="text-xs text-muted-foreground">No discovery method data available yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {discoveryMethodBreakdown.map((item) => (
                <Badge key={item.method} variant="outline" className="text-xs">
                  {item.method}: {item.count}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Attempted URLs (Latest Scan)</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-2">
            <select
              className="rounded border border-[#1F1F1F] bg-[#0A0A0A] px-2 py-1 text-xs text-[#E5E7EB]"
              value={urlFilter}
              onChange={(e) => setUrlFilter(e.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="saved">Saved</option>
              <option value="rejected">Rejected</option>
              <option value="failed">Failed</option>
              <option value="skipped_seen">Skipped (duplicate)</option>
              <option value="skipped_url_filter">Skipped (URL filter)</option>
            </select>
            <select
              className="rounded border border-[#1F1F1F] bg-[#0A0A0A] px-2 py-1 text-xs text-[#E5E7EB]"
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
            >
              <option value="all">All sources</option>
              {uniqueSources.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>HTTP</TableHead>
                  <TableHead>Rejection</TableHead>
                  <TableHead>Page Type</TableHead>
                  <TableHead>Raw Tickers</TableHead>
                  <TableHead>Screenable</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUrlResults.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-xs text-muted-foreground">No URL results found.</TableCell></TableRow>
                ) : (
                  filteredUrlResults.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs font-medium">{r.sourceName ?? r.sourceDomain ?? '-'}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground" title={r.url}>{r.url}</TableCell>
                      <TableCell className="text-xs">{r.urlDiscoveryMethod ?? '-'}</TableCell>
                      <TableCell className="text-xs">{r.status}</TableCell>
                      <TableCell className="text-xs">{r.httpStatus ?? '-'}</TableCell>
                      <TableCell className="text-xs">{r.rejectionCategory ?? '-'}</TableCell>
                      <TableCell className="text-xs">{r.pageType ?? '-'}</TableCell>
                      <TableCell className="text-xs">{(r.rawExtractedTickers ?? []).slice(0, 5).join(', ')}{(r.rawExtractedTickers ?? []).length > 5 ? '...' : ''}</TableCell>
                      <TableCell className="text-xs">{(r.screenableTickers ?? []).slice(0, 5).join(', ')}{(r.screenableTickers ?? []).length > 5 ? '...' : ''}</TableCell>
                      <TableCell className="max-w-[150px] truncate text-xs text-red-400" title={r.error}>{r.error ?? '-'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Per-Source Scan Results</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>URLs</TableHead>
                <TableHead>Attempted</TableHead>
                <TableHead>Saved</TableHead>
                <TableHead>Rejected</TableHead>
                <TableHead>Failed</TableHead>
                <TableHead>Last scanned</TableHead>
                <TableHead>Last error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.sourceScans.map((source) => (
                <TableRow key={`${source.sourceDomain}:${source.startedAt}`}>
                  <TableCell className="text-xs font-medium">{source.sourceName}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{source.sourceDomain}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{source.sourceTier ?? 'secondary'}</Badge></TableCell>
                  <TableCell className="text-xs">{source.status}</TableCell>
                  <TableCell className="text-xs">{source.urlsFound}</TableCell>
                  <TableCell className="text-xs">{source.urlsAttempted}</TableCell>
                  <TableCell className="text-xs">{source.savedCount}</TableCell>
                  <TableCell className="text-xs">{source.rejectedCount}</TableCell>
                  <TableCell className="text-xs">{source.failedCount}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(source.finishedAt ?? source.startedAt)}</TableCell>
                  <TableCell className="max-w-[240px] truncate text-xs text-red-400" title={source.error}>{source.error ?? '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#1F1F1F] bg-[#0A0A0A] px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-[#6B7280]">{label}</div>
      <div className="text-lg font-semibold text-[#E5E7EB]">{value}</div>
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#1F1F1F] px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm text-[#E5E7EB]">{value}</div>
    </div>
  )
}

function formatDate(value?: string): string {
  if (!value) return 'Never'
  return new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}
