/**
 * GET /api/shared/[token]/download
 *
 * Public endpoint for downloading a shared session as a PDF or DOCX.
 * No authentication required — the share token acts as the access credential.
 * Used by the /shared/[token] public page's download buttons.
 *
 * Auth: NONE — this is a fully public route
 *
 * Route params:
 *   - token (string) — the session share token
 *
 * Query params:
 *   - format (required) — "pdf" or "docx"
 *
 * File naming: speaker name spaces → underscores
 *   e.g. "Jane Smith" → "Jane_Smith_Questions.pdf"
 *
 * Response: binary file download with Content-Disposition: attachment
 * Error responses:
 *   400 — missing or invalid format param
 *   404 — token not found or share revoked
 *   500 — export generation error
 *
 * Export functions: generatePDF() in lib/export/pdf.ts,
 *                   generateDocx() in lib/export/docx.ts
 */
import { NextResponse } from 'next/server'
import { getSessionByShareToken } from '@/lib/db/sessionShares'
import { generatePDF } from '@/lib/export/pdf'
import { generateDocx } from '@/lib/export/docx'

export const dynamic = 'force-dynamic'

/**
 * GET /api/shared/[token]/download
 *
 * Generates and streams a downloadable PDF or DOCX export of a shared session.
 * No authentication required — the share token acts as the access credential.
 * Used by the `/shared/[token]` public page's download buttons.
 *
 * @param request - Accepts required `?format=pdf|docx` query parameter.
 * @param params.token - Session share token.
 * @returns Binary file response with `Content-Disposition: attachment` and the
 *   appropriate `Content-Type` header. Filename is derived from the speaker name
 *   with spaces replaced by underscores (e.g. `Jane_Smith_Questions.pdf`).
 * @remarks
 *   - **Auth**: Public route — no authentication required. Token acts as the
 *     access credential.
 *   - Missing or invalid `format` returns 400.
 *   - Invalid token returns 404.
 *   - Export is generated on the fly — not cached.
 * @see {@link lib/db/sessionShares.ts} — `getSessionByShareToken()`
 * @see {@link lib/export/pdf.ts} — `generatePDF()`
 * @see {@link lib/export/docx.ts} — `generateDocx()`
 */
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

    // Sanitize speaker name for use as a filename (spaces → underscores)
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
