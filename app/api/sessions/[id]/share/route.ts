/**
 * @file app/api/sessions/[id]/share/route.ts
 *
 * Routes: GET | POST | DELETE /api/sessions/[id]/share
 *
 * Controls public sharing of a session output via token-based links. Shared
 * sessions are accessible without authentication at /shared/[token]. The share
 * token is generated once and persisted; subsequent POST calls return the
 * existing token (idempotent). Revoking the token (DELETE) immediately breaks
 * all existing shared links for this session.
 *
 * GET    — returns current share status and the existing token (if any).
 * POST   — enables sharing: creates a share token if one doesn't exist, or
 *           returns the existing token if sharing is already active.
 * DELETE — revokes the share token; shared links stop working immediately.
 *
 * Auth:        Required on all methods. Uses the shared authenticateAndGetSession()
 *              helper to avoid duplicating auth + ownership checks.
 * DB calls:    getCurrentUser(), getSessionById(), getSessionShare(),
 *              enableSessionShare(), revokeSessionShare()
 * AI calls:    None
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getSessionById } from '@/lib/db/sessions'
import { getSessionShare, enableSessionShare, revokeSessionShare } from '@/lib/db/sessionShares'

/**
 * Forces dynamic rendering for this Next.js API route.
 *
 * What it does: It explicitly tells Next.js not to statically optimize or cache the output of this route.
 * Why it is used: This is crucial for routes that handle user-specific data, authentication, or require real-time database interactions, ensuring that each request receives a fresh, non-cached response.
 * Important implementation details: Setting 'force-dynamic' ensures server-side rendering on every request.
 */
export const dynamic = 'force-dynamic'

/**
 * Authenticates the current user and verifies ownership of the specified session.
 *
 * What it does: This helper function centralizes the authentication and authorization logic for accessing a session's share status. It retrieves the current authenticated user and then checks if the session identified by `sessionId` exists and belongs to that user.
 * Why it is used: To reduce code duplication and ensure consistent security checks across all HTTP methods (GET, POST, DELETE) for this API route. It provides a single point of failure for authentication/authorization, making the route more robust and easier to maintain.
 * Important implementation details:
 * - It fetches the current user using `getCurrentUser()`.
 * - If no user is authenticated, it returns an `Unauthorized` (401) error.
 * - It fetches the session using `getSessionById()`.
 * - If the session does not exist or its `userId` does not match the authenticated user's ID, it returns a `Session not found` (404) error.
 * - On success, it returns an object containing both the authenticated `user` and the `session` object. On failure, it returns an object with an `error` property, which is a `NextResponse` object ready to be returned from the API route.
 */
async function authenticateAndGetSession(sessionId: string) {
  const user = await getCurrentUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const session = await getSessionById(sessionId)
  if (!session || session.userId !== user.id) {
    return { error: NextResponse.json({ error: 'Session not found' }, { status: 404 }) }
  }

  return { user, session }
}

/**
 * Handles GET requests to retrieve the sharing status of a specific user session.
 *
 * What it does: This endpoint allows a user to check if a session they own is currently shared. If it is shared, it returns the `shareToken` associated with it.
 * Why it is used: To provide information about a session's public accessibility, enabling UI components to display the current sharing state and the share link.
 * Important implementation details:
 * - It first calls `authenticateAndGetSession` to ensure the request is authorized and the session exists and belongs to the user.
 * - It then uses `getSessionShare` to query the database for existing share information for the given `sessionId`.
 * - If a share entry is found, it responds with `shared: true` and the `shareToken`.
 * - If no share entry is found, it responds with `shared: false`.
 * - Includes comprehensive error handling, logging any exceptions and returning a 500 status code for internal server errors.
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authenticateAndGetSession(params.id)
    if ('error' in auth) return auth.error

    const share = await getSessionShare(params.id)
    if (!share) {
      return NextResponse.json({ shared: false })
    }

    return NextResponse.json({
      shared: true,
      shareToken: share.shareToken,
    })
  } catch (err) {
    console.error('[/api/sessions/[id]/share GET]', err)
    return NextResponse.json({ error: 'Failed to fetch share status' }, { status: 500 })
  }
}

/**
 * Handles POST requests to enable sharing for a specific user session.
 *
 * What it does: This endpoint allows a user to make a session they own publicly accessible via a unique share token and URL. If the session is already shared, it returns the existing share details.
 * Why it is used: To provide functionality for users to generate a shareable link for their sessions, allowing others to view the session's content without needing to log in.
 * Important implementation details:
 * - It first calls `authenticateAndGetSession` to ensure the request is authorized and the session exists and belongs to the user.
 * - It checks for an `existing` share entry using `getSessionShare` to prevent creating duplicate share tokens for the same session. If an existing share is found, it returns its token and constructs the share URL.
 * - If no existing share is found, it calls `enableSessionShare` to create a new share entry in the database, generating a unique `shareToken`.
 * - It constructs the full `shareUrl` using the request's origin and the generated `shareToken`.
 * - It returns a JSON response containing the `shareToken` and `shareUrl`.
 * - Includes comprehensive error handling, logging any exceptions and returning a 500 status code for internal server errors.
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authenticateAndGetSession(params.id)
    if ('error' in auth) return auth.error

    // Check if already shared
    const existing = await getSessionShare(params.id)
    if (existing) {
      const origin = new URL(request.url).origin
      return NextResponse.json({
        shareToken: existing.shareToken,
        shareUrl: `${origin}/shared/${existing.shareToken}`,
      })
    }

    const share = await enableSessionShare(params.id, auth.user.id)
    const origin = new URL(request.url).origin

    return NextResponse.json({
      shareToken: share.shareToken,
      shareUrl: `${origin}/shared/${share.shareToken}`,
    })
  } catch (err) {
    console.error('[/api/sessions/[id]/share POST]', err)
    return NextResponse.json({ error: 'Failed to enable sharing' }, { status: 500 })
  }
}

/**
 * Handles DELETE requests to revoke sharing for a specific user session.
 *
 * What it does: This endpoint allows a user to disable public access to a session that was previously shared, effectively invalidating the share link.
 * Why it is used: To provide users with the ability to control the privacy of their sessions, revoking public access when it's no longer needed or desired.
 * Important implementation details:
 * - It first calls `authenticateAndGetSession` to ensure the request is authorized and the session exists and belongs to the user.
 * - It then calls `revokeSessionShare` to remove the share entry from the database, making the session inaccessible via its share token.
 * - It returns a JSON response with `success: true` upon successful revocation.
 * - Includes comprehensive error handling, logging any exceptions and returning a 500 status code for internal server errors.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authenticateAndGetSession(params.id)
    if ('error' in auth) return auth.error

    await revokeSessionShare(params.id, auth.user.id)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[/api/sessions/[id]/share DELETE]', err)
    return NextResponse.json({ error: 'Failed to revoke sharing' }, { status: 500 })
  }
}
