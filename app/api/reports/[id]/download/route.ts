import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getReportById } from '@/lib/db/reports'
import { generateReportPDF } from '@/lib/export/reportPdf'
import { generateReportDocx } from '@/lib/export/reportDocx'

/**
 * What it does: This variable sets the Next.js route segment config for this API route.
 * Why it is used: It is used to force this route to be dynamically rendered on every request.
 * Important implementation details: By setting it to 'force-dynamic', Next.js will not statically optimize or cache the output of this route, ensuring that user-specific authentication and up-to-date report generation logic runs for each download request.
 */
export const dynamic = 'force-dynamic'

/**
 * What it does: This function handles GET requests to the /api/reports/[id]/download endpoint. It is responsible for authenticating the user, authorizing access to the specified report, generating the report in either PDF or DOCX format, and returning it as a downloadable file.
 * Why it is used: It provides a secure and format-flexible API endpoint for users to download their reports, enabling data export functionality within the application.
 * Important implementation details:
 * - It first authenticates the current user using `getCurrentUser()`.
 * - It then fetches the report by ID and performs an authorization check, ensuring the report belongs to the authenticated user.
 * - It validates the `format` query parameter (must be 'pdf' or 'docx').
 * - It uses `generateReportPDF()` or `generateReportDocx()` from dedicated export libraries to create the document buffer.
 * - The response includes appropriate `Content-Type` and `Content-Disposition` headers to trigger a file download in the client's browser.
 * - Comprehensive error handling is implemented for unauthorized access, report not found, invalid format, and general server errors, returning `NextResponse.json` with appropriate status codes.
 */
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
