import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { assignSessionsToSemester, getSemesterById } from '@/lib/db/semesters'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { sessionIds, semesterId } = body

    if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
      return NextResponse.json(
        { error: 'sessionIds must be a non-empty array' },
        { status: 400 }
      )
    }

    if (!semesterId) {
      return NextResponse.json(
        { error: 'semesterId is required' },
        { status: 400 }
      )
    }

    // Verify the semester belongs to the user
    const semester = await getSemesterById(semesterId)
    if (!semester || semester.userId !== user.id) {
      return NextResponse.json({ error: 'Semester not found' }, { status: 404 })
    }

    await assignSessionsToSemester(sessionIds, semesterId)

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('[/api/semesters/assign] POST', err)
    return NextResponse.json({ error: 'Failed to assign sessions' }, { status: 500 })
  }
}
