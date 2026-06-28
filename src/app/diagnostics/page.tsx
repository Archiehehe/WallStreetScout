'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { LoadingState } from '@/components/LoadingState'
import { ErrorState } from '@/components/ErrorState'
import { Activity, RefreshCw } from 'lucide-react'

interface DiagnosticsData {
  sources: { total: number; enabled: number; enabledCore: number; enabledMedia: number }
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
  bootstrap: { convictionListsImported: number; managerHoldingsImported: number }
}

export default function DiagnosticsPage() {
  const [data, setData] = useState<DiagnosticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Diagnostics</h1>
        <Button variant="outline" size="sm" className="gap-1" onClick={load}>
          <RefreshCw className="h-3 w-3" /> Refresh
        </Button>
      </div>

      <div className="grid gap-2 md:grid-cols-4">
        <SummaryCell label="Enabled sources" value={String(data.sources.enabled)} />
        <SummaryCell label="Core enabled" value={`${data.sources.enabledCore}/40`} />
        <SummaryCell label="URLs found" value={String(scan.urlsFound)} />
        <SummaryCell label="Rejected" value={String(scan.articlesRejected)} />
      </div>

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

      <Card>
        <CardHeader><CardTitle className="text-sm">Common Rejection Reasons</CardTitle></CardHeader>
        <CardContent>
          {scan.commonRejectionReasons.length === 0 ? (
            <p className="text-xs text-muted-foreground">No rejection reasons recorded yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {scan.commonRejectionReasons.map((item) => (
                <Badge key={item.reason} variant="outline" className="text-xs">
                  {item.reason}: {item.count}
                </Badge>
              ))}
            </div>
          )}
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
