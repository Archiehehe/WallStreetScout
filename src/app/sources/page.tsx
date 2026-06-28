'use client'

import { useEffect, useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/EmptyState'
import { LoadingState } from '@/components/LoadingState'
import { ErrorState } from '@/components/ErrorState'
import { Plus, Play, Pencil, Trash2, Download } from 'lucide-react'
import { STARTER_SOURCES } from '@/lib/starterSources'

interface SourceItem {
  id: string
  name: string
  domain: string
  sourceType: string
  sourceClass?: string
  sourceTier?: 'core' | 'secondary' | 'archive'
  rssUrl?: string
  parserType?: string
  enabled: boolean
  qualityScore: number
  notes?: string
}

const EMPTY_SOURCE = { name: '', domain: '', sourceType: 'primary', rssUrl: '', parserType: 'generic', enabled: true, qualityScore: 5 }

export default function SourcesPage() {
  const [sources, setSources] = useState<SourceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState(EMPTY_SOURCE)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

  const fetchSources = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/sources')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setSources(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchSources() }, [])

  const resetForm = () => setFormData(EMPTY_SOURCE)

  const handleToggle = async (id: string, enabled: boolean) => {
    await fetch(`/api/sources/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    })
    fetchSources()
  }

  const handleAdd = async () => {
    await fetch('/api/sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })
    setAddDialogOpen(false)
    resetForm()
    fetchSources()
  }

  const handleEdit = async () => {
    if (!editingId) return
    await fetch(`/api/sources/${editingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })
    setEditDialogOpen(false)
    setEditingId(null)
    resetForm()
    fetchSources()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this source?')) return
    await fetch(`/api/sources/${id}`, { method: 'DELETE' })
    fetchSources()
  }

  const openEdit = (s: SourceItem) => {
    setFormData({
      name: s.name,
      domain: s.domain,
      sourceType: s.sourceType,
      rssUrl: s.rssUrl || '',
      parserType: s.parserType || 'generic',
      enabled: s.enabled,
      qualityScore: s.qualityScore,
    })
    setEditingId(s.id)
    setEditDialogOpen(true)
  }

  const handleTestSource = async (id: string) => {
    await fetch('/api/scan/source', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceId: id }),
    })
  }

  const handleImportStarters = async () => {
    setImporting(true)
    try {
      for (const src of STARTER_SOURCES) {
        const existing = sources.find(s => s.domain === src.domain)
        if (existing) continue
        await fetch('/api/sources', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(src),
        })
      }
      await fetchSources()
    } finally {
      setImporting(false)
    }
  }

  if (error) return <ErrorState message={error} />
  if (loading) return <LoadingState />

  const groupedSources = {
    core: sources.filter((source) => source.sourceTier === 'core'),
    secondary: sources.filter((source) => !source.sourceTier || source.sourceTier === 'secondary'),
    archive: sources.filter((source) => source.sourceTier === 'archive'),
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold">Sources</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1" onClick={handleImportStarters} disabled={importing}>
            <Download className="h-3 w-3" /> {importing ? 'Importing...' : 'Import starters'}
          </Button>
          <Dialog open={addDialogOpen} onOpenChange={(open) => { setAddDialogOpen(open); if (!open) resetForm() }}>
            <DialogTrigger>
              <Button variant="outline" size="sm" className="gap-1">
                <Plus className="h-3 w-3" /> Add Source
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Source</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground">Name</label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Domain</label>
                  <Input value={formData.domain} onChange={(e) => setFormData({ ...formData, domain: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">RSS URL (optional)</label>
                  <Input value={formData.rssUrl} onChange={(e) => setFormData({ ...formData, rssUrl: e.target.value })} />
                </div>
              </div>
              <Button onClick={handleAdd}>Add Source</Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {sources.length === 0 ? (
        <EmptyState
          title="No sources configured"
          description="Add institutional and bank sources for the scanner to monitor."
          actions={[
            { label: 'Add Source', onClick: () => setAddDialogOpen(true) },
            { label: 'Import starter sources', onClick: handleImportStarters },
          ]}
        />
      ) : (
        <>
          <div className="space-y-5">
            {([
              ['core', 'Core', 'Enabled by default for the primary feed scan.'],
              ['secondary', 'Secondary', 'Institutional sources kept available but disabled by default.'],
              ['archive', 'Archive', 'Historical or low-priority sources kept out of default scans.'],
            ] as const).map(([tier, label, description]) => {
              const tierSources = groupedSources[tier]
              if (tierSources.length === 0) return null
              return (
                <div key={tier} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold">{label}</h2>
                    <Badge variant="outline" className="text-xs">{tierSources.length}</Badge>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </div>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Domain</TableHead>
                          <TableHead>Class</TableHead>
                          <TableHead>Tier</TableHead>
                          <TableHead>Quality</TableHead>
                          <TableHead>Enabled</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tierSources.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell className="text-sm font-medium">{s.name}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{s.domain}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs capitalize">{formatSourceClass(s.sourceClass ?? s.sourceType)}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs capitalize">{s.sourceTier ?? 'secondary'}</Badge>
                            </TableCell>
                            <TableCell className="text-xs">{s.qualityScore}/10</TableCell>
                            <TableCell>
                              <Switch checked={s.enabled} onCheckedChange={(v) => handleToggle(s.id, v)} />
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(s)} title="Edit">
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleTestSource(s.id)} title="Test scan">
                                  <Play className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDelete(s.id)} title="Delete">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )
            })}
          </div>

          <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) { setEditingId(null); resetForm() }}}>
            <DialogContent>
              <DialogHeader><DialogTitle>Edit Source</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground">Name</label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Domain</label>
                  <Input value={formData.domain} onChange={(e) => setFormData({ ...formData, domain: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">RSS URL (optional)</label>
                  <Input value={formData.rssUrl} onChange={(e) => setFormData({ ...formData, rssUrl: e.target.value })} />
                </div>
              </div>
              <Button onClick={handleEdit}>Save Changes</Button>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}

function formatSourceClass(value: string): string {
  return value.replace(/_/g, ' ')
}
