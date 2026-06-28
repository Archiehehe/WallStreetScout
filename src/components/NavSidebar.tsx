'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  Rss, FolderKanban, Eye, Radio, Settings, DollarSign, ListChecks, Activity,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/feed', label: 'Feed', icon: Rss },
  { href: '/conviction-lists', label: 'Conviction Lists', icon: ListChecks },
  { href: '/baskets', label: 'Baskets', icon: FolderKanban },
  { href: '/watchlist', label: 'Watchlist', icon: Eye },
  { href: '/sources', label: 'Sources', icon: Radio },
  { href: '/diagnostics', label: 'Diagnostics', icon: Activity },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function NavSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 border-r border-border bg-[#050505] flex flex-col shrink-0">
      <div className="px-4 pt-5 pb-4 border-b border-border">
        <Link href="/feed" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-black border border-emerald-500 flex items-center justify-center shadow-sm shadow-emerald-500/20">
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </div>
          <span className="font-semibold text-sm text-[#E2E8F0] tracking-tight">Wall Street Scout</span>
        </Link>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                active
                  ? 'bg-[#1A1A1A] text-[#F59E0B] font-medium'
                  : 'text-[#9CA3AF] hover:text-[#E2E8F0] hover:bg-[#0A0A0A]',
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0',
                active ? 'text-[#F59E0B]' : 'text-[#6B7280]',
              )} />
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="px-4 py-3 border-t border-border">
        <p className="text-[11px] text-[#6B7280] tracking-wider uppercase font-medium">
          Wall Street Scout
        </p>
      </div>
    </aside>
  )
}
