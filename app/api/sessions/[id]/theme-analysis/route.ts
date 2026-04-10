/**
 * @file app/api/sessions/[id]/theme-analysis/route.ts
 *
 * Route: GET /api/sessions/[id]/theme-analysis?theme=<themeName>
 *
 * Returns a deep-dive AI analysis for a specific theme cluster within a session.
 * This powers the `/preview/theme` page which lets professors explore a single
 * theme in depth (representative questions, sub-themes, provocations, etc.).
 *
 * The route requires a full session analysis (theme_clusters) to identify which
 * cluster to drill into. It reads from the `session_analyses` cache first; if
 * no cache exists it generates and persists one before running the theme drill-down.
 *
 * Theme matching is case-insensitive; if the exact theme name isn't found in
 * the clusters, the first cluster is used as a fallback.
 *
 * Auth:        Required — 401 if not logged in; 404 if session belongs to
 *              another user.
 * DB calls:    getCurrentUser(), getSessionById(), getSessionAnalysis(),
 *              insertSessionAnalysis() (when cache miss), getSubmissionsBySession()
 * AI calls:    runSessionAnalysis() → Gemini (only on cache miss, blocking)
 *              runThemeAnalysis() → Gemini (always, blocking)
 *
 * Query params:
 *   - `theme` (required) — the theme cluster name to drill into; 400 if missing
 */
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getSessionById } from '@/lib/db/sessions'
import { getSubmissionsBySession } from '@/lib/db/studentSubmissions'
import { runSessionAnalysis, runThemeAnalysis } from '@/lib/ai/analysisAgent'
import { getSessionAnalysis, insertSessionAnalysis } from '@/lib/db/sessionAnalyses'

/**
 * This variable is exported to configure the dynamic behavior of the Next.js API route.
 *
 * What it does: Forces the route to be dynamically rendered on every request.
 * Why it is used: To prevent Next.js from caching the response of this API route. This is crucial because the AI analysis can be resource-intensive, depend on real-time data, or vary based on specific request parameters, making static caching inappropriate.
 * Important implementation details: Set to 'force-dynamic' as per Next.js documentation for opting out of static rendering.
 */
export const dynamic = 'force-dynamic'

/**
 * Handles GET requests to retrieve AI-powered theme analysis for a specific session.
 *
 * What it does: Fetches a session, its associated student submissions, performs (or retrieves cached) session-level AI analysis to identify themes, and then performs a detailed AI analysis for a specific theme within that session.
 * Why it is used: To provide an API endpoint for clients to get deep, AI-generated insights into the themes present in a given educational or presentation session, optimizing by caching session analysis results.
 * Important implementation details:
 * - **Parameter Extraction**: Extracts the `theme` from URL search parameters and the `id` (session ID) from path parameters.
 * - **Authentication & Authorization**: Ensures a user is logged in (`getCurrentUser`) and that the user owns the requested session (`getSessionById` and `session.userId === user.id`).
 * - **Caching Mechanism**: Attempts to retrieve `sessionAnalysis` from the database first (`getSessionAnalysis`). If not found, it fetches student submissions (`getSubmissionsBySession`), runs a comprehensive session analysis using an AI agent (`runSessionAnalysis`), and then persists this analysis for future requests (`insertSessionAnalysis`). This significantly reduces redundant AI model calls.
 * - **Theme Selection**: Locates the specific theme cluster requested by the `theme` query parameter (case-insensitive). If the requested theme is not found, it defaults to the first theme cluster identified in the session analysis.
 * - **Detailed Theme Analysis**: Calls an AI agent (`runThemeAnalysis`) with the selected theme's details to generate a specific analysis for that theme.
 * - **Response**: Returns a JSON object containing the theme's name, its associated questions, and the detailed AI analysis.
 * - **Error Handling**: Includes robust error handling for missing parameters (400), unauthorized access (401), session not found (404), and internal server errors (500), providing informative `NextResponse` objects.
 */
/**
 * GET /api/sessions/[id]/theme-analysis
 *
 * Returns a deep-dive analysis of a single theme cluster. The analysis includes
 * representative questions, sub-theme breakdown, tensions within the theme,
 * and suggested conversation angles for the professor.
 *
 * @param request   - Standard Web Request; reads required `?theme=<name>` param
 * @param params.id - Session UUID from the URL path segment
 * @returns JSON `{ theme_name, questions, ...ThemeAnalysis }` on success, or
 *          `{ error: string }` with status 400 / 401 / 404 / 500.
 *
 * The response shape spreads the ThemeAnalysis result alongside `theme_name`
 * and `questions` so the client has everything it needs to render the
 * theme deep-dive page without a follow-up call.
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const theme = searchParams.get('theme')
    // Require the theme name — there is no sensible default; the UI always provides it
    if (!theme) {
      return NextResponse.json({ error: 'Missing theme param' }, { status: 400 })
    }

    // Auth check — returns null if cookie is absent or expired
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const session = await getSessionById(params.id)
    if (!session || session.userId !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Cache read: use the existing session analysis if available.
    // The analysis is typically already present from the fire-and-forget job
    // triggered by /api/process or /api/sessions/[id]/analysis.
    let sessionAnalysis = await getSessionAnalysis(params.id)

    if (!sessionAnalysis) {
      // Cache miss: fetch raw submissions and generate the session analysis first.
      // This is the slower path — normally the cache should be warm.
      const submissions = await getSubmissionsBySession(params.id)
      sessionAnalysis = await runSessionAnalysis(
        session.speakerName,
        session.output,
        submissions
      )
      // Persist for future requests (non-fatal — session analysis is still returned
      // to the client even if the write fails)
      await insertSessionAnalysis(params.id, user.id, sessionAnalysis).catch(e =>
        console.error('[/api/sessions/[id]/theme-analysis] insertSessionAnalysis failed (non-fatal):', e)
      )
    }

    // Locate the requested theme cluster (case-insensitive).
    // Fall back to the first cluster if the name doesn't match exactly —
    // this handles URL encoding edge cases and minor name drift.
    const cluster = sessionAnalysis.theme_clusters.find(
      (c) => c.name.toLowerCase() === theme.toLowerCase()
    ) ?? sessionAnalysis.theme_clusters[0]

    // Run the Gemini deep-dive analysis for this specific cluster
    const themeAnalysis = await runThemeAnalysis(
      cluster.name,
      session.speakerName,
      cluster.questions
    )

    return NextResponse.json({
      theme_name: cluster.name,
      questions: cluster.questions,
      // Spread the ThemeAnalysis fields alongside the cluster metadata
      ...themeAnalysis,
    })
  } catch (err) {
    console.error('[/api/sessions/[id]/theme-analysis]', err)
    return NextResponse.json({ error: 'Theme analysis failed' }, { status: 500 })
  }
}
