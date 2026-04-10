/**
 * @file app/api/sessions/[id]/debrief/complete/route.ts
 *
 * Route: POST /api/sessions/[id]/debrief/complete
 *
 * Locks a debrief as "complete", generates an AI summary of the session via
 * Gemini, and kicks off two background jobs. This is a terminal state change —
 * once complete the debrief cannot be edited via POST /debrief.
 *
 * Idempotent: calling this endpoint on an already-complete debrief returns
 * the existing debrief data immediately without re-running any AI.
 *
 * Fire-and-forget background jobs (do NOT block the response):
 *   1. generateClassInsights() — refreshes cross-session class analysis to
 *      incorporate the newly completed debrief's rating and observations
 *   2. generateAndPublishPostSessionFeedback() — auto-generates the post-session
 *      section of the speaker portal (if one exists and is published)
 *
 * Auth:        Required — 401 if not logged in; 404 if session belongs to
 *              another user.
 * DB calls:    getCurrentUser(), getSessionById(), getDebrief(), completeDebrief()
 * AI calls:    generateDebriefSummary() → Gemini (blocking, synchronous)
 *              generateClassInsights() → Gemini (fire-and-forget)
 *              generateAndPublishPostSessionFeedback() → Gemini (fire-and-forget)
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getSessionById } from '@/lib/db/sessions'
import { getDebrief, completeDebrief } from '@/lib/db/debriefs'
import { generateDebriefSummary } from '@/lib/ai/debriefSummary'
import { generateClassInsights } from '@/lib/ai/classInsights'
import { generateAndPublishPostSessionFeedback } from '@/lib/ai/speakerPortalPostSession'

// force-dynamic ensures auth cookies are read fresh on every request
/**
 * What it does: This variable forces the Next.js route to be dynamically rendered.
 * Why it is used: It ensures that server-side logic, particularly authentication checks involving cookies, operates on fresh request data for every incoming request.
 * Important implementation details: Setting `export const dynamic = 'force-dynamic'` disables static rendering and caching for this specific route, ensuring that `getCurrentUser()` always reads up-to-date authentication cookies.
 */
export const dynamic = 'force-dynamic'

/**
 * POST /api/sessions/[id]/debrief/complete
 *
 * @param _request  - No request body required
 * @param params.id - Session UUID from the URL path segment
 * @returns JSON `{ debrief: Debrief }` where `debrief.status === 'complete'`
 *          and `debrief.aiSummary` contains the Gemini-generated summary, or
 *          `{ error: string }` with status 401 / 404 / 500.
 *
 * Response shape includes the full debrief object merged with the new status
 * and AI summary so the client doesn't need to do a follow-up GET.
 */
/**
 * What it does: This API endpoint handles the completion of a session debrief. It authenticates the user, retrieves the session and debrief, generates an AI summary for the debrief, updates the debrief's status to 'complete' in the database, and then triggers asynchronous background tasks to update class insights and publish post-session feedback.
 * Why it is used: It provides a comprehensive mechanism to finalize a debrief, integrating AI-driven content generation directly into the completion flow and initiating subsequent analytical and communication processes.
 * Important implementation details:
 * - It requires user authentication (`getCurrentUser`).
 * - It validates the existence and ownership of the session and debrief.
 * - An idempotency guard prevents re-processing already completed debriefs, returning existing data to handle double-clicks or network retries.
 * - The AI summary is generated synchronously (`generateDebriefSummary`) before marking the debrief complete, as it's often displayed immediately.
 * - Database updates (`completeDebrief`) are performed atomically to ensure data consistency.
 * - `generateClassInsights` and `generateAndPublishPostSessionFeedback` are called asynchronously (fire-and-forget with `.catch`) to avoid blocking the client response, improving perceived performance.
 * - The response includes the full, updated debrief object, allowing the client to update its UI without a subsequent GET request.
 * - Comprehensive error handling is in place for unauthorized access, not found resources, and internal server errors.
 */
export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Auth check — returns null if cookie is absent or expired
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await getSessionById(params.id)
    if (!session || session.userId !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const debrief = await getDebrief(params.id)
    if (!debrief) {
      // Cannot complete a debrief that hasn't been started — the professor must
      // save at least a partial draft first via POST /debrief
      return NextResponse.json({ error: 'No debrief found for this session' }, { status: 404 })
    }

    // Idempotency guard: if already complete, return existing data without
    // calling Gemini again. This handles double-clicks and network retries.
    if (debrief.status === 'complete') {
      return NextResponse.json({ debrief })
    }

    // Blocking: generate the AI summary before marking complete.
    // The summary is shown immediately on the debrief completion screen,
    // so it must be ready synchronously before returning the response.
    const aiSummary = await generateDebriefSummary(session.speakerName, debrief)

    // Write the complete status and AI summary to the DB (atomic update)
    await completeDebrief(params.id, aiSummary)

    // Fire-and-forget: regenerate class insights to incorporate debrief data.
    // Debrief ratings and observations feed into the cross-session class
    // analysis, so we refresh it after completion. Not awaited so it doesn't
    // slow down the response.
    generateClassInsights(user.id).catch(e =>
      console.error('[/api/sessions/[id]/debrief/complete] generateClassInsights failed (non-fatal):', e)
    )

    // Fire-and-forget: auto-generate and publish post-session feedback to the
    // speaker portal. If the professor has already published the portal, this
    // appends the "how it went" section. Not awaited for the same reason.
    generateAndPublishPostSessionFeedback(params.id).catch(e =>
      console.error('[/api/sessions/[id]/debrief/complete] generateAndPublishPostSessionFeedback failed (non-fatal):', e)
    )

    // Return the updated debrief object so the client can update its local
    // state without a separate GET — merge in the new status and AI summary
    return NextResponse.json({
      debrief: {
        ...debrief,
        status: 'complete',
        aiSummary,
      },
    })
  } catch (err) {
    console.error('[/api/sessions/[id]/debrief/complete POST]', err)
    return NextResponse.json({ error: 'Failed to complete debrief' }, { status: 500 })
  }
}
