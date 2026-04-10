/**
 * @file app/api/stories/generate/route.ts
 *
 * Route: POST /api/stories/generate
 *
 * Generates a narrative semester story for a specific semester using the
 * Gemini-powered story agent. Stories are a human-readable 5-section arc
 * (opening context, turning points, student voices, outcomes, reflection)
 * intended for sharing with administrators or for accreditation portfolios.
 *
 * This is distinct from semester reports (`POST /api/reports/generate`):
 *   - Reports are structured/data-driven (tables, metrics, rankings)
 *   - Stories are narrative prose — the "human story" of the semester
 *
 * Auth:         Required — 401 if not logged in; 404 if semester belongs to
 *               another user.
 * maxDuration:  60 seconds — Gemini generation for large semesters can take
 *               20–40 seconds. The client should display a loading state.
 * DB calls:     getCurrentUser(), getSemesterById()
 * AI calls:     generateSemesterStory() from lib/ai/storyAgent.ts (Gemini, blocking)
 *
 * Request body: { semesterId: string }
 * Response (200): { storyId, title, sections }
 */
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getSemesterById } from '@/lib/db/semesters'
import { generateSemesterStory } from '@/lib/ai/storyAgent'

/**
 * Configures the Next.js API route to be dynamically rendered on each request, preventing it from being statically optimized.
 *
 * This is used because the route performs operations that require up-to-date data (user authentication, AI generation) and should not be cached or pre-rendered.
 *
 * Setting this to `'force-dynamic'` ensures that the route's response is generated at request time, rather than build time or being served from a CDN cache.
 */
export const dynamic = 'force-dynamic'
/**
 * Sets the maximum execution duration for the serverless function hosting this API route.
 *
 * This is used because the story generation process involving AI can be computationally intensive and might take longer than the default serverless function timeout. This extends the timeout to 60 seconds.
 *
 * This directly maps to the `maxDuration` option in Next.js runtime configuration, helping to prevent premature termination of long-running AI tasks.
 */
export const maxDuration = 60

/**
 * Handles POST requests to the `/api/stories/generate` endpoint. It orchestrates the generation of a new story for a given semester using an AI agent.
 *
 * This endpoint provides the API surface for clients to request the creation of a story based on a specific semester, driven by AI capabilities.
 *
 * 1.  **Authentication:** It first verifies the authenticity and authorization of the current user using `getCurrentUser()`.
 * 2.  **Input Validation:** It expects a `semesterId` in the request body and validates its presence.
 * 3.  **Authorization (Semester):** It fetches the specified semester and ensures that it belongs to the authenticated user to prevent unauthorized access.
 * 4.  **AI Integration:** It calls `generateSemesterStory()` from the AI story agent to perform the actual story generation.
 * 5.  **Response:** On success, it returns the generated `storyId`, `title`, and `sections`. On failure, it returns appropriate error messages and HTTP status codes (401, 400, 404, 500).
 * 6.  **Error Handling:** Includes a comprehensive try-catch block to log errors and return a generic 500 error for unexpected issues.
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as { semesterId?: string }

    if (!body.semesterId) {
      return NextResponse.json({ error: 'Missing semesterId' }, { status: 400 })
    }

    const semester = await getSemesterById(body.semesterId)
    if (!semester || semester.userId !== user.id) {
      return NextResponse.json({ error: 'Semester not found' }, { status: 404 })
    }

    const { storyId, title, sections } = await generateSemesterStory(
      user.id,
      semester.id,
      semester.name,
    )

    return NextResponse.json({ storyId, title, sections })
  } catch (err) {
    console.error('[/api/stories/generate]', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
