import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getSessionById } from '@/lib/db/sessions'
import { getSessionShare, enableSessionShare, revokeSessionShare } from '@/lib/db/sessionShares'

export const dynamic = 'force-dynamic'

async function authenticateAndGetSession(sessionId: string) {
  const user = await getCurrentUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  const session = await getSessionById(sessionId)
  if (!session || session.userId !== user.id) {
    return { error: NextResponse.json({ error: 'Session not found' }, { status: 404 }) }
  }

  return { user, session }
}

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
