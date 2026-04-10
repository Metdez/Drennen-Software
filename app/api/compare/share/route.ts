/**
 * POST /api/compare/share
 * DELETE /api/compare/share
 *
 * Manages the public share link for a saved session comparison.
 *
 * Auth: required for both methods
 *
 * POST — enables public sharing for a comparison and returns a share token
 *   and full URL. If a token already exists, it is returned unchanged.
 *   Request body: { comparisonId: string }
 *   Response (200): { shareToken: string; shareUrl: string }
 *     The shareUrl points to /shared/compare/[token] — a public page
 *     requiring no authentication.
 *
 * DELETE — revokes the share token for a comparison, making the public URL
 *   inaccessible. The comparison data itself is NOT deleted.
 *   Request body: { comparisonId: string }
 *   Response (200): { success: true }
 *
 * Error responses (both methods):
 *   400 — missing comparisonId
 *   401 — not authenticated
 *   500 — unexpected error
 *
 * DB functions: enableComparisonShare(), revokeComparisonShare()
 *   (both in lib/db/savedComparisons.ts)
 */
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { enableComparisonShare, revokeComparisonShare } from '@/lib/db/savedComparisons'

/**
 * What it does: This variable forces the Next.js API route to be dynamically rendered at request time.
 * Why it is used: It ensures that the route's logic is executed on every request, preventing static optimization or caching at build time. This is crucial for routes that rely on real-time user authentication (`getCurrentUser`) or dynamic request-specific information (like `request.url` for generating the share URL).
 * Important implementation details: Setting `dynamic = 'force-dynamic'` explicitly tells Next.js not to pre-render or cache the route, guaranteeing that the server-side code runs for each incoming request.
 */
export const dynamic = 'force-dynamic'

/**
 * Enables public sharing for a saved comparison and returns the share URL.
 *
 * @param request - JSON body with comparisonId
 * @returns 200 { shareToken, shareUrl }
 */
/**
 * What it does: This asynchronous function handles HTTP POST requests to the `/api/compare/share` endpoint. Its primary role is to enable public sharing for a specified saved comparison and return the generated share URL.
 * Why it is used: It provides the API interface for users to make their saved comparisons publicly accessible via a unique, shareable link. This allows them to easily share their analysis with others without requiring recipients to log in.
 * Important implementation details:
 * 1.  **Authentication**: It first authenticates the user using `getCurrentUser()`. If no user is found, it returns a 401 Unauthorized response.
 * 2.  **Input Validation**: It expects a `comparisonId` in the request body. If `comparisonId` is missing, it returns a 400 Bad Request response.
 * 3.  **Database Interaction**: It calls `enableComparisonShare()` from the database utility to generate or retrieve a share token for the comparison, linked to the authenticated user.
 * 4.  **Dynamic URL Construction**: The `shareUrl` is constructed dynamically using the `origin` from the incoming `request.url`. This ensures that the generated URL is correct regardless of the deployment environment (e.g., `localhost`, staging, production) without needing to hardcode environment variables like `NEXT_PUBLIC_SITE_URL`.
 * 5.  **Error Handling**: A `try-catch` block is used to log any server-side errors and return a 500 Internal Server Error response to the client.
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { comparisonId } = await request.json()
    if (!comparisonId) {
      return NextResponse.json({ error: 'Missing comparisonId' }, { status: 400 })
    }

    const token = await enableComparisonShare(comparisonId, user.id)
    // Build the absolute share URL using the request's own origin so it works
    // in both local dev and production without hardcoding NEXT_PUBLIC_SITE_URL here
    const origin = new URL(request.url).origin

    return NextResponse.json({
      shareToken: token,
      shareUrl: `${origin}/shared/compare/${token}`,
    })
  } catch (err) {
    console.error('[/api/compare/share POST]', err)
    return NextResponse.json({ error: 'Failed to enable sharing' }, { status: 500 })
  }
}

/**
 * Revokes the share token for a comparison, making its public URL inaccessible.
 * The comparison row itself is preserved.
 *
 * @param request - JSON body with comparisonId
 * @returns 200 { success: true }
 */
/**
 * What it does: This asynchronous function handles HTTP DELETE requests to the `/api/compare/share` endpoint. Its purpose is to revoke public sharing for a specified saved comparison.
 * Why it is used: It allows users to disable a previously generated share URL, effectively making the comparison private again and inaccessible to anyone who previously had the link. The underlying comparison data remains untouched.
 * Important implementation details:
 * 1.  **Authentication**: Similar to the POST handler, it authenticates the user using `getCurrentUser()`. Requests from unauthenticated users are rejected with a 401 Unauthorized response.
 * 2.  **Input Validation**: It expects a `comparisonId` in the request body. A 400 Bad Request is returned if this ID is missing.
 * 3.  **Database Interaction**: It calls `revokeComparisonShare()` from the database utility, which invalidates the share token associated with the comparison and user, rendering the public URL unusable.
 * 4.  **Error Handling**: It includes a `try-catch` block to log server errors and send a 500 Internal Server Error response if the operation fails.
 */
export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { comparisonId } = await request.json()
    if (!comparisonId) {
      return NextResponse.json({ error: 'Missing comparisonId' }, { status: 400 })
    }

    await revokeComparisonShare(comparisonId, user.id)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[/api/compare/share DELETE]', err)
    return NextResponse.json({ error: 'Failed to revoke sharing' }, { status: 500 })
  }
}
