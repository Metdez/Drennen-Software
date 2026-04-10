/**
 * @file app/api/sessions/[id]/synthesis/route.ts
 *
 * Route: GET /api/sessions/[id]/synthesis
 *
 * Returns (or generates) a cross-source session synthesis combining multiple
 * analysis dimensions into a unified narrative. Requires at least two of the
 * three data types: questions analysis, student debrief reflections, and student
 * speaker analyses.
 *
 * Cache strategy: if a synthesis exists and its `dataTypes` set matches the
 * current available types, it is returned immediately. A stale cache (new types
 * present since last generation) triggers regeneration. The result is persisted
 * via upsertSessionSynthesis() (non-fatal on failure).
 *
 * Response shapes:
 *   - `{ insufficient, available, dataCompleteness }` — fewer than 2 types exist
 *   - `{ pending, available, ready, pendingTypes, dataCompleteness }` — analyses
 *     still being processed by fire-and-forget jobs from /api/process
 *   - `{ synthesis, dataCompleteness }` — cached or freshly generated synthesis
 *
 * Auth:        Required — 401 if not logged in; 404 if session belongs to
 *              another user.
 * DB calls:    getCurrentUser(), getSessionById(), getSessionAnalysis(),
 *              hasStudentDebriefs(), getStudentDebriefAnalysis(),
 *              hasStudentSpeakerAnalyses(), getStudentSpeakerAnalysis(),
 *              getSessionSynthesis(), upsertSessionSynthesis()
 * AI calls:    runSessionSynthesis() from lib/ai/synthesisAgent.ts (Gemini)
 */
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getSessionById } from '@/lib/db/sessions'
import { getSessionAnalysis } from '@/lib/db/sessionAnalyses'
import { hasStudentDebriefs, getStudentDebriefAnalysis } from '@/lib/db/studentDebriefs'
import { hasStudentSpeakerAnalyses, getStudentSpeakerAnalysis } from '@/lib/db/studentSpeakerAnalyses'
import { getSessionSynthesis, upsertSessionSynthesis } from '@/lib/db/sessionSyntheses'
import { runSessionSynthesis } from '@/lib/ai/synthesisAgent'

/**
 * What it does:
 * Forces the Next.js API route to be dynamically rendered at request time.
 *
 * Why it is used:
 * This is crucial for API routes that handle data that changes frequently, relies on real-time user context, or needs to prevent default caching mechanisms. By forcing dynamic rendering, the route ensures that the most up-to-date information is always fetched and processed, rather than serving a potentially stale cached version.
 *
 * Important implementation details:
 * Set to `'force-dynamic'` to opt out of static rendering and data caching for this route segment.
 */
export const dynamic = 'force-dynamic'

/**
 * What it does:
 * Handles GET requests to generate or retrieve an AI-powered synthesis report for a specific user session. It orchestrates the retrieval of various session-related data and analyses, checks for data completeness and staleness, and triggers the AI synthesis agent if necessary.
 *
 * Why it is used:
 * This API endpoint serves as the primary interface for clients (e.g., frontend applications) to obtain a comprehensive summary and high-level insights from a user's Drennen session. It aggregates information from questions, student debriefs, and speaker analyses to provide a unified synthesis.
 *
 * Important implementation details:
 * 1.  **Authentication & Authorization:** Verifies the `currentUser` and ensures they are authorized to access the requested session, returning a 401 or 404 status if not.
 * 2.  **Data Completeness Check:** Determines which types of data (questions, debriefs, speaker analyses) are available for the session. It requires at least two data types to proceed with synthesis generation, returning an `insufficient` status if the criteria are not met.
 * 3.  **Cached Synthesis Retrieval:** Attempts to fetch a previously generated synthesis from the database (`getSessionSynthesis`).
 * 4.  **Staleness Check:** If a cached synthesis exists, it checks if new data types have become available since the cache was stored. If new data types are present (making the cache stale), a new synthesis is generated.
 * 5.  **Prerequisite Analysis Check:** Gathers all necessary analyses (session analysis, debrief analysis, speaker analysis) concurrently. It then checks if these individual analyses are ready; if any are still pending (e.g., being processed by other AI agents), it returns a `pending` status.
 * 6.  **AI Synthesis Generation:** If all conditions are met (sufficient and ready data, no fresh cache, no pending analyses), it invokes the `runSessionSynthesis` AI agent with the collected data to generate a new synthesis.
 * 7.  **Persistence (Non-Fatal):** Attempts to store or update the newly generated synthesis in the database using `upsertSessionSynthesis`. This operation is designed to be non-fatal; if it fails, the error is logged, but the successful synthesis is still returned to the client.
 * 8.  **Error Handling:** Includes a comprehensive `try-catch` block to handle unexpected errors during the process, logging them and returning a 500 status with an appropriate error message.
 */
/**
 * GET /api/sessions/[id]/synthesis
 *
 * Returns the session synthesis, generating it on demand if not yet cached.
 * The synthesis combines up to three data dimensions (questions, debrief
 * reflections, speaker analyses) and requires at least two to proceed.
 *
 * @param _request  - Unused; session ID comes from the route segment
 * @param params    - Async params (Next.js 15); awaited to get `id`
 * @returns One of three JSON shapes depending on current state:
 *   - `{ insufficient, available, dataCompleteness }` — not enough data types
 *   - `{ pending, available, ready, pendingTypes, dataCompleteness }` — analyses
 *     still being generated by background jobs
 *   - `{ synthesis, dataCompleteness }` — complete synthesis result
 *
 * `dataCompleteness` is always included so the UI can render accurate context
 * about which data sources fed into the synthesis.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth check — returns null if cookie is absent or expired
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Next.js 15: params is a Promise — must be awaited before accessing properties
    const { id: sessionId } = await params
    // Ownership check — 404 rather than 403 to avoid leaking session existence
    const session = await getSessionById(sessionId)
    if (!session || session.userId !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Determine which of the three submission types currently have data.
    // 'questions' is always present (it's the original session ZIP upload).
    // Debrief and speaker-analyses are uploaded separately by the professor.
    const [hasDebriefs, hasSpeakerAnalyses] = await Promise.all([
      hasStudentDebriefs(sessionId),
      hasStudentSpeakerAnalyses(sessionId),
    ])

    const currentTypes: string[] = ['questions']
    if (hasDebriefs) currentTypes.push('debriefs')
    if (hasSpeakerAnalyses) currentTypes.push('speaker_analyses')

    // Sent back with every response so the UI can show which sources fed the synthesis
    const dataCompleteness = {
      has_questions: true,
      has_debriefs: hasDebriefs,
      has_speaker_analyses: hasSpeakerAnalyses,
    }

    // Synthesis requires combining at least 2 sources to be meaningful.
    // With only 'questions', the professor should add debrief or speaker analyses first.
    if (currentTypes.length < 2) {
      return NextResponse.json({
        insufficient: true,
        available: currentTypes,
        dataCompleteness,
      })
    }

    // Cache hit: return the stored synthesis if it covers all currently available types.
    // If new types were added since the last synthesis (stale cache), fall through to regenerate.
    const cached = await getSessionSynthesis(sessionId)
    if (cached) {
      // Staleness check: are there new data types not in the cached version?
      const cachedSet = new Set(cached.dataTypes)
      const isStale = currentTypes.some(t => !cachedSet.has(t))
      if (!isStale) {
        return NextResponse.json({
          synthesis: cached.synthesis,
          dataCompleteness,
        })
      }
      // Stale — fall through to regenerate with the additional data types
    }

    // Gather all prerequisite analyses in parallel.
    // Analysis results from debrief/speaker-analyses may be null if those
    // background AI jobs (from student-debriefs/speaker-analyses POST) haven't
    // completed yet.
    const [questionsAnalysis, debriefResult, speakerResult] = await Promise.all([
      getSessionAnalysis(sessionId),
      hasDebriefs ? getStudentDebriefAnalysis(sessionId) : Promise.resolve(null),
      hasSpeakerAnalyses ? getStudentSpeakerAnalysis(sessionId) : Promise.resolve(null),
    ])

    // Build the "ready" set. Questions analysis is optional (synthesis can proceed
    // with just the raw session output if Gemini analysis hasn't run yet).
    // Debrief/speaker analyses must be ready if their submissions exist.
    const ready: string[] = ['questions'] // questions analysis is optional for synthesis
    if (!hasDebriefs || debriefResult) ready.push('debriefs')
    if (!hasSpeakerAnalyses || speakerResult) ready.push('speaker_analyses')

    const pendingTypes = currentTypes.filter(t => !ready.includes(t))
    if (pendingTypes.length > 0) {
      // Tell the client exactly which types are still processing so it can
      // poll and show a targeted loading message
      return NextResponse.json({
        pending: true,
        available: currentTypes,
        ready,
        pendingTypes,
        dataCompleteness,
      })
    }

    // All prerequisites are ready — generate the cross-dimension synthesis
    const synthesis = await runSessionSynthesis({
      speakerName: session.speakerName,
      sessionOutput: session.output,
      questionsAnalysis,
      debriefAnalysis: debriefResult?.analysis ?? null,
      speakerAnalysis: speakerResult?.analysis ?? null,
    })

    // Persist to DB — non-fatal; if this fails the client still receives the
    // live result. The next request will simply regenerate rather than cache-hit.
    await upsertSessionSynthesis(sessionId, user.id, synthesis, currentTypes).catch(e =>
      console.error('[/api/sessions/[id]/synthesis] upsert failed (non-fatal):', e)
    )

    return NextResponse.json({
      synthesis,
      dataCompleteness,
    })
  } catch (err) {
    console.error('[/api/sessions/[id]/synthesis]', err)
    let message = err instanceof Error ? err.message : String(err)
    // Gemini SDK sometimes wraps error details as a JSON string in Error.message;
    // unwrap it so the client sees a human-readable string rather than raw JSON
    try {
      const parsed = JSON.parse(message)
      if (parsed?.error?.message) message = parsed.error.message
    } catch { /* not JSON, use as-is */ }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
