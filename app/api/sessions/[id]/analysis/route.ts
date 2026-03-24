// app/api/sessions/[id]/analysis/route.ts
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getSessionById } from '@/lib/db/sessions'
import { getSubmissionsBySession } from '@/lib/db/student_submissions'
import { runSessionAnalysis } from '@/lib/ai/analysisAgent'

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
    if (!session || session.userId !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const submissions = await getSubmissionsBySession(params.id)

    if (submissions.length === 0) {
      return NextResponse.json({ empty: true })
    }

    const analysis = await runSessionAnalysis(
      session.speakerName,
      session.output,
      submissions
    )

    return NextResponse.json(analysis)
  } catch (err) {
    console.error('[/api/sessions/[id]/analysis]', err)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
