import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getStoryById } from '@/lib/db/stories'
import { generateStoryPDF } from '@/lib/export/storyPdf'
import { generateStoryDocx } from '@/lib/export/storyDocx'

/**
 * Controls the caching behavior of the Next.js route.
 *
 * It ensures that this API route is always executed dynamically at request time, preventing any static optimization or caching of the response. This is crucial for routes that handle user-specific data and require fresh data for each request.
 *
 * Setting `dynamic = 'force-dynamic'` explicitly tells Next.js to treat this route as a dynamic server-side function, bypassing any default caching mechanisms that might apply to `GET` requests.
 */
export const dynamic = 'force-dynamic'

/**
 * Handles GET requests to download a specific story in either PDF or DOCX format.
 *
 * This function serves as the API endpoint for users to export their stories. It performs authentication and authorization checks to ensure the user is logged in and owns the story, then generates and returns the story content as a downloadable file.
 *
 * 1.  **Authentication:** Verifies the current user is logged in using `getCurrentUser()`. Returns a 401 Unauthorized if no user is found.
 * 2.  **Authorization:** Fetches the story by `id` from `params` and checks if the retrieved story belongs to the authenticated user. Returns a 404 Not Found if the story doesn't exist or doesn't belong to the user.
 * 3.  **Format Validation:** Extracts the `format` query parameter (`?format=...`) from the request URL. It only accepts 'pdf' or 'docx', returning a 400 Bad Request for any other value.
 * 4.  **File Generation:** Based on the validated format, it calls either `generateStoryPDF()` or `generateStoryDocx()` to create the document buffer.
 * 5.  **Response:** Constructs a `Response` object with the appropriate `Content-Type` and `Content-Disposition` headers to initiate a file download in the user's browser.
 * 6.  **Error Handling:** Catches any errors during the process, logs them, and returns a 500 Internal Server Error with a descriptive message.
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

    const story = await getStoryById(params.id)
    if (!story || story.userId !== user.id) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format')

    if (format !== 'pdf' && format !== 'docx') {
      return NextResponse.json(
        { error: 'Invalid format. Use ?format=pdf or ?format=docx' },
        { status: 400 }
      )
    }

    const filename = `${story.title.replace(/\s+/g, '_')}_Story`

    if (format === 'pdf') {
      const buffer = await generateStoryPDF(story)
      return new Response(Buffer.from(buffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}.pdf"`,
        },
      })
    }

    const buffer = await generateStoryDocx(story)
    return new Response(Buffer.from(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}.docx"`,
      },
    })
  } catch (err) {
    console.error('[/api/stories/[id]/download]', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
