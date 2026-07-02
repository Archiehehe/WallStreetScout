import test from 'node:test'
import assert from 'node:assert/strict'

import { parsePastedList, parseCandidateFromText } from '../src/lib/sellSideLists/extractListCandidate'
import { saveListCandidate } from '../src/lib/sellSideLists/saveListCandidate'
import { validateListCandidate } from '../src/lib/sellSideLists/validateListCandidate'
import type { SellSideListCandidate } from '../src/lib/sellSideLists/types'

process.env.WALLSTREETSCOUT_USE_LOCAL_STORE = '1'

const baseCandidate: SellSideListCandidate = {
  institution: 'Morgan Stanley',
  listName: 'Top Picks',
  displayName: 'Morgan Stanley Top Picks',
  year: 2024,
  period: 'Q4',
  sourceType: 'paste',
  confidence: 'needs_review',
  reviewStatus: 'needs_review',
  members: [
    { ticker: 'SNOW', companyName: 'Snowflake', action: 'buy' },
    { ticker: 'DDOG', companyName: 'Datadog', action: 'buy' },
    { ticker: 'FROG', companyName: 'JFrog', action: 'buy' },
  ],
}

test('parsePastedList extracts institution, list name, and members from pasted text', () => {
  const parsed = parsePastedList('Morgan Stanley Top Picks Q4 2024\nSNOW - Snowflake\nDDOG - Datadog\nFROG - JFrog')

  assert.equal(parsed.institution, 'Morgan Stanley')
  assert.equal(parsed.listName, 'Top Picks Q4 2024')
  assert.equal(parsed.period, 'Q4')
  assert.equal(parsed.year, 2024)
  assert.equal(parsed.members?.length, 3)
  assert.deepEqual(parsed.members?.map((member) => member.ticker), ['SNOW', 'DDOG', 'FROG'])
})

test('parseCandidateFromText preserves context and falls back to known tickers', () => {
  const parsed = parseCandidateFromText('Please review SNOW and MDB for the list', {
    institution: 'Goldman Sachs',
    listName: 'High Conviction',
    sourceUrl: 'https://example.com/list',
    reviewStatus: 'needs_review',
  })

  assert.equal(parsed.institution, 'Goldman Sachs')
  assert.equal(parsed.listName, 'High Conviction')
  assert.equal(parsed.displayName, 'Goldman Sachs High Conviction')
  assert.equal(parsed.sourceUrl, 'https://example.com/list')
  assert.equal(parsed.members?.map((member) => member.ticker).join(','), 'SNOW,MDB')
})

test('validateListCandidate rejects media summaries that are not needs_review', () => {
  const result = validateListCandidate({
    ...baseCandidate,
    sourceType: 'media_summary',
    reviewStatus: 'verified',
  })

  assert.equal(result.valid, false)
  assert.match(result.errors.join(' '), /Media summaries must remain needs_review/)
})

test('validateListCandidate requires at least three unique tickers', () => {
  const result = validateListCandidate({
    ...baseCandidate,
    members: [{ ticker: 'AAPL' }, { ticker: 'AAPL' }],
  })

  assert.equal(result.valid, false)
  assert.match(result.errors.join(' '), /3\+ tickers required/)
})

test('saveListCandidate normalizes and persists a candidate through the store', async () => {
  const uniqueSuffix = Date.now().toString(36)
  const result = await saveListCandidate({
    ...baseCandidate,
    listName: `Top Picks ${uniqueSuffix}`,
    displayName: `Morgan Stanley Top Picks ${uniqueSuffix}`,
    sourceUrl: 'https://example.com/list',
    sourceType: 'media_summary',
    reviewStatus: 'needs_review',
    members: [
      { ticker: 'snow', companyName: 'Snowflake', action: 'buy' },
      { ticker: 'ddog', companyName: 'Datadog', action: 'buy' },
      { ticker: 'frog', companyName: 'JFrog', action: 'buy' },
    ],
  })

  assert.equal(result.success, true)
  assert.equal(result.status, 'created')
  assert.equal(result.created, 1)
  assert.equal(result.failed, 0)
  assert.ok(result.listId)
  assert.match(result.url ?? '', /\/conviction-lists\//)
})
