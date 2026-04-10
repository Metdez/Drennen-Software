/**
 * POST /api/compare/analysis
 *
 * Generates (or regenerates) an AI comparative analysis for two sessions owned
 * by the authenticated professor. Collects themes, Gemini analysis, tier data,
 * and student participation for both sessions, then calls the Gemini-powered
 * `runComparativeAnalysis()` agent to produce a structured narrative comparing
 * the two sessions. The result is upserted into `saved_comparisons`.
 *
 * @param request - POST request with JSON body:
 *   - `sessionIdA` (string UUID, required) — ID of the first session
 *   - `sessionIdB` (string UUID, required) — ID of the second session
 * @returns 200 `{ comparison: SavedComparison }` — the upserted comparison row
 *   including the AI-generated analysis text.
 * @remarks
 * - Auth: cookie-based Supabase session via `getCurrentUser()`. Returns 401 if
 *   no valid session is present.
 * - Ownership check: both sessions must belong to `user.id`; either missing or
 *   belonging to another user returns 404.
 * - Theme overlap and participation stats are computed in-process from the
 *   same data fetched to seed the AI prompt.
 * - Uses `upsertComparison()` so re-running replaces the previous AI result for
 *   the same session pair rather than creating duplicate rows.
 * @see {@link lib/ai/comparisonAgent.ts} runComparativeAnalysis
 * @see {@link lib/db/savedComparisons.ts} upsertComparison
 * @see {@link lib/db/sessions.ts} getSessionById
 */
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getSessionById } from '@/lib/db/sessions'
import { getThemesBySessionId } from '@/lib/db/themes'
import { getStudentNamesBySession } from '@/lib/db/studentSubmissions'
import { getSessionAnalysis } from '@/lib/db/sessionAnalyses'
import { getTierData } from '@/lib/db/tierData'
import { upsertComparison } from '@/lib/db/savedComparisons'
import { themesOverlap } from '@/lib/parse/parseThemes'
import { runComparativeAnalysis } from '@/lib/ai/comparisonAgent'

/**
 * What it does: Sets the Next.js route segment config to 'force-dynamic'.
 * Why it is used: This ensures that the API route is always executed dynamically at runtime for each request, preventing it from being cached statically.
 * Important implementation details: It's crucial for this route because it involves real-time database lookups, user authentication, and calls to external AI services, all of which depend on fresh data and user-specific context. Caching would lead to stale or incorrect responses.
 */
export const dynamic = 'force-dynamic'

/**
 * What it does: Handles POST requests to the /api/compare/analysis endpoint to perform a comparative analysis between two user sessions.
 * Why it is used: This endpoint provides the core functionality for users to generate an AI-powered comparison report highlighting similarities and differences between two of their recorded teaching sessions.
 * Important implementation details:
 * 1. Authentication: It first authenticates the user using `getCurrentUser()` and returns a 401 Unauthorized if no user is found.
 * 2. Input Validation: It expects `sessionIdA` and `sessionIdB` in the request body and validates their presence.
 * 3. Session Ownership Verification: It fetches both sessions concurrently using `getSessionById()` and rigorously verifies that the authenticated user owns both sessions. A 404 Not Found is returned to avoid leaking session existence if ownership fails.
 * 4. Parallel Data Fetching: All necessary data for the AI agent (themes, session analyses, tier data, student names) for both sessions are fetched concurrently using `Promise.all` to optimize performance.
 * 5. Data Pre-processing: It calculates:
 *    - Shared themes: Identifies themes that appear in both sessions using `themesOverlap` for fuzzy matching.
 *    - Unique themes: Determines themes present in only one session.
 *    - Student participation overlap: Calculates the number of students common to both sessions, and those unique to each.
 * 6. AI Agent Invocation: It calls the `runComparativeAnalysis` AI agent with all collected and pre-processed data. This is a blocking call to ensure the comparison result is ready before responding.
 * 7. Result Storage: The AI-generated comparison is stored (or updated if it already exists) in the database using `upsertComparison`.
 * 8. Error Handling: Includes a try-catch block to log errors and return appropriate 500 server error responses.
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { sessionIdA, sessionIdB } = await request.json()
    if (!sessionIdA || !sessionIdB) {
      return NextResponse.json({ error: 'Missing session IDs' }, { status: 400 })
    }

    // Fetch both sessions concurrently, then verify ownership of each
    const [sessionA, sessionB] = await Promise.all([
      getSessionById(sessionIdA),
      getSessionById(sessionIdB),
    ])
    // Return 404 (not 403) to avoid leaking the existence of sessions owned by others
    if (!sessionA || sessionA.userId !== user.id) {
      return NextResponse.json({ error: 'Session A not found' }, { status: 404 })
    }
    if (!sessionB || sessionB.userId !== user.id) {
      return NextResponse.json({ error: 'Session B not found' }, { status: 404 })
    }

    // Fetch all data needed by the AI agent in a single parallel round-trip
    const [
      themesA, themesB,
      analysisA, analysisB,
      tierDataA, tierDataB,
      namesA, namesB,
    ] = await Promise.all([
      getThemesBySessionId(sessionIdA),
      getThemesBySessionId(sessionIdB),
      getSessionAnalysis(sessionIdA),
      getSessionAnalysis(sessionIdB),
      getTierData(sessionIdA),
      getTierData(sessionIdB),
      getStudentNamesBySession(sessionIdA),
      getStudentNamesBySession(sessionIdB),
    ])

    // Compute which themes appear in both sessions (fuzzy match) so the AI
    // agent can reference them explicitly in its narrative
    const shared: Array<{ themeA: string; themeB: string }> = []
    const matchedB = new Set<number>()
    for (const a of themesA) {
      for (let j = 0; j < themesB.length; j++) {
        if (!matchedB.has(j) && themesOverlap(a, themesB[j])) {
          shared.push({ themeA: a, themeB: themesB[j] })
          matchedB.add(j)
          break
        }
      }
    }
    const sharedASet = new Set(shared.map(s => s.themeA))
    const uniqueThemesA = themesA.filter(t => !sharedASet.has(t))
    const uniqueThemesB = themesB.filter((_, i) => !matchedB.has(i))

    // Compute student participation overlap across the two sessions
    const setA = new Set(namesA)
    const setB = new Set(namesB)
    const overlap = namesA.filter(n => setB.has(n)).length
    const onlyA = namesA.filter(n => !setB.has(n)).length
    const onlyB = namesB.filter(n => !setA.has(n)).length

    // Run the Gemini-powered comparative analysis. This is the only blocking AI
    // call in this handler — no fire-and-forget pattern here.
    const aiResult = await runComparativeAnalysis({
      speakerA: sessionA.speakerName,
      speakerB: sessionB.speakerName,
      dateA: sessionA.createdAt,
      dateB: sessionB.createdAt,
      submissionCountA: namesA.length,
      submissionCountB: namesB.length,
      themesA,
      themesB,
      sharedThemes: shared,
      uniqueThemesA,
      uniqueThemesB,
      sentimentA: analysisA?.sentiment ?? null,
      sentimentB: analysisB?.sentiment ?? null,
      tierDataA,
      tierDataB,
      participationOverlap: overlap,
      participationOnlyA: onlyA,
      participationOnlyB: onlyB,
      totalStudents: new Set([...namesA, ...namesB]).size,
    })

    // Upsert so re-running replaces the previous result for this session pair
    const comparison = await upsertComparison(user.id, sessionIdA, sessionIdB, aiResult)

    return NextResponse.json({ comparison })
  } catch (err) {
    console.error('[/api/compare/analysis POST]', err)
    const message = err instanceof Error ? err.message : 'Failed to generate comparative analysis'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
