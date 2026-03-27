import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getSemesterById, updateSemester } from '@/lib/db/semesters'

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

    const semester = await getSemesterById(params.id)
    if (!semester) {
      return NextResponse.json({ error: 'Semester not found' }, { status: 404 })
    }

    if (semester.userId !== user.id) {
      return NextResponse.json({ error: 'Semester not found' }, { status: 404 })
    }

    return NextResponse.json({ semester })

  } catch (err) {
    console.error('[/api/semesters/[id]] GET', err)
    return NextResponse.json({ error: 'Failed to fetch semester' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership before updating
    const existing = await getSemesterById(params.id)
    if (!existing) {
      return NextResponse.json({ error: 'Semester not found' }, { status: 404 })
    }

    if (existing.userId !== user.id) {
      return NextResponse.json({ error: 'Semester not found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, startDate, endDate, status } = body

    const semester = await updateSemester(params.id, {
      name,
      startDate,
      endDate,
      status,
    })

    return NextResponse.json({ semester })

  } catch (err) {
    console.error('[/api/semesters/[id]] PATCH', err)
    return NextResponse.json({ error: 'Failed to update semester' }, { status: 500 })
  }
}
