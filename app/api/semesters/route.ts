import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import {
  getSemestersByUser,
  getUnassignedSessions,
  insertSemester,
  archiveAndCreateSemester,
} from '@/lib/db/semesters'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [semesters, unassigned] = await Promise.all([
      getSemestersByUser(user.id),
      getUnassignedSessions(user.id),
    ])

    return NextResponse.json({
      semesters,
      unassignedCount: unassigned.length,
    })

  } catch (err) {
    console.error('[/api/semesters] GET', err)
    return NextResponse.json({ error: 'Failed to fetch semesters' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, startDate, endDate, archiveCurrent } = body

    if (!name || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'name, startDate, and endDate are required' },
        { status: 400 }
      )
    }

    const input = { userId: user.id, name, startDate, endDate }

    const semester = archiveCurrent
      ? await archiveAndCreateSemester(user.id, input)
      : await insertSemester(input)

    return NextResponse.json({ semester }, { status: 201 })

  } catch (err) {
    console.error('[/api/semesters] POST', err)
    return NextResponse.json({ error: 'Failed to create semester' }, { status: 500 })
  }
}
