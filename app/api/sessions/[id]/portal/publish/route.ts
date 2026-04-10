/**
 * @file app/api/sessions/[id]/portal/publish/route.ts
 *
 * Routes: POST | DELETE /api/sessions/[id]/portal/publish
 *
 * Controls public availability of a speaker portal. Publishing assigns (or
 * reuses) a unique share token and returns the public URL the professor can
 * forward to the guest speaker. Unpublishing revokes the token so the portal
 * is no longer reachable at the public /speaker/[token] URL.
 *
 * The portal must be generated first via POST /api/sessions/[id]/portal;
 * calling this endpoint before generation returns 404.
 *
 * POST   — publishes the portal (idempotent: safe to call when already published).
 * DELETE — revokes the share token; the portal record is preserved and can be
 *           re-published at any time.
 *
 * Auth:        Required on both methods — 401 if not logged in; 404 if session
 *              belongs to another user.
 * DB calls:    getCurrentUser(), getSessionById(), getSpeakerPortal(),
 *              publishSpeakerPortal(), unpublishSpeakerPortal()
 * AI calls:    None
 * Routing:     Public URL built via ROUTES.SPEAKER_PORTAL(token) from lib/constants
 *              resolves to /speaker/[token] (no auth required)
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getSessionById } from '@/lib/db/sessions'
import { getSpeakerPortal, publishSpeakerPortal, unpublishSpeakerPortal } from '@/lib/db/speakerPortals'
import { ROUTES } from '@/lib/constants'

/**
 * What it does: Sets the Next.js route segment config to 'force-dynamic'.
 * Why it is used: Ensures that this API route is always executed dynamically on each request, preventing any caching behavior that might be enabled by default.
 * Important implementation details: This is crucial for routes that handle authentication and database operations, guaranteeing fresh data and real-time authorization checks. It impacts deployment by preventing static optimization for this specific route.
 */
export const dynamic = 'force-dynamic'

/**
 * What it does: Handles HTTP POST requests to publish a speaker portal associated with a specific session ID.
 * Why it is used: Allows an authenticated user (the owner of the session) to make their speaker portal public, generating a unique, shareable URL for others to view.
 * Important implementation details: It first authenticates the user using `getCurrentUser` and authorizes them by verifying they own the session identified by `params.id`. It then checks if a portal for that session exists. If all checks pass, it calls `publishSpeakerPortal` to generate a share token and constructs the full `shareUrl` using the `ROUTES` constant. Includes robust error handling for unauthorized access, session/portal not found, and internal server errors.
 */
export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await getSessionById(params.id)
    if (!session || session.userId !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const portal = await getSpeakerPortal(params.id)
    if (!portal) {
      return NextResponse.json({ error: 'Portal not found. Generate it first.' }, { status: 404 })
    }

    const shareToken = await publishSpeakerPortal(params.id)
    const shareUrl = ROUTES.SPEAKER_PORTAL(shareToken)

    return NextResponse.json({ shareUrl, shareToken })
  } catch (err) {
    console.error('[/api/sessions/[id]/portal/publish] POST', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * What it does: Handles HTTP DELETE requests to unpublish (revoke access to) a speaker portal associated with a specific session ID.
 * Why it is used: Provides a mechanism for an authenticated user (the owner of the session) to revoke public access to their speaker portal, making the previously shared URL invalid or inactive.
 * Important implementation details: Similar to the POST handler, it first authenticates the user with `getCurrentUser` and authorizes them as the session owner using `getSessionById`. If successful, it calls `unpublishSpeakerPortal` to deactivate the public sharing. Includes error handling for unauthorized access, session not found, and internal server errors.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await getSessionById(params.id)
    if (!session || session.userId !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    await unpublishSpeakerPortal(params.id)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[/api/sessions/[id]/portal/publish] DELETE', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
