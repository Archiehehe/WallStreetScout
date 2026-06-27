import { NextRequest } from 'next/server'
import { ArticleSubmitError, submitArticleUrl } from '@/lib/ingestion/submitArticle'
import { errorResponse, handleApiError } from '@/lib/api/responses'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()
    if (!url || typeof url !== 'string') {
      return errorResponse('URL required.', 400, { code: 'invalid_url' })
    }

    const result = await submitArticleUrl(url)
    if (result.saved) return Response.json(result, { status: 201 })
    if ('duplicate' in result && result.duplicate) return Response.json(result)
    return Response.json(result, { status: 422 })
  } catch (error) {
    if (error instanceof ArticleSubmitError) {
      return errorResponse(error.message, error.status, { code: error.code })
    }
    return handleApiError(error)
  }
}
