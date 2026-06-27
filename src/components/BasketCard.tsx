'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FirmBadge } from '@/components/FirmBadge'
import { ThemeBadge, SectorBadge } from '@/components/ThemeBadge'
import { TickerPill } from '@/components/TickerPill'
import { TrendingUp, Eye, Download, Trash2 } from 'lucide-react'

interface BasketCardProps {
  id: string
  name: string
  firm?: string
  theme?: string
  sector?: string
  tickers: string[]
  createdAt: string
  metricsStatus?: string
  onRunMetrics?: () => void
  onAddAllToWatchlist?: () => void
  onExportCsv?: () => void
  onDelete?: () => void
}

export function BasketCard({
  name,
  firm,
  theme,
  sector,
  tickers,
  createdAt,
  onRunMetrics,
  onAddAllToWatchlist,
  onExportCsv,
  onDelete,
}: BasketCardProps) {
  const date = new Date(createdAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })

  return (
    <Card className="border border-[#1F1F1F] bg-[#0A0A0A] hover:border-[#3B82F6]/40 transition-colors shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h3 className="text-sm font-semibold text-[#E2E8F0]">{name}</h3>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {firm && <FirmBadge firm={firm} />}
              {theme && <ThemeBadge theme={theme} />}
              {sector && <SectorBadge sector={sector} />}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#9CA3AF] mt-2 mb-2">
          <span>Created {date}</span>
          <span className="text-[#374151]">·</span>
          <span>{tickers.length} stocks</span>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {tickers.map((t) => (
            <TickerPill key={t} ticker={t} />
          ))}
        </div>

        <div className="flex flex-wrap gap-1 pt-1 border-t border-[#1F1F1F]">
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-[#9CA3AF] hover:text-[#3B82F6] hover:bg-[#1A1A1A]" onClick={onRunMetrics}>
            <TrendingUp className="h-3 w-3" /> Metrics
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-[#9CA3AF] hover:text-[#3B82F6] hover:bg-[#1A1A1A]" onClick={onAddAllToWatchlist}>
            <Eye className="h-3 w-3" /> Watchlist
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-[#9CA3AF] hover:text-[#3B82F6] hover:bg-[#1A1A1A]" onClick={onExportCsv}>
            <Download className="h-3 w-3" /> CSV
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-[#EF4444] hover:text-[#EF4444] hover:bg-[#2A0000]" onClick={onDelete}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
