import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getSessionById } from '@/lib/db/sessions'
import { generatePDF } from '@/lib/export/pdf'
import { generateDocx } from '@/lib/export/docx'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const session = await getSessionById(params.id)
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (session.userId !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format')

    if (format !== 'pdf' && format !== 'docx') {
      return NextResponse.json({ error: 'Invalid format. Use ?format=pdf or ?format=docx' }, { status: 400 })
    }

    const filename = `${session.speakerName.replace(/\s+/g, '_')}_Questions`

    if (format === 'pdf') {
      const buffer = await generatePDF(session.output, session.speakerName)
      return new Response(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}.pdf"`,
        },
      })
    }

    const buffer = await generateDocx(session.output, session.speakerName)
    return new Response(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}.docx"`,
      },
    })
  } catch (err) {
    console.error('[/api/sessions/[id]/download]', err)
    return NextResponse.json({ error: 'Failed to generate download' }, { status: 500 })
  }
}
