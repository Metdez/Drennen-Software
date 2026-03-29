import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getStudentsWithParticipation } from '@/lib/db/studentSubmissions'
import { getGrowthSignalsForUser } from '@/lib/db/studentProfiles'
import { getStudentsWithFollowupFlags } from '@/lib/db/professorNotes'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const semesterId = searchParams.get('semester') ?? undefined

    const [students, growthSignals, flaggedStudents] = await Promise.all([
      getStudentsWithParticipation(semesterId),
      getGrowthSignalsForUser(user.id),
      getStudentsWithFollowupFlags(user.id),
    ])

    const enriched = students.map((s) => ({
      ...s,
      growthSignal: growthSignals.get(s.studentName) ?? undefined,
      flaggedForFollowup: flaggedStudents.has(s.studentName) || undefined,
    }))

    return NextResponse.json({ students: enriched })

  } catch (err) {
    console.error('[/api/roster] GET', err)
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 })
  }
}
