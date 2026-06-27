import { getCachedMetrics, cacheMetrics, TTL } from './cache'
import type { MergedMetrics } from './types'
import { fmpProvider } from './providers/fmp'
import { finnhubProvider } from './providers/finnhub'
import { twelveDataProvider } from './providers/twelveData'
import { alphaVantageProvider } from './providers/alphaVantage'
import { secapiProvider } from './providers/secapi'

const PROVIDERS = [
  fmpProvider,
  finnhubProvider,
  twelveDataProvider,
  alphaVantageProvider,
  secapiProvider,
]

export const METRICS_PROVIDER_ENV_VARS = [
  'FMP_API_KEY',
  'FINNHUB_API_KEY',
  'TWELVE_DATA_API_KEY',
  'ALPHA_VANTAGE_API_KEY',
  'SECAPI_KEY',
]

export function getConfiguredMetricsProviderCount(): number {
  return METRICS_PROVIDER_ENV_VARS.filter((name) => Boolean(process.env[name])).length
}

export function hasConfiguredMetricsProviders(): boolean {
  return getConfiguredMetricsProviderCount() > 0
}

export async function runMetricsForTicker(ticker: string, forceRefresh = false): Promise<MergedMetrics | null> {
  if (!forceRefresh) {
    const cached = await getCachedMetrics(ticker, TTL.PRICE)
    if (cached) {
      return {
        ticker: ticker.toUpperCase(),
        provider: cached.provider,
        price: cached.price,
        marketCap: cached.marketCap,
        analystRating: cached.analystRating,
        avgPriceTarget: cached.avgPriceTarget,
        impliedUpside: cached.impliedUpside,
        athPrice: cached.athPrice,
        distanceFromAth: cached.distanceFromAth,
        high52Week: cached.high52Week,
        low52Week: cached.low52Week,
        revenueGrowth: cached.revenueGrowth,
        valuationJson: cached.valuationJson,
        earningsDate: cached.earningsDate,
        insiderActivityJson: cached.insiderActivityJson,
        rawJson: cached.rawJson,
        cached: true,
        cacheDate: cached.snapshotDate,
      }
    }
  }

  for (const provider of PROVIDERS) {
    try {
      const snap = await provider.getSnapshot(ticker)
      if (snap) {
        await cacheMetrics(ticker, provider.name, snap)
        return {
          ticker: ticker.toUpperCase(),
          provider: provider.name,
          ...snap,
          cached: false,
        }
      }
    } catch (err) {
      console.error(`Provider ${provider.name} failed for ${ticker}:`, err)
    }
  }

  return null
}

export async function runMetricsForTickers(
  tickers: string[],
): Promise<Map<string, MergedMetrics | null>> {
  const results = new Map<string, MergedMetrics | null>()
  for (const ticker of tickers) {
    results.set(ticker.toUpperCase(), await runMetricsForTicker(ticker))
  }
  return results
}
