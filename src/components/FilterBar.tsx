'use client'

import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search } from 'lucide-react'

interface FilterBarProps {
  firms?: string[]
  sectors?: string[]
  regions?: string[]
  themes?: string[]
  selectedFirm?: string
  selectedSector?: string
  selectedRegion?: string
  selectedTheme?: string
  searchQuery?: string
  onFirmChange?: (v: string) => void
  onSectorChange?: (v: string) => void
  onRegionChange?: (v: string) => void
  onThemeChange?: (v: string) => void
  onSearchChange?: (v: string) => void
  showScoreFilter?: boolean
  minScore?: number
  onMinScoreChange?: (v: number) => void
}

export function FilterBar({
  firms = [], sectors = [], regions = [], themes = [],
  selectedFirm, selectedSector, selectedRegion, selectedTheme,
  searchQuery = '',
  onFirmChange, onSectorChange, onRegionChange, onThemeChange, onSearchChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <div className="relative flex-1 min-w-[200px] max-w-xs">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#6B7280]" />
        <Input
          placeholder="Search articles..."
          className="pl-8 h-9 text-sm border-[#1F1F1F] bg-[#0A0A0A] placeholder:text-[#6B7280]"
          value={searchQuery}
          onChange={(e) => onSearchChange?.(e.target.value)}
        />
      </div>
      {firms.length > 0 && (
        <Select value={selectedFirm || 'all'} onValueChange={(v) => onFirmChange?.(v === 'all' ? '' : v ?? '')}>
          <SelectTrigger className="h-9 text-xs w-[130px] border-[#1F1F1F] bg-[#0A0A0A] text-[#9CA3AF]">
            <SelectValue placeholder="All firms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All firms</SelectItem>
            {firms.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      {sectors.length > 0 && (
        <Select value={selectedSector || 'all'} onValueChange={(v) => onSectorChange?.(v === 'all' ? '' : v ?? '')}>
          <SelectTrigger className="h-9 text-xs w-[130px] border-[#1F1F1F] bg-[#0A0A0A] text-[#9CA3AF]">
            <SelectValue placeholder="All sectors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sectors</SelectItem>
            {sectors.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      {regions.length > 0 && (
        <Select value={selectedRegion || 'all'} onValueChange={(v) => onRegionChange?.(v === 'all' ? '' : v ?? '')}>
          <SelectTrigger className="h-9 text-xs w-[130px] border-[#1F1F1F] bg-[#0A0A0A] text-[#9CA3AF]">
            <SelectValue placeholder="All regions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All regions</SelectItem>
            {regions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      {themes.length > 0 && (
        <Select value={selectedTheme || 'all'} onValueChange={(v) => onThemeChange?.(v === 'all' ? '' : v ?? '')}>
          <SelectTrigger className="h-9 text-xs w-[130px] border-[#1F1F1F] bg-[#0A0A0A] text-[#9CA3AF]">
            <SelectValue placeholder="All themes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All themes</SelectItem>
            {themes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
