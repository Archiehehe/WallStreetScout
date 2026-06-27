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
    media: 'bg-amber-950/50 text-amber-400 border-amber-800',
    newsletter: 'bg-cyan-950/50 text-cyan-400 border-cyan-800',
    manual: 'bg-zinc-900/50 text-zinc-400 border-zinc-700',
  }
  return (
    <Badge className={`${colorMap[type] || 'bg-zinc-900/50 text-zinc-400 border-zinc-700'} border text-[11px] capitalize font-medium px-1.5 py-0.5`} variant="outline">
      {type}
    </Badge>
  )
}
