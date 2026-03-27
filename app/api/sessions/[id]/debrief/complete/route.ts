import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getSessionById } from '@/lib/db/sessions'
import { getDebrief, completeDebrief } from '@/lib/db/debriefs'
import { generateDebriefSummary } from '@/lib/ai/debriefSummary'
import { generateClassInsights } from '@/lib/ai/classInsights'

export const dynamic = 'force-dynamic'

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await getSessionById(params.id)
    if (!session || session.userId !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const debrief = await getDebrief(params.id)
    if (!debrief) {
      return NextResponse.json({ error: 'No debrief found for this session' }, { status: 404 })
    }

    // Idempotent: if already complete, return existing data
    if (debrief.status === 'complete') {
      return NextResponse.json({ debrief })
    }

    // Generate AI summary
    const aiSummary = await generateDebriefSummary(session.speakerName, debrief)

    // Mark complete and store summary
    await completeDebrief(params.id, aiSummary)

    // Fire-and-forget: regenerate class insights to incorporate debrief data
    generateClassInsights(user.id).catch(e =>
      console.error('[/api/sessions/[id]/debrief/complete] generateClassInsights failed (non-fatal):', e)
    )

    return NextResponse.json({
      debrief: {
        ...debrief,
        status: 'complete',
        aiSummary,
      },
    })
  } catch (err) {
    console.error('[/api/sessions/[id]/debrief/complete POST]', err)
    return NextResponse.json({ error: 'Failed to complete debrief' }, { status: 500 })
  }
}
