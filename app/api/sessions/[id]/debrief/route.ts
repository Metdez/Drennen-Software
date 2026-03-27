import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getSessionById } from '@/lib/db/sessions'
import { getDebrief, upsertDebrief, getStudentNamesForSession } from '@/lib/db/debriefs'

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

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await authenticateAndGetSession(params.id)
    if ('error' in auth) return auth.error

    // Reject updates to completed debriefs
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
