import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getSessionById } from '@/lib/db/sessions'
import { getSpeakerBrief } from '@/lib/db/speakerBriefs'
import { generateBriefPDF } from '@/lib/export/briefPdf'

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

    const brief = await getSpeakerBrief(params.id)
    if (!brief) {
      return NextResponse.json({ error: 'Speaker brief not found. Generate one first.' }, { status: 404 })
    }

    const activeContent = brief.editedContent ?? brief.content
    const buffer = await generateBriefPDF(activeContent)
    const filename = `${session.speakerName.replace(/\s+/g, '_')}_Speaker_Brief`

    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}.pdf"`,
      },
    })
  } catch (err) {
    console.error('[/api/sessions/[id]/brief/download]', err)
    return NextResponse.json({ error: 'Failed to generate brief PDF' }, { status: 500 })
  }
}
