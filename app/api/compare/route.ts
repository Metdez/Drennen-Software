/**
 * GET /api/compare
 *
 * Builds a full side-by-side comparison payload for two sessions owned by the
 * authenticated professor. Fetches both sessions plus all supporting data
 * (themes, analysis, tier data, student names, any saved comparison) in
 * parallel, then computes theme overlap and participation delta in-process
 * before returning the assembled `SessionComparisonData` object.
 *
 * @param request - GET request with required query params:
 *   - `a` (string UUID) — ID of the first session
 *   - `b` (string UUID) — ID of the second session
 * @returns 200 `SessionComparisonData` — both session summaries with their
 *   associated themes, analysis, tier data, student names, computed
 *   `themeOverlap`, computed `participationDelta`, and any `savedComparison`.
 * @remarks
 * - Auth: cookie-based Supabase session via `getCurrentUser()`. Returns 401 if
 *   no valid session is present.
 * - Ownership check: both sessions must belong to `user.id`; either missing or
 *   belonging to another user returns 404.
 * - Theme overlap uses fuzzy matching via `themesOverlap()` from
 *   `lib/parse/parseThemes.ts` — not strict string equality.
 * - Does NOT generate AI analysis; it reads cached `session_analyses` rows.
 *   To generate a comparative AI narrative, call `POST /api/compare/analysis`.
 * @see {@link lib/db/sessions.ts} getSessionById
 * @see {@link lib/db/themes.ts} getThemesBySessionId
 * @see {@link lib/db/sessionAnalyses.ts} getSessionAnalysis
 * @see {@link lib/db/tierData.ts} getTierData
 * @see {@link lib/db/savedComparisons.ts} getComparison
 * @see {@link lib/parse/parseThemes.ts} themesOverlap
 */
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getSessionById } from '@/lib/db/sessions'
import { getThemesBySessionId } from '@/lib/db/themes'
import { getStudentNamesBySession } from '@/lib/db/studentSubmissions'
import { getSessionAnalysis } from '@/lib/db/sessionAnalyses'
import { getTierData } from '@/lib/db/tierData'
import { getComparison } from '@/lib/db/savedComparisons'
import { themesOverlap } from '@/lib/parse/parseThemes'
import type { SessionComparisonData, SessionSummary, Session, ThemeOverlapResult, ParticipationDelta } from '@/types'

/**
 * Controls the caching behavior for this Next.js API route.
 *
 * It is used to force the route to be dynamically rendered on each request, preventing it from being statically cached.
 *
 * Important implementation details: Set to 'force-dynamic' to ensure that comparison data is always fresh and reflects the latest database state. This is crucial because comparison data is highly user-specific and sensitive to real-time changes in session details, themes, or student participation.
 */
export const dynamic = 'force-dynamic'

/**
 * Computes which themes are shared between two sessions and which are unique to each.
 * Uses themesOverlap() for fuzzy matching — not strict string equality.
 * Each theme in B is matched at most once (tracked via matchedB Set).
 *
 * @param themesA - theme title strings for session A
 * @param themesB - theme title strings for session B
 * @returns { shared, uniqueToA, uniqueToB }
 */
/**
 * Computes which themes are shared between two sessions and identifies themes unique to each session.
 *
 * It is used to provide a detailed breakdown of thematic similarities and differences between two sessions, which is a core component of the session comparison feature.
 *
 * Important implementation details: Utilizes the `themesOverlap()` utility for fuzzy string matching, allowing for slight variations in theme titles. Each theme from session B is matched at most once to ensure accurate representation. It uses `Set` objects (`matchedB`, `sharedASet`) for efficient tracking of matched items and filtering unique themes.
 */
function computeThemeOverlap(themesA: string[], themesB: string[]): ThemeOverlapResult {
  const shared: ThemeOverlapResult['shared'] = []
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
  const uniqueToA = themesA.filter(t => !sharedASet.has(t))
  const uniqueToB = themesB.filter((_, i) => !matchedB.has(i))

  return { shared, uniqueToA, uniqueToB }
}

/**
 * Converts a full Session domain object into the lighter SessionSummary shape.
 * debriefStatus and debriefRating are not needed for comparison views.
 *
 * @param s - full Session object
 * @returns SessionSummary with null debrief fields
 */
/**
 * Converts a full `Session` domain object into a lighter `SessionSummary` shape.
 *
 * It is used to streamline the data payload for comparison views, including only the essential session attributes needed for display. This reduces the amount of data transferred and ensures that only relevant information is exposed in the comparison context.
 *
 * Important implementation details: Explicitly sets `debriefStatus` and `debriefRating` to `null` in the `SessionSummary` as these fields are not required for the comparison UI and might contain sensitive information irrelevant to this view.
 */
function sessionToSummary(s: Session): SessionSummary {
  return {
    id: s.id,
    speakerName: s.speakerName,
    createdAt: s.createdAt,
    fileCount: s.fileCount,
    semesterId: s.semesterId,
    debriefStatus: null,
    debriefRating: null,
  }
}

/**
 * Computes participation overlap and exclusivity between two sessions.
 * Identifies students who appeared in both, only in A, or only in B.
 *
 * @param namesA - student name strings for session A
 * @param namesB - student name strings for session B
 * @returns ParticipationDelta with bothSessions[], onlyA[], onlyB[], totalUnique
 */
/**
 * Calculates the overlap and exclusivity of student participation between two sessions.
 *
 * It is used to provide insights into student attendance patterns, showing which students participated in both sessions, only in session A, or only in session B. This helps users understand the common and distinct student bodies across compared sessions.
 *
 * Important implementation details: Employs `Set` objects (`setA`, `setB`) for efficient computation of intersections and differences between student name lists. The resulting lists (`bothSessions`, `onlyA`, `onlyB`) are sorted alphabetically for consistent presentation. It also calculates `totalUnique` to indicate the total number of distinct students across both sessions.
 */
function computeParticipationDelta(namesA: string[], namesB: string[]): ParticipationDelta {
  const setA = new Set(namesA)
  const setB = new Set(namesB)
  const bothSessions = namesA.filter(n => setB.has(n)).sort()
  const onlyA = namesA.filter(n => !setB.has(n)).sort()
  const onlyB = namesB.filter(n => !setA.has(n)).sort()
  const totalUnique = new Set([...namesA, ...namesB]).size
  return { bothSessions, onlyA, onlyB, totalUnique }
}

/**
 * Handles HTTP GET requests to retrieve comprehensive comparison data for two specified sessions.
 *
 * This is the primary API endpoint for the client-side application to fetch all necessary information required to render a detailed session comparison view.
 *
 * Important implementation details: The route requires user authentication via `getCurrentUser()`. It expects two session IDs ('a' and 'b') as URL query parameters. Critical security checks are performed to verify both sessions exist and are owned by the authenticated user, returning a 404 (not 403) for non-owned sessions to prevent information leakage. Multiple database queries (for sessions, themes, analyses, tier data, student names, and saved comparisons) are executed concurrently using `Promise.all` for efficiency. The collected data is then processed by utility functions (`computeThemeOverlap`, `computeParticipationDelta`, `sessionToSummary`) and aggregated into a `SessionComparisonData` object before being returned as a JSON response. Includes robust error handling for various failure scenarios.
 */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    // Both IDs are required — the comparison is meaningless without two sessions
    const idA = searchParams.get('a')
    const idB = searchParams.get('b')
    if (!idA || !idB) {
      return NextResponse.json({ error: 'Missing session IDs (a and b)' }, { status: 400 })
    }

    // Fetch both sessions concurrently, then verify ownership of each
    const [sessionA, sessionB] = await Promise.all([
      getSessionById(idA),
      getSessionById(idB),
    ])
    // Return 404 (not 403) to avoid leaking the existence of sessions owned by others
    if (!sessionA || sessionA.userId !== user.id) {
      return NextResponse.json({ error: 'Session A not found' }, { status: 404 })
    }
    if (!sessionB || sessionB.userId !== user.id) {
      return NextResponse.json({ error: 'Session B not found' }, { status: 404 })
    }

    // Fetch all supporting data for both sessions in a single parallel round-trip
    const [
      themesA, themesB,
      analysisA, analysisB,
      tierDataA, tierDataB,
      namesA, namesB,
      savedComparison,
    ] = await Promise.all([
      getThemesBySessionId(idA),
      getThemesBySessionId(idB),
      getSessionAnalysis(idA),
      getSessionAnalysis(idB),
      getTierData(idA),
      getTierData(idB),
      getStudentNamesBySession(idA),
      getStudentNamesBySession(idB),
      getComparison(user.id, idA, idB),
    ])

    const themeOverlap = computeThemeOverlap(themesA, themesB)
    const participationDelta = computeParticipationDelta(namesA, namesB)

    const result: SessionComparisonData = {
      a: {
        session: sessionToSummary(sessionA),
        themes: themesA,
        analysis: analysisA,
        tierData: tierDataA,
        studentNames: namesA,
      },
      b: {
        session: sessionToSummary(sessionB),
        themes: themesB,
        analysis: analysisB,
        tierData: tierDataB,
        studentNames: namesB,
      },
      themeOverlap,
      participationDelta,
      savedComparison,
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('[/api/compare GET]', err)
    return NextResponse.json({ error: 'Failed to build comparison' }, { status: 500 })
  }
}
