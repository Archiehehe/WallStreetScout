import { handleApiError } from '@/lib/api/responses'
import { SEED_CANDIDATES, saveListCandidate } from '@/lib/sellSideLists'

export async function POST() {
  try {
    const results = []
    for (const candidate of SEED_CANDIDATES) {
      const result = await saveListCandidate(candidate)
      results.push({
        institution: candidate.institution,
        listName: candidate.listName,
        success: result.success,
        errors: result.errors,
        warnings: result.warnings,
      })
    }
    const succeeded = results.filter((r) => r.success).length
    const failed = results.filter((r) => !r.success).length
    return Response.json({ imported: succeeded, failed, results })
  } catch (error) {
    return handleApiError(error)
  }
}
