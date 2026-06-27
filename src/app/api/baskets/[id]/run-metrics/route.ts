import { NextRequest } from 'next/server'
import { getStore } from '@/lib/storage'
import { hasConfiguredMetricsProviders, runMetricsForTicker } from '@/lib/metrics/runMetrics'
import { handleApiError } from '@/lib/api/responses'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const store = getStore()
    const { id } = await params
    const basket = await store.getBasket(id)
    if (!basket) return Response.json({ error: 'Not found' }, { status: 404 })

    const members = await store.getBasketMembers(id)
    const results: Record<string, unknown> = {}

    for (const member of members) {
      results[member.ticker] = await runMetricsForTicker(member.ticker, true)
    }

    const providerConfigured = hasConfiguredMetricsProviders()
    return Response.json({
      basketId: id,
      tickers: members.map(m => m.ticker),
      providerConfigured,
      status: providerConfigured ? 'completed' : 'provider_not_configured',
      message: providerConfigured ? undefined : 'Metrics provider not configured.',
      results,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
