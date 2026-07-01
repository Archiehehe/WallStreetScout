import { getStore } from '@/lib/storage'
import { handleApiError } from '@/lib/api/responses'
import { isScreenableEquityTicker, normalizeTicker } from '@/lib/utils/screenableTicker'
import { getSellSideListWindow, generateAllQueries, SEED_CANDIDATES, PARTIAL_CANDIDATES } from '@/lib/sellSideLists'
import type { NextRequest as NextReq } from 'next/server'

export async function GET(request: NextReq) {
  try {
    const store = getStore()
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const institution = searchParams.get('institution')
    const year = searchParams.get('year')
    const theme = searchParams.get('theme')
    const sector = searchParams.get('sector')
    const reviewStatus = searchParams.get('reviewStatus')
    const confidence = searchParams.get('confidence')
    const sourceType = searchParams.get('sourceType')
    const sortBy = searchParams.get('sortBy') || 'updatedAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    let lists = await store.getConvictionLists()

    // Filtering
    // Default: exclude rejected lists
    if (!reviewStatus) {
      lists = lists.filter(list => list.reviewStatus !== 'rejected')
    }
    if (search) {
      const searchLower = search.toLowerCase()
      lists = lists.filter(list => (
        list.institution.toLowerCase().includes(searchLower) ||
        list.listName.toLowerCase().includes(searchLower) ||
        list.displayName.toLowerCase().includes(searchLower) ||
        (list.theme?.toLowerCase().includes(searchLower)) ||
        (list.sector?.toLowerCase().includes(searchLower))
      ))
    }
    if (institution) {
      lists = lists.filter(list => list.institution === institution)
    }
    if (year) {
      const yearNum = parseInt(year)
      lists = lists.filter(list => list.year === yearNum)
    }
    if (theme) {
      lists = lists.filter(list => list.theme === theme)
    }
    if (sector) {
      lists = lists.filter(list => list.sector === sector)
    }
    if (reviewStatus) {
      lists = lists.filter(list => list.reviewStatus === reviewStatus)
    }
    if (confidence) {
      lists = lists.filter(list => list.confidence === confidence)
    }
    if (sourceType) {
      lists = lists.filter(list => list.sourceType === sourceType)
    }

    // Sorting
    lists = lists.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'updatedAt':
          comparison = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          break
        case 'createdAt':
          comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          break
        case 'institution':
          comparison = a.institution.localeCompare(b.institution)
          break
        default:
          comparison = 0
      }
      return sortOrder === 'asc' ? -comparison : comparison
    })

    // Fetch members and overlaps for each list
    const result = []
    for (const list of lists) {
      const members = await store.getConvictionListMembers(list.id)
      const tickers = members.map((member) => member.ticker)
      const overlaps = await store.get13FOverlapsForTickers(tickers)
      result.push({
        ...list,
        members,
        tickers,
        tickerCount: tickers.length,
        overlaps,
      })
    }

    const sellSideWindow = getSellSideListWindow()

    return Response.json({
      lists: result,
      diagnostics: {
        totalLists: result.length,
        needsReview: result.filter((l) => l.confidence === 'needs_review').length,
        verified: result.filter((l) => l.confidence === 'verified').length,
        seedAvailable: SEED_CANDIDATES.length,
        partialCandidates: PARTIAL_CANDIDATES.length,
        listFinderWindow: {
          fromDate: sellSideWindow.fromDate.toISOString(),
          toDate: sellSideWindow.toDate.toISOString(),
          yearLabel: sellSideWindow.yearLabel,
        },
        generatedQueryCount: generateAllQueries().length,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextReq) {
  try {
    const store = getStore()
    const body = await request.json()
    const institution = requiredString(body.institution, 'Institution')
    const listName = requiredString(body.listName, 'List name')
    const confidence = body.confidence === 'verified' ? 'verified' : 'needs_review'
    const sourceUrl = typeof body.sourceUrl === 'string' ? body.sourceUrl.trim() : ''

    if (confidence === 'verified' && !sourceUrl) {
      return Response.json({ error: 'Source URL is required for verified lists' }, { status: 422 })
    }

    const tickers = Array.from(new Set(
      String(body.tickers ?? '')
        .split(',')
        .map((ticker) => normalizeTicker(ticker))
        .filter((ticker) => isScreenableEquityTicker(ticker)),
    ))

    if (tickers.length < 3) {
      return Response.json({ error: 'Conviction Lists require at least 3 screenable public equity tickers' }, { status: 422 })
    }

    const displayName = `${institution} ${listName}`
    const slug = slugify([institution, listName, body.year].filter(Boolean).join(' '))
    const existing = await store.getConvictionList(slug)
    if (existing) {
      return Response.json({ error: 'A conviction list with this institution/name/year already exists' }, { status: 409 })
    }

    const list = await store.createConvictionList({
      slug,
      institution,
      listName,
      displayName,
      year: numberOrUndefined(body.year),
      period: optionalString(body.period),
      theme: optionalString(body.theme),
      sector: optionalString(body.sector),
      region: optionalString(body.region),
      sourceUrl: sourceUrl || undefined,
      sourceType: sourceUrl ? (sourceUrl.toLowerCase().includes('.pdf') ? 'official_pdf' : 'official_page') : 'manual',
      accessStatus: 'public',
      confidence,
      notes: optionalString(body.notes),
    })

    for (const [index, ticker] of tickers.entries()) {
      await store.addConvictionListMember({
        convictionListId: list.id,
        ticker,
        rank: index + 1,
      })
    }

    const members = await store.getConvictionListMembers(list.id)

    return Response.json({ ...list, members, tickers, tickerCount: tickers.length }, { status: 201 })
  } catch (error) {
    if (error instanceof ValidationError) {
      return Response.json({ error: error.message }, { status: 422 })
    }
    return handleApiError(error)
  }
}

class ValidationError extends Error {}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new ValidationError(`${label} is required`)
  return value.trim()
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function numberOrUndefined(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}
