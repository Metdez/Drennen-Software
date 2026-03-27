import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getStudentsWithParticipation } from '@/lib/db/student_submissions'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const semesterId = searchParams.get('semester') ?? undefined

    const students = await getStudentsWithParticipation(semesterId)

    return NextResponse.json({ students })

  } catch (err) {
    console.error('[/api/roster] GET', err)
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 })
  }
}
