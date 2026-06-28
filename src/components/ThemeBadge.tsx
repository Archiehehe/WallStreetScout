import { Badge } from '@/components/ui/badge'

export function ThemeBadge({ theme }: { theme: string }) {
  return (
    <Badge variant="secondary" className="text-[11px] bg-cyan-950/50 text-cyan-400 border-cyan-800 font-medium px-1.5 py-0.5">
      {theme}
    </Badge>
  )
}

export function SectorBadge({ sector }: { sector: string }) {
  return (
    <Badge variant="outline" className="text-[11px] text-zinc-400 border-zinc-700 font-medium px-1.5 py-0.5">
      {sector}
    </Badge>
  )
}

export function SourceTypeBadge({ type }: { type: string }) {
  const colorMap: Record<string, string> = {
    primary: 'bg-emerald-950/50 text-emerald-400 border-emerald-800',
    primary_institutional: 'bg-emerald-950/50 text-emerald-400 border-emerald-800',
    public_institutional_research: 'bg-blue-950/50 text-blue-400 border-blue-800',
    manual: 'bg-zinc-900/50 text-zinc-400 border-zinc-700',
  }
  const labels: Record<string, string> = {
    primary: 'Primary',
    primary_institutional: 'Primary',
    public_institutional_research: 'Public research',
    manual: 'Manual',
  }
  return (
    <Badge className={`${colorMap[type] || 'bg-zinc-900/50 text-zinc-400 border-zinc-700'} border text-[11px] capitalize font-medium px-1.5 py-0.5`} variant="outline">
      {labels[type] ?? type}
    </Badge>
  )
}

export function SourceTierBadge({ tier }: { tier: string }) {
  const colorMap: Record<string, string> = {
    core: 'bg-amber-950/50 text-amber-400 border-amber-800',
    secondary: 'bg-slate-900/60 text-slate-300 border-slate-700',
    archive: 'bg-zinc-950 text-zinc-500 border-zinc-800',
  }
  return (
    <Badge className={`${colorMap[tier] || colorMap.secondary} border text-[11px] capitalize font-medium px-1.5 py-0.5`} variant="outline">
      {tier}
    </Badge>
  )
}

export function PageTypeBadge({ pageType }: { pageType: string }) {
  const label = pageType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

  return (
    <Badge variant="outline" className="text-[11px] text-violet-300 border-violet-900 bg-violet-950/30 font-medium px-1.5 py-0.5">
      {label}
    </Badge>
  )
}
