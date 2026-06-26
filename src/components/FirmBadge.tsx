import { Badge } from '@/components/ui/badge'

const FIRM_COLORS: Record<string, string> = {
  'Goldman Sachs': 'bg-blue-950/50 text-blue-400 border-blue-800',
  'Morgan Stanley': 'bg-sky-950/50 text-sky-400 border-sky-800',
  'Bank of America': 'bg-red-950/50 text-red-400 border-red-800',
  'JPMorgan': 'bg-purple-950/50 text-purple-400 border-purple-800',
  'Citi': 'bg-emerald-950/50 text-emerald-400 border-emerald-800',
  'UBS': 'bg-orange-950/50 text-orange-400 border-orange-800',
  'Jefferies': 'bg-indigo-950/50 text-indigo-400 border-indigo-800',
  'Evercore': 'bg-pink-950/50 text-pink-400 border-pink-800',
}

export function FirmBadge({ firm }: { firm: string }) {
  const colorClass = FIRM_COLORS[firm] || 'bg-amber-950/50 text-amber-400 border-amber-800'
  return (
    <Badge className={`${colorClass} border text-[11px] font-medium px-1.5 py-0.5`} variant="outline">
      {firm}
    </Badge>
  )
}
