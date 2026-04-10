/**
 * @file app/api/sessions/[id]/download/route.ts
 *
 * Route: GET /api/sessions/[id]/download?format=pdf|docx
 *
 * Exports the session's AI-generated question sheet as either a PDF or DOCX
 * file download. The exported document is rendered from the session's stored
 * `output` field (the 10-section markdown from Grok) — it is not regenerated
 * on every call.
 *
 * Auth:        Required — 401 if not logged in; 404 if session belongs to
 *              another user.
 * DB calls:    getCurrentUser(), getSessionById()
 * AI calls:    None
 * Export libs: generatePDF() from lib/export/pdf.ts (@react-pdf/renderer)
 *              generateDocx() from lib/export/docx.ts (docx package)
 *
 * Query params:
 *   - `format` (required) — "pdf" or "docx"; 400 if missing or invalid
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getSessionById } from '@/lib/db/sessions'
import { generatePDF } from '@/lib/export/pdf'
import { generateDocx } from '@/lib/export/docx'

// force-dynamic ensures auth cookies are read fresh on every request
/**
 * Exports a constant string `dynamic` set to `'force-dynamic'`.
 *
 * It is used in Next.js App Router to ensure that this route handler is rendered dynamically on every request, preventing it from being cached.
 *
 * `force-dynamic` is crucial for authentication, as it ensures that the `getCurrentUser()` function always reads fresh authentication cookies, preventing stale cached responses that could lead to unauthorized access or incorrect authorization.
 */
export const dynamic = 'force-dynamic'

/**
 * GET /api/sessions/[id]/download
 *
 * @param request   - Standard Web Request; reads required `?format=pdf|docx`
 *                    query param
 * @param params.id - Session UUID from the URL path segment
 * @returns A binary file `Response` with `Content-Disposition: attachment`
 *          so the browser triggers a native file download dialog, or
 *          `{ error: string }` JSON with status 400 / 401 / 404 / 500.
 *
 * Filename format: `{SpeakerName}_Questions.pdf` or `.docx`
 * (spaces in the speaker name are replaced with underscores)
 *
 * The ownership check is done in two separate steps (existence check then
 * ownership check) rather than combined — this is intentional to keep the
 * error messages from conflating "missing session" with "wrong user".
 */
/**
 * Handles `GET` requests to `/api/sessions/[id]/download`.
 *
 * It is used to allow authenticated users to download the generated content (questions) of a specific session in either PDF or DOCX format. This enhances user experience by providing an easy way to export and store their session data.
 *
 * Important implementation details:
 * -   **Authentication and Authorization**: The request requires a valid authenticated user. The endpoint first authenticates the user using `getCurrentUser()` and then verifies that the user is the owner of the requested session via `getSessionById()`.
 * -   **Format Parameter**: It reads a required `?format=pdf|docx` query parameter from the URL to determine the desired output document type.
 * -   **Error Handling**: Returns appropriate JSON error responses with status codes 400 (invalid format), 401 (unauthorized), 404 (session not found or not owned), or 500 (internal server error).
 * -   **Security (404 for Ownership)**: For session ownership checks, if the user does not own the session, it returns a 404 status (not 403) to prevent confirming the existence of a session ID to unauthorized users, mitigating enumeration attacks.
 * -   **File Response**: Upon success, it returns a binary `Response` with `Content-Type` and `Content-Disposition: attachment` headers, which prompts the browser to trigger a native file download dialog.
 * -   **Filename Generation**: The generated filename is `{SpeakerName}_Questions.{pdf|docx}`, where spaces in the speaker's name are replaced with underscores for compatibility.
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Auth check — returns null if cookie is absent or expired
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const session = await getSessionById(params.id)
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Return 404 (not 403) to avoid confirming the session ID exists
    if (session.userId !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format')

    // Validate the format param early before doing any expensive rendering
    if (format !== 'pdf' && format !== 'docx') {
      return NextResponse.json({ error: 'Invalid format. Use ?format=pdf or ?format=docx' }, { status: 400 })
    }

    // Base filename used for both formats (extension appended per branch below)
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

    // format === 'docx'
    const buffer = await generateDocx(session.output, session.speakerName)
    return new Response(new Uint8Array(buffer), {
      headers: {
        // Full OOXML MIME type required for Word to open the file correctly
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}.docx"`,
      },
    })
  } catch (err) {
    console.error('[/api/sessions/[id]/download]', err)
    return NextResponse.json({ error: 'Failed to generate download' }, { status: 500 })
  }
}
