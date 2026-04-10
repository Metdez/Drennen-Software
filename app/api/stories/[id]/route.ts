import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getStoryById, updateStorySections } from '@/lib/db/stories'
import type { StorySection } from '@/types'

/**
 * What it does: This variable forces the Next.js API route to be dynamically rendered at request time, rather than being statically optimized or cached.
 * Why it is used: It ensures that every request to this endpoint triggers a fresh execution of the server-side logic, which is crucial for handling authentication and dynamic data that might change frequently. Without it, responses could be cached and serve stale or unauthorized content.
 * Important implementation details: Setting `export const dynamic = 'force-dynamic'` explicitly disables static generation for this route, ensuring up-to-date user authentication and story data retrieval.
 */
export const dynamic = 'force-dynamic'

/**
 * What it does: Handles HTTP GET requests to retrieve a specific story by its ID.
 * Why it is used: To allow authenticated users to fetch the details of a story they own or are authorized to view.
 * Important implementation details: 
 * - It first authenticates the current user using `getCurrentUser()`.
 * - If no user is found, it returns a 401 Unauthorized response.
 * - It then fetches the story using `getStoryById(params.id)`.
 * - It validates that the story exists and that the authenticated user is the owner of the story. If not, it returns a 404 Not Found response.
 * - If successful, it returns the story data in a JSON response.
 * - Includes comprehensive error handling, logging any caught exceptions and returning a 500 Internal Server Error.
 */
export async function GET(
  _request: Request,
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

    return NextResponse.json({ story })
  } catch (err) {
    console.error('[/api/stories/[id]] GET', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * What it does: Handles HTTP PATCH requests to update specific sections of a story identified by its ID.
 * Why it is used: To allow authenticated users to modify the content (sections) of a story they own.
 * Important implementation details: 
 * - It first authenticates the current user using `getCurrentUser()`.
 * - If no user is found, it returns a 401 Unauthorized response.
 * - It fetches the story using `getStoryById(params.id)`.
 * - It validates that the story exists and that the authenticated user is the owner of the story. If not, it returns a 404 Not Found response.
 * - It parses the request body, expecting a `sections` array.
 * - It validates that the `sections` property exists and is an array; otherwise, it returns a 400 Bad Request.
 * - It then calls `updateStorySections` to persist the changes to the database.
 * - If successful, it returns a simple `{ ok: true }` JSON response.
 * - Includes comprehensive error handling, logging any caught exceptions and returning a 500 Internal Server Error.
 */
export async function PATCH(
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

    const body = await request.json() as { sections?: StorySection[] }
    if (!Array.isArray(body.sections)) {
      return NextResponse.json({ error: 'Missing sections array' }, { status: 400 })
    }

    await updateStorySections(params.id, body.sections)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[/api/stories/[id]] PATCH', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
