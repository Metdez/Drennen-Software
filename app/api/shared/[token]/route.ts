import { NextResponse } from 'next/server'
import { getSessionByShareToken } from '@/lib/db/sessionShares'

export const dynamic = 'force-dynamic'

/**
 * GET /api/shared/[token]
 *
 * Public endpoint that returns a shared session's content by share token.
 * Used by the `(public)/shared/[token]` page to render a read-only view of a
 * professor's generated interview sheet for a guest speaker visit.
 *
 * @param _request - Not used; token comes from the route segment.
 * @param params.token - Session share token generated via `POST /api/sessions/[id]/share`.
 * @returns `{ session: { speakerName, createdAt, fileCount, output } }` — a minimal
 *   subset of the session record. `userId` and other professor-private fields are
 *   intentionally excluded.
 * @remarks
 *   - **Auth**: Public route — no authentication required. Token acts as the
 *     access credential.
 *   - Returns 404 with a user-friendly message when the token is invalid or the
 *     share has been revoked.
 *   - The response deliberately strips `userId` so the professor's identity is not
 *     leaked to viewers who only have the share link.
 * @see {@link lib/db/sessionShares.ts} — `getSessionByShareToken()`
 */
export async function GET(
  _request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const session = await getSessionByShareToken(params.token)
    if (!session) {
      return NextResponse.json(
        { error: 'This session is no longer available' },
        { status: 404 }
      )
    }

    // Strip userId for privacy — only return what viewers need
    return NextResponse.json({
      session: {
        speakerName: session.speakerName,
        createdAt: session.createdAt,
        fileCount: session.fileCount,
        output: session.output,
      },
    })
  } catch (err) {
    console.error('[/api/shared/[token]]', err)
    return NextResponse.json({ error: 'Failed to load session' }, { status: 500 })
  }
}
