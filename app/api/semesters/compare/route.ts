import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getSemesterComparisonData } from '@/lib/db/semesterComparison'
import { generateCohortComparison } from '@/lib/ai/semesterComparison'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { semesterIds?: string[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { semesterIds } = body
  if (!Array.isArray(semesterIds) || semesterIds.length < 2) {
    return NextResponse.json(
      { error: 'At least 2 semester IDs are required' },
      { status: 400 }
    )
  }

  try {
    const data = await getSemesterComparisonData(user.id, semesterIds)
    const aiNarrative = await generateCohortComparison(data)

    return NextResponse.json({ ...data, aiNarrative })
  } catch (err) {
    console.error('[/api/semesters/compare] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Comparison failed' },
      { status: 500 }
    )
  }
}
