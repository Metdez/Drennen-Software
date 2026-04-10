/**
 * @file app/api/sessions/[id]/debrief/route.ts
 *
 * Routes: GET | POST /api/sessions/[id]/debrief
 *
 * Manages the professor's post-session debrief for a session. The debrief
 * captures the professor's observations, ratings, and notes after the guest
 * speaker visit. It has two lifecycle states: "draft" (in-progress) and
 * "complete" (locked by POST /debrief/complete).
 *
 * GET  — returns the current debrief (null if not started) plus the list of
 *         student names for this session (used to pre-populate the debrief UI)
 * POST — creates or updates (upserts) a draft debrief. Rejects updates to
 *         debriefs that have already been marked complete (409 Conflict).
 *
 * Auth:        Required on both methods. Uses the shared authenticateAndGetSession()
 *              helper to avoid duplicating auth + ownership checks.
 * DB calls:    getCurrentUser(), getSessionById(), getDebrief(),
 *              upsertDebrief(), getStudentNamesForSession()
 * AI calls:    None (AI summary happens in POST /debrief/complete, not here)
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getSessionById } from '@/lib/db/sessions'
import { getDebrief, upsertDebrief, getStudentNamesForSession } from '@/lib/db/debriefs'

// force-dynamic ensures auth cookies are read fresh on every request
/**
 * What it does: Exports a constant `dynamic` set to 'force-dynamic'.
 * Why it is used: This Next.js specific export ensures that the route segment opts into dynamic rendering, which is crucial for reading fresh authentication cookies on every request. This prevents caching issues that might lead to unauthorized access or stale user data.
 * Important implementation details: By setting `dynamic = 'force-dynamic'`, Next.js bypasses static optimization for this route, guaranteeing that server-side logic (like `getCurrentUser`) executes for each incoming request.
 */
export const dynamic = 'force-dynamic'

/**
 * Shared auth + session ownership helper used by both GET and POST.
 *
 * Centralises the two-step check (1) is the user logged in? (2) do they own
 * this session? into a single awaitable call so each handler stays concise.
 *
 * @param sessionId - Session UUID to look up and verify
 * @returns `{ user, session }` on success, or `{ error: NextResponse }` when
 *          auth fails — callers must check for the `error` key and return early.
 */
/**
 * What it does: This asynchronous helper function performs a two-step authentication and authorization check: first verifying the logged-in user, then confirming their ownership of the specified session.
 * Why it is used: It centralizes repetitive authentication and session ownership validation logic, making the `GET` and `POST` handlers more concise and less error-prone. This promotes consistency in access control across API methods for debriefs.
 * Important implementation details:
 * - It calls `getCurrentUser()` to retrieve the user based on the Supabase cookie; returns 401 Unauthorized if no user is found.
 * - It then fetches the session by `sessionId` and checks if the session's `userId` matches the authenticated user's `id`.
 * - If the session is not found or the user does not own it, it returns a 404 Not Found. This avoids leaking information about whether a session ID exists to unauthorized users.
 * - On success, it returns an object containing the `user` and `session` objects. On failure, it returns an object with an `error: NextResponse` which calling handlers must immediately return.
 */
async function authenticateAndGetSession(sessionId: string) {
  // getCurrentUser() reads the Supabase cookie; returns null when missing/expired
  const user = await getCurrentUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const session = await getSessionById(sessionId)
  if (!session || session.userId !== user.id) {
    // Return 404 (not 403) to avoid confirming that the session ID exists
    return { error: NextResponse.json({ error: 'Session not found' }, { status: 404 }) }
  }

  return { user, session }
}

/**
 * GET /api/sessions/[id]/debrief
 *
 * Returns the debrief record and student name list in a single response so the
 * debrief panel only needs one round-trip on initial load.
 *
 * @param _request  - Unused; session ID comes from the route segment
 * @param params.id - Session UUID from the URL path segment
 * @returns JSON `{ debrief: Debrief | null, studentNames: string[] }` or
 *          `{ error: string }` with status 401 / 404 / 500.
 */
/**
 * What it does: Handles HTTP GET requests to `/api/sessions/[id]/debrief`. It retrieves both the debrief record and the list of student names associated with a given session ID.
 * Why it is used: This endpoint provides all the necessary data for the debrief panel in a single network request, optimizing the initial load time for the user interface.
 * Important implementation details:
 * - It first calls `authenticateAndGetSession` to perform authentication and authorization checks. If authentication fails, it propagates the error response immediately.
 * - It fetches the debrief record using `getDebrief(params.id)` and the student names using `getStudentNamesForSession(params.id)` concurrently with `Promise.all` for improved performance.
 * - Returns a JSON object containing `{ debrief, studentNames }` on success.
 * - Includes a catch block for general server-side errors, returning a 500 status code.
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authenticateAndGetSession(params.id)
    // If auth returned an error response, propagate it immediately
    if ('error' in auth) return auth.error

    // Fetch both in parallel — they are independent DB queries
    const [debrief, studentNames] = await Promise.all([
      getDebrief(params.id),
      getStudentNamesForSession(params.id),
    ])

    return NextResponse.json({ debrief, studentNames })
  } catch (err) {
    console.error('[/api/sessions/[id]/debrief GET]', err)
    return NextResponse.json({ error: 'Failed to fetch debrief' }, { status: 500 })
  }
}

/**
 * POST /api/sessions/[id]/debrief
 *
 * Creates or updates (upserts) a debrief in "draft" state. Supports auto-save
 * — the UI calls this frequently as the professor types. All fields are optional
 * so partial saves work correctly.
 *
 * Completed debriefs are immutable: once locked via POST /debrief/complete,
 * this endpoint returns 409 Conflict to prevent accidental overwrites.
 *
 * @param request   - JSON body with any subset of debrief fields:
 *                    overallRating, questionsFeedback, surpriseMoments,
 *                    speakerFeedback, studentObservations, followupTopics,
 *                    privateNotes, status
 * @param params.id - Session UUID from the URL path segment
 * @returns JSON `{ debrief: Debrief }` on success, or `{ error: string }` with
 *          status 401 / 404 / 409 / 500.
 */
/**
 * What it does: Handles HTTP POST requests to `/api/sessions/[id]/debrief`. This endpoint is responsible for creating or updating (upserting) a debrief record in 'draft' state for a specific session.
 * Why it is used: It supports real-time auto-saving functionality in the UI, allowing professors to frequently save partial debrief progress. All debrief fields are optional, enabling incremental saves.
 * Important implementation details:
 * - It begins by calling `authenticateAndGetSession` to ensure the user is logged in and owns the session.
 * - **Crucially**: It checks if an existing debrief for the session is already in a 'complete' status. If so, it returns a 409 Conflict status, preventing any further modifications to a locked debrief. This ensures the integrity of the debrief content, especially after AI summary generation.
 * - It parses the incoming request body, extracting debrief fields such as `overallRating`, `questionsFeedback`, etc.
 * - It then calls `upsertDebrief` to save the provided data. Since fields are optional in the request body, `upsertDebrief` handles partial updates correctly.
 * - Returns a JSON object `{ debrief }` on successful upsert.
 * - Includes a catch block to handle server-side errors, returning a 500 status code.
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authenticateAndGetSession(params.id)
    if ('error' in auth) return auth.error

    // Guard: once a debrief is complete it is locked — refuse further edits
    // to preserve the integrity of the AI summary generated at completion time.
    const existing = await getDebrief(params.id)
    if (existing && existing.status === 'complete') {
      return NextResponse.json({ error: 'Debrief is already complete' }, { status: 409 })
    }

    const body = await request.json()

    const debrief = await upsertDebrief({
      sessionId: params.id,
      userId: auth.user.id,
      overallRating: body.overallRating,
      questionsFeedback: body.questionsFeedback,
      surpriseMoments: body.surpriseMoments,
      speakerFeedback: body.speakerFeedback,
      studentObservations: body.studentObservations,
      followupTopics: body.followupTopics,
      privateNotes: body.privateNotes,
      status: body.status,
    })

    return NextResponse.json({ debrief })
  } catch (err) {
    console.error('[/api/sessions/[id]/debrief POST]', err)
    return NextResponse.json({ error: 'Failed to save debrief' }, { status: 500 })
  }
}
