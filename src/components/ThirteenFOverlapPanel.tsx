'use client'

import type { ThirteenFOverlap } from '@/lib/storage/types'
import { buildWhaleWisdomManagerUrl } from '@/lib/whaleWisdom'
import { ExternalLink } from 'lucide-react'

export function ThirteenFOverlapPanel({ overlaps }: { overlaps?: ThirteenFOverlap[] }) {
  if (!overlaps || overlaps.length === 0) return null

  return (
    <div className="rounded-md border border-[#1F1F1F] bg-[#050505] p-3">
      <h3 className="mb-2 text-xs font-semibold text-[#E5E7EB]">13F Overlap</h3>
      <div className="space-y-3">
        {overlaps.slice(0, 5).map((overlap) => {
          const actionSummary = formatActionSummary(overlap.actionSummary)
          return (
            <div key={overlap.managerId} className="space-y-1 border-t border-[#1F1F1F] pt-2 first:border-t-0 first:pt-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-[#E5E7EB]">{overlap.managerName}</p>
                <a
                  href={buildWhaleWisdomManagerUrl(overlap.whalewisdomUrl ?? overlap.managerSlug)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[#60A5FA] hover:underline"
                >
                  Open on WhaleWisdom <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <p className="text-xs text-[#9CA3AF]">
                {overlap.overlapCount} names matched - {Math.round(overlap.overlapRatio * 100)}% basket overlap
              </p>
              <p className="text-xs text-[#9CA3AF]">Matched: {overlap.matchedTickers.join(', ')}</p>
              {overlap.filingPeriod && (
                <p className="text-xs text-[#9CA3AF]">Latest available filing: {overlap.filingPeriod}</p>
              )}
              {typeof overlap.matchedManagerWeight === 'number' && (
                <p className="text-xs text-[#9CA3AF]">
                  Matched names represent {overlap.matchedManagerWeight.toFixed(1)}% of {overlap.managerName}&apos;s reported 13F portfolio.
                </p>
              )}
              {actionSummary && <p className="text-xs text-[#9CA3AF]">Actions: {actionSummary}</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function formatActionSummary(summary?: Record<string, number>): string | undefined {
  if (!summary) return undefined
  const parts = Object.entries(summary)
    .filter(([, count]) => count > 0)
    .map(([action, count]) => `${count} ${action.replace(/_/g, ' ')}`)
  return parts.length > 0 ? parts.join(', ') : undefined
}
