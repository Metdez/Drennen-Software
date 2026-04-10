/**
 * GET /api/speaker/[token]
 *
 * Public endpoint for fetching a speaker portal by its share token.
 * No authentication required — the token acts as the access credential.
 * Used by the /speaker/[token] public page viewed by guest speakers before
 * and after their class visit.
 *
 * Auth: NONE — this is a fully public route
 *
 * Route params:
 *   - token (string) — the speaker portal share token from speaker_portals table
 *
 * Content selection: editedContent takes precedence over content if present,
 *   allowing professors to refine the AI-generated portal before sharing.
 *
 * Response (200): selected public portal fields:
 *   { welcome, studentInterests, sampleQuestions, talkingPoints,
 *     audienceProfile, pastSpeakerInsights, postSession }
 *
 * Note: postSession is only present after the professor has captured
 *   post-session feedback via the portal feedback flow.
 *
 * Error responses:
 *   404 — token not found
 *   500 — unexpected error
 *
 * DB functions: getPortalByShareToken() in lib/db/speakerPortals.ts
 */
import { NextResponse } from 'next/server'
import { getPortalByShareToken } from '@/lib/db/speakerPortals'

export const dynamic = 'force-dynamic'

/**
 * GET /api/speaker/[token]
 *
 * Public endpoint returning the speaker portal content for a given share token.
 * This is what the guest speaker sees at `(public)/speaker/[token]`.
 *
 * @param _request - Not used; token comes from the route segment.
 * @param params.token - Speaker portal share token generated via
 *   `POST /api/sessions/[id]/portal/publish`.
 * @returns Speaker-facing portal payload: `{ welcome, studentInterests, sampleQuestions,
 *   talkingPoints, audienceProfile, pastSpeakerInsights, postSession }`.
 *   `postSession` is non-null after post-session feedback is published.
 * @remarks
 *   - **Auth**: Public route. Share token is the sole access credential.
 *   - Returns 404 for invalid or unpublished portals.
 *   - `editedContent` takes precedence over `content` if the professor edited the portal.
 *   - Speaker portals have two phases: pre-session and post-session (`postSession` field).
 * @see {@link lib/db/speakerPortals.ts} - `getPortalByShareToken()`
 */
export async function GET(
  _request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const result = await getPortalByShareToken(params.token)

    if (!result) {
      return NextResponse.json(
        { error: 'This portal is no longer available.' },
        { status: 404 }
      )
    }

    const { portal } = result
    const content = portal.editedContent ?? portal.content

    return NextResponse.json({
      welcome: content.welcome,
      studentInterests: content.studentInterests,
      sampleQuestions: content.sampleQuestions ?? null,
      talkingPoints: content.talkingPoints,
      audienceProfile: content.audienceProfile,
      pastSpeakerInsights: content.pastSpeakerInsights,
      postSession: portal.postSession,
    })
  } catch (err) {
    console.error('[/api/speaker/[token]] GET', err)
    return NextResponse.json(
      { error: 'Something went wrong.' },
      { status: 500 }
    )
  }
}
