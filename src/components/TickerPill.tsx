import { Badge } from '@/components/ui/badge'

export function TickerPill({ ticker, onClick }: { ticker: string; onClick?: () => void }) {
  return (
    <Badge
      variant="outline"
      className="cursor-pointer font-mono text-xs font-medium tracking-tight px-2 py-0.5 rounded-full border-[#2A2A2A] bg-[#0A0A0A] text-[#9CA3AF] hover:bg-[#1A1A1A] hover:border-[#3B82F6] hover:text-[#3B82F6] transition-colors"
      onClick={onClick}
    >
      {ticker}
    </Badge>
  )
}
