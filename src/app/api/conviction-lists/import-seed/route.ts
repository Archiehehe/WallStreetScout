import { handleApiError } from '@/lib/api/responses'
import { SEED_CANDIDATES, saveListCandidate } from '@/lib/sellSideLists'

export async function POST() {
  try {
    const results = []
    let created = 0
    let updated = 0
    let skipped = 0
    let failed = 0
    const failedItems = []

    for (const candidate of SEED_CANDIDATES) {
      const result = await saveListCandidate(candidate)
      results.push({
        institution: candidate.institution,
        listName: candidate.listName,
        success: result.success,
        listId: result.listId,
        errors: result.errors,
        warnings: result.warnings,
        status: result.status,
      })
      if (!result.success) {
        failed++
        failedItems.push({
          institution: candidate.institution,
          listName: candidate.listName,
          errors: result.errors,
        })
      } else {
        if (result.status === 'created') {
          created++
        } else if (result.status === 'updated') {
          updated++
        } else if (result.status === 'skipped') {
          skipped++
        }
      }
    }

    return Response.json({
      ok: true,
      message: `Import complete: ${created} created, ${updated} updated, ${skipped} skipped, ${failed} failed`,
      created,
      updated,
      skipped,
      failed,
      total: results.length,
      errors: failedItems,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
