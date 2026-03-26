import { NextResponse } from 'next/server'
import { getSessionByShareToken } from '@/lib/db/sessionShares'
import { generatePDF } from '@/lib/export/pdf'
import { generateDocx } from '@/lib/export/docx'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const session = await getSessionByShareToken(params.token)
    if (!session) {
      return NextResponse.json(
        { error: 'This session is no longer available' },
        { status: 404 }
      )
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format')

    if (format !== 'pdf' && format !== 'docx') {
      return NextResponse.json(
        { error: 'Invalid format. Use ?format=pdf or ?format=docx' },
        { status: 400 }
      )
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
    console.error('[/api/shared/[token]/download]', err)
    return NextResponse.json({ error: 'Failed to generate download' }, { status: 500 })
  }
}
