import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getSessionsByUser } from '@/lib/db/sessions'
import { getDebriefStatusesBySessionIds } from '@/lib/db/debriefs'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const semesterId = searchParams.get('semester') || undefined

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessions = await getSessionsByUser(user.id, semesterId)

    // Enrich sessions with debrief status and rating
    const debriefMap = await getDebriefStatusesBySessionIds(sessions.map(s => s.id))
    const enrichedSessions = sessions.map(s => {
      const info = debriefMap.get(s.id)
      return {
        ...s,
        debriefStatus: info?.status ?? null,
        debriefRating: info?.overallRating ?? null,
      }
    })

    return NextResponse.json({ sessions: enrichedSessions })

  } catch (err) {
    console.error('[/api/sessions]', err)
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
  }
}
