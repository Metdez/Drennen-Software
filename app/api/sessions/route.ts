/**
 * @file app/api/sessions/route.ts
 *
 * Route: GET /api/sessions
 *
 * Returns the authenticated professor's session list, optionally filtered by
 * semester. Each session is enriched with its debrief status and overall rating
 * so the history page can render completion indicators without a second fetch.
 *
 * Auth:        Required — uses cookie-based Supabase session via getCurrentUser()
 * DB calls:    getSessionsByUser(), getDebriefStatusesBySessionIds()
 * AI calls:    None
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getSessionsByUser } from '@/lib/db/sessions'
import { getDebriefStatusesBySessionIds } from '@/lib/db/debriefs'

// force-dynamic ensures auth cookies are read on every request, never cached
/**
 * What it does: This constant is a Next.js route segment configuration.
 * Why it is used: It ensures that this API route is always dynamically rendered on every request. This is crucial for pages or API routes that rely on request-specific data, such as authentication cookies, to prevent stale or cached responses.
 * Important implementation details: Setting it to 'force-dynamic' explicitly disables static generation or caching for this route.
 */
export const dynamic = 'force-dynamic'

/**
 * GET /api/sessions
 *
 * @param request - Standard Web Request; reads optional `?semester=<uuid>` query param
 * @returns JSON `{ sessions: EnrichedSession[] }` where each session has
 *          `debriefStatus` ("draft" | "complete" | null) and `debriefRating` (1–5 | null)
 *          appended, or `{ error: string }` with status 401 / 500.
 *
 * Query params:
 *   - `semester` (optional UUID) — filters results to a specific semester;
 *     omit to return all sessions regardless of semester assignment.
 */
/**
 * What it does: Handles HTTP GET requests to the `/api/sessions` endpoint. It retrieves a list of coaching sessions for the authenticated user, optionally filtered by a specific semester, and enriches these sessions with debrief status and rating information.
 * Why it is used: This function provides the backend logic for the frontend to fetch a comprehensive view of a user's coaching sessions, including their associated debrief progress and ratings, essential for displaying user dashboards or session lists.
 * Important implementation details:
 * - It parses an optional `semester` query parameter from the request URL to filter results.
 * - It performs an authentication check using `getCurrentUser()` which relies on Supabase session cookies. If the user is not authenticated, it returns a 401 Unauthorized response.
 * - It fetches base session data using `getSessionsByUser()`.
 * - To optimize performance, it retrieves debrief statuses and ratings for all fetched session IDs in a single batch query via `getDebriefStatusesBySessionIds()`. This avoids N+1 query problems.
 * - The debrief information is then merged into each session object, providing `debriefStatus` (either 'draft', 'complete', or `null` if no debrief exists) and `debriefRating` (1-5 or `null`).
 * - Includes robust error handling to catch potential issues during data retrieval or processing, returning a 500 Internal Server Error if an unhandled exception occurs.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const semesterId = searchParams.get('semester') || undefined

    // Auth check — getCurrentUser() reads the Supabase cookie set by the
    // (app) layout. Returns null when the session is missing or expired.
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessions = await getSessionsByUser(user.id, semesterId)

    // Enrich sessions with debrief status and rating.
    // A single batch lookup is far cheaper than N individual queries, so we
    // fetch all debrief metadata for the returned session IDs at once and
    // then merge it in via a Map keyed by session ID.
    const debriefMap = await getDebriefStatusesBySessionIds(sessions.map(s => s.id))
    const enrichedSessions = sessions.map(s => {
      const info = debriefMap.get(s.id)
      return {
        ...s,
        // null means no debrief has been started for this session yet
        debriefStatus: info?.status ?? null,
        debriefRating: info?.overallRating ?? null,
      }
    })

    return NextResponse.json({ sessions: enrichedSessions })

  } catch (err) {
    console.error('[/api/sessions]', err)
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
  }
}
