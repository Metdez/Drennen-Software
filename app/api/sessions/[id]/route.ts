import { NextResponse } from 'next/server'
import { getPromptById } from '@/lib/db/systemPrompts'
import { getCurrentUser } from '@/lib/db/users'
import { getSessionById } from '@/lib/db/sessions'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const session = await getSessionById(params.id)
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.userId !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const promptVersion = session.promptVersionId
      ? await getPromptById(session.promptVersionId)
      : null

    return NextResponse.json({
      session,
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
