import { NextRequest } from 'next/server'
import { getStore } from '@/lib/storage'
import { hasConfiguredMetricsProviders, runMetricsForTicker } from '@/lib/metrics/runMetrics'
import type { MetricRow } from '@/components/MetricTable'
import { handleApiError } from '@/lib/api/responses'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const store = getStore()

    const { id } = await params
    const article = await store.getArticle(id)
    if (!article) return Response.json({ error: 'Not found' }, { status: 404 })

    const extraction = await store.getExtraction(id)
    const source = await store.getSource(article.sourceId)

    const tickers = extraction?.extractedTickers ?? []
    const metricsResults = await Promise.all(tickers.slice(0, 5).map(t => runMetricsForTicker(t)))

    const metrics: MetricRow[] = []
    for (const m of metricsResults) {
      if (m) {
        metrics.push(
          { label: `${m.ticker} Price`, value: m.price, format: 'currency' },
          { label: `${m.ticker} Market Cap`, value: m.marketCap, format: 'currency' },
          { label: `${m.ticker} Rating`, value: m.analystRating },
          { label: `${m.ticker} Target`, value: m.avgPriceTarget, format: 'currency' },
          { label: `${m.ticker} Upside`, value: m.impliedUpside, format: 'percent' },
        )
      }
    }

    return Response.json({
      article: {
        ...article,
        cleanedText: article.cleanedText?.slice(0, 2000),
        rawText: article.rawText?.slice(0, 500),
      },
      extraction,
      source: {
        name: source?.name ?? 'Unknown',
        domain: source?.domain ?? '',
      },
      metrics,
      metricsStatus: metrics.length === 0 && !hasConfiguredMetricsProviders()
        ? 'provider_not_configured'
        : 'available',
      tickerMetrics: metricsResults.filter(Boolean),
    })
  } catch (error) {
    return handleApiError(error)
  }
}
