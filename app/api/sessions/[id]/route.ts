/**
 * @file app/api/sessions/[id]/route.ts
 *
 * Route: GET /api/sessions/[id]
 *
 * Returns a single session owned by the authenticated professor, plus a
 * lightweight summary of the custom prompt version that was used to generate
 * it (if any). The prompt version metadata lets the UI show "Generated with
 * prompt v3 — 'Strict Q&A format'" without exposing the full prompt text.
 *
 * Auth:        Required — 401 if not logged in; 404 if session belongs to
 *              another user (intentional — avoids leaking that the session ID
 *              exists at all).
 * DB calls:    getCurrentUser(), getSessionById(), getPromptById()
 * AI calls:    None
 */

import { NextResponse } from 'next/server'
import { getPromptById } from '@/lib/db/systemPrompts'
import { getCurrentUser } from '@/lib/db/users'
import { getSessionById } from '@/lib/db/sessions'

// force-dynamic ensures auth cookies are read fresh on every request
/**
 * What it does: This variable sets the Next.js route segment option to 'force-dynamic'.
 * Why it is used: It ensures that the route handler is not statically cached and executes dynamically on every request. This is critical for routes that rely on request-specific data like authentication cookies, guaranteeing that user authentication status is always read fresh.
 * Important implementation details: 'force-dynamic' effectively makes the route behave like a server-side rendered page (similar to `getServerSideProps` in the Pages Router), allowing access to up-to-date request headers and cookies.
 */
export const dynamic = 'force-dynamic'

/**
 * GET /api/sessions/[id]
 *
 * @param _request  - Unused; route segment params carry all needed input
 * @param params.id - Session UUID from the URL path segment
 * @returns JSON `{ session: Session, promptVersion: { id, version, label } | null }`
 *          or `{ error: string }` with status 401 / 404 / 500.
 *
 * Ownership check: we intentionally return 404 (not 403) for sessions that
 * belong to other users — this avoids leaking the existence of session IDs
 * to unauthorized callers.
 *
 * promptVersion is null when `sessions.prompt_version_id` is NULL, which means
 * the built-in default prompt (lib/ai/prompt.ts) was used for generation.
 */
/**
 * What it does: This function handles GET requests for the `/api/sessions/[id]` endpoint, retrieving a specific user session along with its associated custom prompt version metadata.
 * Why it is used: It provides a secure API endpoint for client applications to fetch the details of a particular conversation session, which is essential for displaying session history, continuing a conversation, or analyzing session parameters.
 * Important implementation details:
 * 1. Authentication: It first authenticates the user using `getCurrentUser()`. If no user is found, it returns a 401 Unauthorized status.
 * 2. Session Retrieval: It fetches the session from the database using the provided `id` parameter.
 * 3. Ownership Check: A crucial security measure is implemented to prevent information leakage. If the session exists but belongs to a different user, it returns a 404 Not Found status instead of 403 Forbidden. This prevents unauthorized callers from discerning whether a given session ID exists.
 * 4. Prompt Version Resolution: If the session has a `promptVersionId`, it fetches the corresponding prompt metadata. Otherwise, `promptVersion` is null, indicating the built-in default prompt was used.
 * 5. Data Confidentiality: Only selected metadata fields (`id`, `version`, `label`) of the prompt version are returned to the client; the full prompt text is never exposed to maintain confidentiality.
 * 6. Error Handling: Includes comprehensive error handling for unauthorized access (401), session not found (404), and internal server errors (500).
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Auth check — returns null if cookie is absent or expired
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const session = await getSessionById(params.id)
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Return 404 rather than 403 to avoid confirming that the session ID exists
    if (session.userId !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Resolve the custom prompt version if one was recorded at generation time.
    // NULL prompt_version_id means the built-in default was used (no DB row needed).
    const promptVersion = session.promptVersionId
      ? await getPromptById(session.promptVersionId)
      : null

    return NextResponse.json({
      session,
      // Expose only the metadata fields; the full promptText is never sent
      // to the client to keep the prompt confidential.
      promptVersion: promptVersion
        ? {
            id: promptVersion.id,
            version: promptVersion.version,
            label: promptVersion.label,
          }
        : null,
    })

  } catch (err) {
    console.error('[/api/sessions/[id]]', err)
    return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 })
  }
}
