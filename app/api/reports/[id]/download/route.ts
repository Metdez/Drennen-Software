import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getReportById } from '@/lib/db/reports'
import { generateReportPDF } from '@/lib/export/reportPdf'
import { generateReportDocx } from '@/lib/export/reportDocx'

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

    const report = await getReportById(params.id)
    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    if (report.userId !== user.id) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format')

    if (format !== 'pdf' && format !== 'docx') {
      return NextResponse.json(
        { error: 'Invalid format. Use ?format=pdf or ?format=docx' },
        { status: 400 }
      )
    }

    const filename = `${report.title.replace(/\s+/g, '_')}_Report`

    if (format === 'pdf') {
      const buffer = await generateReportPDF(report)
      return new Response(Buffer.from(buffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}.pdf"`,
        },
      })
    }

    const buffer = await generateReportDocx(report)
    return new Response(Buffer.from(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}.docx"`,
      },
    })
  } catch (err) {
    console.error('[/api/reports/[id]/download]', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
