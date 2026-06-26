import { Badge } from '@/components/ui/badge'

export function ScoreBadge({ score }: { score: number }) {
  let color: string
  if (score >= 15) {
    color = 'bg-emerald-900/40 text-emerald-400 border-emerald-800'
  } else if (score >= 10) {
    color = 'bg-blue-900/40 text-blue-400 border-blue-800'
  } else if (score >= 7) {
    color = 'bg-amber-900/40 text-amber-400 border-amber-800'
  } else {
    color = 'bg-zinc-900/40 text-zinc-500 border-zinc-800'
  }

  return (
    <Badge className={`${color} border font-mono text-xs font-semibold px-2 py-0.5`} variant="outline">
      {score}
    </Badge>
  )
}
