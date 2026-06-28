import { NextRequest } from 'next/server'
import { getStore } from '@/lib/storage'
import { fetchUrlsFromSource } from '@/lib/ingestion/fetcher'
import { submitArticleUrl } from '@/lib/ingestion/submitArticle'

export async function POST(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')?.replace('Bearer ', '')

  if (cronSecret && authHeader !== cronSecret) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const store = getStore()
  const { sourceId } = await request.json()

  if (!sourceId) {
    return Response.json({ error: 'sourceId required' }, { status: 400 })
  }

  const source = await store.getSource(sourceId)
  if (!source) {
    return Response.json({ error: 'Source not found' }, { status: 404 })
  }

  const urls = await fetchUrlsFromSource(source)
  const results = []

  for (const fetched of urls) {
    try {
      const result = await submitArticleUrl(fetched.url, {
        source,
        fetchedTitle: fetched.title,
        fetchedPublishedAt: fetched.publishedAt,
      })
      results.push({ url: fetched.url, status: result.saved ? 'saved' : 'rejected', ...result })
    } catch (err) {
      results.push({ url: fetched.url, status: 'error', error: String(err) })
    }
  }

  return Response.json({ source: source.name, urlsFound: urls.length, results })
}
