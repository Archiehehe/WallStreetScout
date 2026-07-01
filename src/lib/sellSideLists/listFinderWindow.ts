import type { ListFinderWindow } from './types'

export function getSellSideListWindow(now = new Date()): ListFinderWindow {
  const currentYear = now.getFullYear()
  const fromDate = new Date(currentYear - 1, 11, 1)
  const toDate = new Date(now)
  const yearLabel = currentYear
  const queryYear = currentYear
  return { fromDate, toDate, yearLabel, queryYear }
}
