import type { ListFinderQuery } from './types'
import { getSellSideListWindow } from './listFinderWindow'

const BANKS = [
  'BofA', 'Bank of America', 'Morgan Stanley', 'Goldman Sachs',
  'JPMorgan', 'J.P. Morgan', 'UBS', 'Citi', 'Jefferies',
  'Barclays', 'Evercore ISI', 'Piper Sandler', 'BTIG',
  'Oppenheimer', 'Mizuho', 'Bernstein', 'Raymond James',
  'RBC', 'Wells Fargo', 'Deutsche Bank',
]

const GENERAL_TEMPLATES = [
  (b: string, y: number) => `${b} top stock picks ${y}`,
  (b: string, y: number) => `${b} stock picks for ${y}`,
  (b: string, y: number) => `${b} top picks ${y}`,
  (b: string, y: number) => `${b} best stocks ${y}`,
  (b: string, y: number) => `${b} conviction list ${y}`,
  (b: string, y: number) => `${b} recommended list ${y}`,
  (b: string, y: number) => `${b} focus list ${y}`,
  (b: string, y: number) => `${b} analyst focus list ${y}`,
  (b: string, y: number) => `${b} top ideas Q1 ${y}`,
  (b: string, y: number) => `${b} top ideas Q2 ${y}`,
  (b: string, y: number) => `${b} top ideas Q3 ${y}`,
  (b: string, y: number) => `${b} top ideas Q4 ${y}`,
  (b: string, y: number) => `${b} H1 ${y} stock picks`,
  (b: string, y: number) => `${b} H2 ${y} stock picks`,
  (b: string, y: number) => `${b} second half ${y} stock picks`,
  (b: string, y: number) => `${b} software stocks ${y}`,
  (b: string, y: number) => `${b} top software stocks ${y}`,
  (b: string, y: number) => `${b} AI stocks ${y}`,
  (b: string, y: number) => `${b} semiconductor stocks ${y}`,
  (b: string, y: number) => `${b} biotech stocks ${y}`,
  (b: string, y: number) => `${b} healthcare stocks ${y}`,
  (b: string, y: number) => `${b} consumer stocks ${y}`,
  (b: string, y: number) => `${b} industrial stocks ${y}`,
  (b: string, y: number) => `${b} small cap stocks ${y}`,
  (b: string, y: number) => `${b} SMID stocks ${y}`,
  (b: string, y: number) => `${b} utilities stocks ${y}`,
  (b: string, y: number) => `${b} energy stocks ${y}`,
]

const SPARK_TEMPLATES = [
  (y: number) => `BofA Fab Five software stocks H2 ${y}`,
  (_y: number) => `BofA flags Fab Five software stocks`,
  (y: number) => `Morgan Stanley application software stocks ${y}`,
  (_y: number) => `Morgan Stanley AI-hit software stocks discount`,
  (y: number) => `UBS top 10 stock picks ${y}`,
  (y: number) => `Citi Large Cap Recommended List ${y}`,
  (y: number) => `Jefferies Franchise Picks ${y}`,
  (y: number) => `Goldman Sachs U.S. Conviction List additions ${y}`,
  (y: number) => `JPMorgan Analyst Focus List ${y}`,
]

export function generateAllQueries(now = new Date()): ListFinderQuery[] {
  const { queryYear } = getSellSideListWindow(now)
  const queries: ListFinderQuery[] = []

  for (const bank of BANKS) {
    for (const template of GENERAL_TEMPLATES) {
      queries.push({
        query: template(bank, queryYear),
        bank,
        category: 'general',
      })
    }
  }

  for (const template of SPARK_TEMPLATES) {
    queries.push({
      query: template(queryYear),
      bank: template(queryYear).split(/\s/)[0],
      category: 'spark',
    })
  }

  return queries
}
