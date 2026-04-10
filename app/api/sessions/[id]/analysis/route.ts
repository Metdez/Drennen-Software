/**
 * @file app/api/sessions/[id]/analysis/route.ts
 *
 * Route: GET /api/sessions/[id]/analysis
 *
 * Returns (or lazily generates) the Gemini-powered per-session analysis for
 * the /preview "analysis" and "insights" tabs. The analysis includes theme
 * clusters, tensions, suggestions, blind spots, and sentiment distribution.
 *
 * Cache strategy (read-through):
 *   1. Check `session_analyses` table for a previously persisted result.
 *   2. If found, return immediately — no Gemini call needed.
 *   3. If not found, fetch student submissions, call Gemini via
 *      runSessionAnalysis(), persist the result for future visits, then return.
 *
 * Auth:        Required — 401 if not logged in; 404 if session belongs to
 *              another user.
 * DB calls:    getCurrentUser(), getSessionById(), getSessionAnalysis(),
 *              insertSessionAnalysis(), student_submissions (admin client)
 * AI calls:    runSessionAnalysis() → Gemini (skipped on cache hit)
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getSessionById } from '@/lib/db/sessions'
import { createAdminClient } from '@/lib/supabase/server'
import { runSessionAnalysis } from '@/lib/ai/analysisAgent'
import { getSessionAnalysis, insertSessionAnalysis } from '@/lib/db/sessionAnalyses'

// force-dynamic ensures auth cookies are read fresh; never serve a stale
// cached response from the Next.js route cache.
/**
 * What it does: This constant forces the Next.js API route to be dynamically rendered on each request, rather than being cached.
 * Why it is used: It is crucial for ensuring that authentication cookies are read fresh for every request. This prevents serving stale, cached responses that might contain outdated user authentication states or data, ensuring proper authorization checks.
 * Important implementation details: Setting `export const dynamic = 'force-dynamic'` explicitly disables static caching for this route.
 */
export const dynamic = 'force-dynamic'

/**
 * GET /api/sessions/[id]/analysis
 *
 * @param _request  - Unused; session ID comes from the route segment
 * @param params.id - Session UUID from the URL path segment
 * @returns JSON `SessionAnalysis` (theme_clusters, tensions, suggestions,
 *          blind_spots, sentiment) on success, `{ empty: true }` when the
 *          session has no student submissions, or `{ error: string }` with
 *          status 401 / 404 / 500.
 *
 * Note: the `insertSessionAnalysis` call after generation is intentionally
 * non-fatal (`.catch()`). If it fails the client still receives the analysis;
 * the next request will simply regenerate rather than read from cache.
 */
/**
 * What it does: Handles HTTP GET requests to `/api/sessions/[id]/analysis`. It retrieves or generates an AI-powered analysis of student submissions for a specified session.
 * Why it is used: This endpoint provides a mechanism for clients (e.g., a professor's UI) to obtain synthesized insights, theme clusters, tensions, suggestions, and blind spots from student contributions to a session, leveraging AI capabilities.
 * Important implementation details:
 * - **Authentication and Authorization:** It first verifies the current user using `getCurrentUser()` and then ensures the requested session `id` exists and belongs to the authenticated user, returning 401 Unauthorized or 404 Not Found if checks fail.
 * - **Caching Strategy:** It attempts to retrieve a pre-generated analysis from the database via `getSessionAnalysis()`. If found, this cached version is returned immediately, optimizing performance and reducing AI model calls.
 * - **Submission Retrieval:** If no cached analysis is found, it fetches raw student submissions for the session. An `createAdminClient()` is used to bypass Row-Level Security (RLS) as ownership is already verified, making the read more efficient.
 * - **Empty Session Handling:** It explicitly checks if there are no student submissions for the session and returns `{ empty: true }` to the client in such cases.
 * - **AI Analysis Generation:** It invokes `runSessionAnalysis()` with the session details and student submissions to generate the AI analysis.
 * - **Non-Fatal Caching:** After successful generation, the analysis is asynchronously persisted to the database using `insertSessionAnalysis()`. This operation is intentionally non-fatal (`.catch()`), meaning if the database write fails, the client still receives the live analysis, and the next request will simply regenerate it.
 * - **Error Handling:** It includes comprehensive error handling, logging issues to the console, and attempts to parse and humanize error messages from the Gemini SDK before returning a 500 Internal Server Error.
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Auth check — getCurrentUser() reads the Supabase cookie
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const session = await getSessionById(params.id)
    if (!session || session.userId !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Cache hit: return persisted analysis without calling Gemini.
    // Analysis is generated by /api/process (fire-and-forget) so it is usually
    // already present by the time the professor opens /preview.
    const cached = await getSessionAnalysis(params.id)
    if (cached) {
      return NextResponse.json(cached)
    }

    // Cache miss: fetch raw submissions from DB.
    // We use the admin client here because ownership has already been verified
    // above, and the admin client bypasses RLS for this background-style read
    // without requiring the cookie-based client to re-authenticate.
    const supabase = createAdminClient()
    const { data: submRows, error: submError } = await supabase
      .from('student_submissions')
      .select('student_name, submission_text')
      .eq('session_id', params.id)
      .order('created_at', { ascending: true })

    if (submError) throw new Error(`Failed to fetch submissions: ${submError.message}`)

    const submissions = (submRows ?? []).map((r) => ({
      student_name: r.student_name ?? '',
      submission_text: r.submission_text ?? '',
    }))

    // Guard: a session could theoretically have no submissions if parsing failed
    if (submissions.length === 0) {
      return NextResponse.json({ empty: true })
    }

    const analysis = await runSessionAnalysis(
      session.speakerName,
      session.output,
      submissions
    )

    // Persist to DB so future visits are instant (non-fatal — client still
    // receives the live result even if the write fails)
    await insertSessionAnalysis(params.id, user.id, analysis).catch(e =>
      console.error('[/api/sessions/[id]/analysis] insertSessionAnalysis failed (non-fatal):', e)
    )

    return NextResponse.json(analysis)
  } catch (err) {
    console.error('[/api/sessions/[id]/analysis]', err)
    let message = err instanceof Error ? err.message : String(err)
    // Gemini SDK sometimes wraps its error details as a JSON string in the
    // Error.message field. Unwrap it so the client sees a human-readable string
    // rather than raw JSON.
    try {
      const parsed = JSON.parse(message)
      if (parsed?.error?.message) message = parsed.error.message
    } catch { /* not JSON, use as-is */ }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
