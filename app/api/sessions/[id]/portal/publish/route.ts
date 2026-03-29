import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getSessionById } from '@/lib/db/sessions'
import { getSpeakerPortal, publishSpeakerPortal, unpublishSpeakerPortal } from '@/lib/db/speakerPortals'
import { ROUTES } from '@/lib/constants'

export const dynamic = 'force-dynamic'

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
