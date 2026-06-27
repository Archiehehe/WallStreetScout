import { StorageConfigurationError } from '@/lib/storage'

export function setupRequiredResponse(message?: string): Response {
  return Response.json(
    {
      error: 'setup_required',
      message: message ?? 'Supabase is not configured. Add SUPABASE_URL and SUPABASE_ANON_KEY to use production storage.',
    },
    { status: 503 },
  )
}

export function errorResponse(message: string, status = 400, extra?: Record<string, unknown>): Response {
  return Response.json({ error: message, ...extra }, { status })
}

export function handleApiError(error: unknown): Response {
  if (
    error instanceof StorageConfigurationError ||
    (error instanceof Error && error.message.toLowerCase().includes('supabase not configured'))
  ) {
    return setupRequiredResponse(error instanceof Error ? error.message : undefined)
  }

  return Response.json(
    { error: error instanceof Error ? error.message : 'Unexpected server error' },
    { status: 500 },
  )
}
