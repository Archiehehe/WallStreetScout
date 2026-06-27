'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FirmBadge } from '@/components/FirmBadge'
import { ThemeBadge, SectorBadge, SourceTypeBadge } from '@/components/ThemeBadge'
import { ScoreBadge } from '@/components/ScoreBadge'
import { TickerPill } from '@/components/TickerPill'
import { Eye, Plus, TrendingUp, ExternalLink, ThumbsUp, ThumbsDown, EyeOff, Zap } from 'lucide-react'

interface ArticleCardProps {
  id: string
  title: string
  url?: string
  source: string
  firm?: string
  sourceType: string
  publishedAt: string
  theme?: string
  sector?: string
  tickers: string[]
  score: number
  reasonShown?: string
  onSaveBasket?: () => void
  onRunMetrics?: () => void
  onAddAllToWatchlist?: () => void
  onAnalyze?: () => void
  onMoreLikeThis?: () => void
  onLessLikeThis?: () => void
  onHideSource?: () => void
}

export function ArticleCard({
  id,
  title,
  url,
  source,
  firm,
  sourceType,
  publishedAt,
  theme,
  sector,
  tickers,
  score,
  reasonShown,
  onSaveBasket,
  onRunMetrics,
  onAddAllToWatchlist,
  onAnalyze,
  onMoreLikeThis,
  onLessLikeThis,
  onHideSource,
}: ArticleCardProps) {
  const date = new Date(publishedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })

  return (
    <Card className="border border-[#1F1F1F] bg-[#0A0A0A] hover:border-[#3B82F6]/40 transition-colors shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <a
            href={`/article/${id}`}
            className="text-sm font-semibold text-[#E2E8F0] hover:text-[#3B82F6] leading-snug line-clamp-2 transition-colors flex-1 min-w-0"
          >
            {title}
          </a>
          <ScoreBadge score={score} />
        </div>

        <div className="flex items-center gap-2 text-xs text-[#9CA3AF] mb-2">
          <span className="font-medium text-[#E2E8F0]">{source}</span>
          {firm && (
            <>
              <span className="text-[#374151]">·</span>
              <span>{firm}</span>
            </>
          )}
          <span className="text-[#374151]">·</span>
          <span>{date}</span>
        </div>

        <div className="flex flex-wrap items-center gap-1 mb-2">
          {firm && <FirmBadge firm={firm} />}
          <SourceTypeBadge type={sourceType} />
          {theme && <ThemeBadge theme={theme} />}
          {sector && <SectorBadge sector={sector} />}
        </div>

        {tickers.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tickers.map((t) => (
              <TickerPill key={t} ticker={t} />
            ))}
          </div>
        )}

        {reasonShown && (
          <p className="text-[11px] text-[#6B7280] italic mb-3 leading-relaxed">
            Why: {reasonShown}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-[#1F1F1F]">
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-[#9CA3AF] hover:text-[#3B82F6] hover:bg-[#1A1A1A]" onClick={onSaveBasket}>
            <Plus className="h-3 w-3" /> Basket
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-[#9CA3AF] hover:text-[#3B82F6] hover:bg-[#1A1A1A]" onClick={onRunMetrics}>
            <TrendingUp className="h-3 w-3" /> Metrics
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-[#9CA3AF] hover:text-[#3B82F6] hover:bg-[#1A1A1A]" onClick={onAddAllToWatchlist}>
            <Eye className="h-3 w-3" /> Watchlist
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-[#9CA3AF] hover:text-[#3B82F6] hover:bg-[#1A1A1A]" onClick={onAnalyze}>
            <Zap className="h-3 w-3" /> Analyze
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-[#9CA3AF] hover:text-[#3B82F6] hover:bg-[#1A1A1A]" onClick={onMoreLikeThis}>
            <ThumbsUp className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-[#9CA3AF] hover:text-[#3B82F6] hover:bg-[#1A1A1A]" onClick={onLessLikeThis}>
            <ThumbsDown className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-[#9CA3AF] hover:text-[#3B82F6] hover:bg-[#1A1A1A]" onClick={onHideSource}>
            <EyeOff className="h-3 w-3" />
          </Button>
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer" className="ml-auto">
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-[#9CA3AF] hover:text-[#3B82F6] hover:bg-[#1A1A1A]">
                <ExternalLink className="h-3 w-3" /> Open original
              </Button>
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
