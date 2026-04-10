/**
 * @file app/api/sessions/[id]/brief/download/route.ts
 *
 * Route: GET /api/sessions/[id]/brief/download
 *
 * Streams the speaker brief as a PDF file download. Uses the professor's
 * edited version of the brief if one exists; otherwise falls back to the
 * original AI-generated content.
 *
 * The brief must have been generated first via POST /api/sessions/[id]/brief.
 * If it hasn't, a 404 is returned with an actionable message.
 *
 * Auth:        Required — 401 if not logged in; 404 if session belongs to
 *              another user.
 * DB calls:    getCurrentUser(), getSessionById(), getSpeakerBrief()
 * AI calls:    None (generateBriefPDF is a local renderer, not an AI call)
 * Export lib:  generateBriefPDF() from lib/export/briefPdf.ts
 *              (uses @react-pdf/renderer under the hood)
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getSessionById } from '@/lib/db/sessions'
import { getSpeakerBrief } from '@/lib/db/speakerBriefs'
import { generateBriefPDF } from '@/lib/export/briefPdf'

// force-dynamic ensures auth cookies are read fresh on every request
export const dynamic = 'force-dynamic'

/**
 * GET /api/sessions/[id]/brief/download
 *
 * @param _request  - Unused; session ID comes from the route segment
 * @param params.id - Session UUID from the URL path segment
 * @returns A binary PDF `Response` with `Content-Disposition: attachment`
 *          so the browser triggers a file download, or `{ error: string }`
 *          JSON with status 401 / 404 / 500 on failure.
 *
 * Content priority: `brief.editedContent` (professor's saved edits) takes
 * precedence over `brief.content` (original AI output). This mirrors the
 * /preview/brief page which also shows the edited version when present.
 *
 * Filename format: `{SpeakerName}_Speaker_Brief.pdf`
 * (spaces in the speaker name are replaced with underscores)
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Auth check — returns null if cookie is absent or expired
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
      // Brief must be generated before it can be downloaded
      return NextResponse.json({ error: 'Speaker brief not found. Generate one first.' }, { status: 404 })
    }

    // Prefer the professor's edited content over the raw AI output so that
    // any corrections made in the /preview/brief editor are reflected in the PDF
    const activeContent = brief.editedContent ?? brief.content
    const buffer = await generateBriefPDF(activeContent)
    const filename = `${session.speakerName.replace(/\s+/g, '_')}_Speaker_Brief`

    // Return as a streaming binary response rather than JSON so the browser
    // triggers a native file download dialog
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
