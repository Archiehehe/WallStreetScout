'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ProviderStatus } from '@/components/ProviderStatus'
import { LoadingState } from '@/components/LoadingState'
import { Loader2, ExternalLink, Play } from 'lucide-react'

const PROVIDER_VARS = [
  { name: 'FMP API', envVar: 'FMP_API_KEY' },
  { name: 'Finnhub', envVar: 'FINNHUB_API_KEY' },
  { name: 'Twelve Data', envVar: 'TWELVE_DATA_API_KEY' },
  { name: 'Alpha Vantage', envVar: 'ALPHA_VANTAGE_API_KEY' },
  { name: 'FRED', envVar: 'FRED_API_KEY' },
  { name: 'SEC API', envVar: 'SECAPI_KEY' },
  { name: 'SimFin', envVar: 'SIMFIN_API_KEY' },
  { name: 'Form4', envVar: 'FORM4_API_KEY' },
  { name: 'SentiSense', envVar: 'SENTISENSE_API_KEY' },
  { name: 'API Ninjas', envVar: 'API_NINJAS_KEY' },
  { name: 'Earnings API', envVar: 'EARNINGS_API_KEY' },
  { name: 'Neon Database', envVar: 'DATABASE_URL' },
  { name: 'Cron Secret', envVar: 'CRON_SECRET' },
  { name: 'SnapJudgement', envVar: 'NEXT_PUBLIC_SNAPJUDGEMENT_URL' },
]

export default function SettingsPage() {
  const [providerStatus, setProviderStatus] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [sourceCount, setSourceCount] = useState(0)
  const [diagnostics, setDiagnostics] = useState<{
    sources: { enabled: number; enabledCore: number; enabledMedia: number }
    latestScanRun?: { status?: string } | null
    bootstrap: { convictionListsImported: number; managerHoldingsImported: number }
  } | null>(null)

  // Scan state
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState<string | null>(null)

  // Submit URL state
  const [submitUrl, setSubmitUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'done' | 'error'>('idle')

  useEffect(() => {
    const load = async () => {
      const status: Record<string, boolean> = {}
      for (const p of PROVIDER_VARS) {
        const res = await fetch(`/api/settings/check-env?name=${p.envVar}`)
        const data = await res.json()
        status[p.name] = data.configured
      }

      let sc = 0
      try {
        const srcRes = await fetch('/api/sources')
        if (srcRes.ok) {
          const data = await srcRes.json()
          sc = Array.isArray(data) ? data.length : data.summary?.totalSources ?? 0
        }
      } catch {}
      try {
        const diagnosticsRes = await fetch('/api/diagnostics')
        if (diagnosticsRes.ok) setDiagnostics(await diagnosticsRes.json())
      } catch {}

      setProviderStatus(status)
      setSourceCount(sc)
      setLoading(false)
    }
    load()
  }, [])

  const handleRunScan = async () => {
    setScanning(true)
    setScanResult(null)
    try {
      const res = await fetch('/api/scan/trigger', { method: 'POST' })
      const data = await res.json()
      const msg = data.scanRunId
        ? `Scan complete: ${data.urlsFound ?? 0} URLs found, ${data.articlesParsed ?? 0} parsed, ${data.articlesSaved ?? 0} saved`
        : `Response: ${JSON.stringify(data).slice(0, 200)}`
      setScanResult(msg)
    } catch {
      setScanResult('Scan failed — check server logs.')
    } finally {
      setScanning(false)
    }
  }

  const handleSubmitUrl = async () => {
    if (!submitUrl.trim()) return
    setSubmitting(true)
    setSubmitMessage('')
    setSubmitStatus('idle')
    try {
      const res = await fetch('/api/articles/submit-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: submitUrl }),
      })
      const data = await res.json()
      if (res.status === 201) {
        setSubmitStatus('done')
        setSubmitMessage(`Saved! Score: ${data.score}`)
        setSubmitUrl('')
      } else if (res.status === 409) {
        setSubmitStatus('error')
        setSubmitMessage('Article already exists (duplicate).')
      } else if (res.status === 422) {
        setSubmitStatus('error')
        setSubmitMessage(`Score ${data.score} below threshold.`)
      } else {
        setSubmitStatus('error')
        setSubmitMessage(data.error || 'Failed to submit.')
      }
    } catch {
      setSubmitStatus('error')
      setSubmitMessage('Network error.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <LoadingState />

  const configuredCount = Object.values(providerStatus).filter(Boolean).length
  const isNeon = providerStatus['Neon Database']

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-lg font-semibold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Setup Checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <ChecklistItem label="Database connected" ok={isNeon} value={isNeon ? 'Configured' : 'Missing'} />
          <ChecklistItem label="Sources synced" ok={(diagnostics?.sources.enabled ?? 0) > 0} value={`${sourceCount} sources`} />
          <ChecklistItem label="Core sources enabled" ok={(diagnostics?.sources.enabledCore ?? 0) === 40} value={`${diagnostics?.sources.enabledCore ?? 0}/40`} />
          <ChecklistItem label="Latest scan completed" ok={diagnostics?.latestScanRun?.status === 'completed'} value={diagnostics?.latestScanRun?.status ?? 'No scan'} />
          <ChecklistItem label="Conviction lists imported" ok={(diagnostics?.bootstrap.convictionListsImported ?? 0) > 0} value={String(diagnostics?.bootstrap.convictionListsImported ?? 0)} />
          <ChecklistItem label="Manager holdings imported" ok={(diagnostics?.bootstrap.managerHoldingsImported ?? 0) > 0} value={String(diagnostics?.bootstrap.managerHoldingsImported ?? 0)} />
          <ChecklistItem label="No media/news sources enabled" ok={(diagnostics?.sources.enabledMedia ?? 0) === 0} value={String(diagnostics?.sources.enabledMedia ?? 0)} />
          <div className="border-t border-[#1F1F1F] pt-2" />
          <ChecklistItem label="CRON_SECRET set" ok={providerStatus['Cron Secret']} value={providerStatus['Cron Secret'] ? 'Configured' : 'Missing'} />
          <div className="flex items-center justify-between">
            <span className="text-xs">Finance APIs configured</span>
            <Badge variant="outline" className="text-xs">
              {configuredCount - (isNeon ? 1 : 0) - (providerStatus['Cron Secret'] ? 1 : 0) - (providerStatus['SnapJudgement'] ? 1 : 0)} / {PROVIDER_VARS.length - 3}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs">Sources configured</span>
            <Badge variant="outline" className="text-xs">
              {sourceCount}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs">Storage mode</span>
            <Badge variant="outline" className="text-xs">
              {isNeon ? 'Neon (production)' : 'Local file (development)'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs">SnapJudgement integration</span>
            <Badge variant={providerStatus['SnapJudgement'] ? 'outline' : 'destructive'} className="text-xs">
              {providerStatus['SnapJudgement'] ? 'Configured' : 'Not configured'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Provider Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {PROVIDER_VARS.map((p) => (
              <ProviderStatus key={p.name} name={p.name} configured={providerStatus[p.name] || false} />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Scan & Ingest</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Trigger a full scan across all enabled sources. A scheduled scan also runs daily via GitHub Actions.
          </p>
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={handleRunScan} disabled={scanning}>
              {scanning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
              {scanning ? 'Scanning...' : 'Run Scan Now'}
            </Button>
            <span className="text-xs text-muted-foreground">
              Last scan: <span className="font-mono">—</span>
            </span>
          </div>
          {scanResult && (
            <p className={`text-xs ${scanResult.includes('failed') ? 'text-red-500' : 'text-green-600'}`}>
              {scanResult}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Submit Article URL</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-2">
            Manually submit a research article URL for parsing and scoring.
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="https://..."
              value={submitUrl}
              onChange={(e) => setSubmitUrl(e.target.value)}
              className="text-xs"
            />
            <Button size="sm" onClick={handleSubmitUrl} disabled={submitting}>
              {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <ExternalLink className="h-3 w-3" />}
              Submit
            </Button>
          </div>
          {submitMessage && (
            <p className={`text-xs mt-1 ${submitStatus === 'done' ? 'text-green-600' : 'text-red-500'}`}>
              {submitMessage}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">About</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p>WallStreetScout</p>
          <p>Extracts screenable stock baskets from institutional research.</p>
          <p>Score threshold: 8+</p>
        </CardContent>
      </Card>
    </div>
  )
}

function ChecklistItem({ label, ok, value }: { label: string; ok: boolean; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs">{label}</span>
      <Badge variant={ok ? 'outline' : 'destructive'} className="text-xs">
        {value}
      </Badge>
    </div>
  )
}
