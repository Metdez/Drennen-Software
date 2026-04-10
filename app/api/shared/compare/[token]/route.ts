/**
 * GET /api/shared/compare/[token]
 *
 * Public endpoint for fetching a shared session comparison by its share token.
 * No authentication required — the token acts as the access credential.
 * Assembles the full SessionComparisonData payload for the public
 * /shared/compare/[token] page.
 *
 * Auth: NONE — this is a fully public route
 *
 * Route params:
 *   - token (string) — the saved_comparisons share token
 *
 * Note: uses createAdminClient() to fetch both session rows because RLS
 *   blocks unauthenticated cookie-based reads. Scoped strictly to the two
 *   session IDs stored on the comparison row — never a full table scan.
 *
 * Response (200): SessionComparisonData — both sessions with themes, analyses,
 *   tier data, student names, theme overlap, participation delta, and the
 *   saved AI comparison narrative.
 *
 * Error responses:
 *   404 — token not found or sessions missing
 *   500 — unexpected error
 *
 * DB functions: getComparisonByShareToken(), getThemesBySessionId(),
 *               getStudentNamesBySession(), getSessionAnalysis(), getTierData()
 * Helpers: computeThemeOverlap(), computeParticipationDelta() (local)
 */
import { NextResponse } from 'next/server'
import { getComparisonByShareToken } from '@/lib/db/savedComparisons'
import { getThemesBySessionId } from '@/lib/db/themes'
import { getStudentNamesBySession } from '@/lib/db/studentSubmissions'
import { getSessionAnalysis } from '@/lib/db/sessionAnalyses'
import { getTierData } from '@/lib/db/tierData'
import { createAdminClient } from '@/lib/supabase/server'
import { rowToSessionSummary } from '@/lib/utils/transforms'
import { themesOverlap } from '@/lib/parse/parseThemes'
import type { SessionComparisonData, ThemeOverlapResult, ParticipationDelta, SessionRow } from '@/types'

export const dynamic = 'force-dynamic'

/**
 * Computes the theme overlap between two sessions' theme arrays.
 * Uses fuzzy matching via `themesOverlap()` to handle minor title variations.
 * Returns shared theme pairs, themes unique to A, and themes unique to B.
 * Each theme in B is matched at most once (first match wins).
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
  return {
    shared,
    uniqueToA: themesA.filter(t => !sharedASet.has(t)),
    uniqueToB: themesB.filter((_, i) => !matchedB.has(i)),
  }
}

/**
 * Computes the student participation overlap and delta between two sessions.
 * Returns which students attended both, only A, or only B — all sorted alphabetically.
 * Also includes the total unique student count across both sessions.
 */
function computeParticipationDelta(namesA: string[], namesB: string[]): ParticipationDelta {
  const setA = new Set(namesA)
  const setB = new Set(namesB)
  return {
    bothSessions: namesA.filter(n => setB.has(n)).sort(),
    onlyA: namesA.filter(n => !setB.has(n)).sort(),
    onlyB: namesB.filter(n => !setA.has(n)).sort(),
    totalUnique: new Set([...namesA, ...namesB]).size,
  }
}

/**
 * GET /api/shared/compare/[token]
 *
 * Public endpoint that returns the full comparison payload for a saved session
 * comparison, identified by its share token. No authentication is required.
 *
 * @param _request - Not used; token comes from the route segment.
 * @param params.token - Comparison share token generated via `POST /api/compare/share`.
 * @returns `SessionComparisonData` — both sessions with themes, Gemini analyses,
 *   tier classification data, student names, computed theme overlap, participation
 *   delta, and the saved AI comparison narrative.
 * @remarks
 *   - **Auth**: Public route — no authentication required. Token acts as the
 *     access credential.
 *   - Uses `createAdminClient()` to fetch session rows because the cookie-based
 *     RLS client would block unauthenticated reads. Strictly scoped to the two
 *     session IDs stored on the comparison row — never a full table scan.
 *   - All eight supporting data sources (themes, analyses, tier data, student names
 *     for both sessions) are fetched in parallel via a single `Promise.all`.
 *   - Theme overlap and participation delta are computed locally via
 *     `computeThemeOverlap()` and `computeParticipationDelta()`.
 * @see {@link lib/db/savedComparisons.ts} — `getComparisonByShareToken()`
 * @see {@link lib/db/sessionAnalyses.ts} — `getSessionAnalysis()`
 * @see {@link lib/db/themes.ts} — `getThemesBySessionId()`
 */
export async function GET(
  _request: Request,
  { params }: { params: { token: string } }
) {
  try {
    const comparison = await getComparisonByShareToken(params.token)
    if (!comparison) {
      return NextResponse.json(
        { error: 'This comparison is no longer available' },
        { status: 404 }
      )
    }

    // Fetch both sessions via admin client (bypass RLS for public view)
    const supabase = createAdminClient()
    const [sessionARes, sessionBRes] = await Promise.all([
      supabase.from('sessions').select('*').eq('id', comparison.sessionIdA).single(),
      supabase.from('sessions').select('*').eq('id', comparison.sessionIdB).single(),
    ])

    if (sessionARes.error || sessionBRes.error) {
      return NextResponse.json({ error: 'Sessions not found' }, { status: 404 })
    }

    const [themesA, themesB, analysisA, analysisB, tierDataA, tierDataB, namesA, namesB] =
      await Promise.all([
        getThemesBySessionId(comparison.sessionIdA),
        getThemesBySessionId(comparison.sessionIdB),
        getSessionAnalysis(comparison.sessionIdA),
        getSessionAnalysis(comparison.sessionIdB),
        getTierData(comparison.sessionIdA),
        getTierData(comparison.sessionIdB),
        getStudentNamesBySession(comparison.sessionIdA),
        getStudentNamesBySession(comparison.sessionIdB),
      ])

    const result: SessionComparisonData = {
      a: {
        session: rowToSessionSummary(sessionARes.data as SessionRow),
        themes: themesA,
        analysis: analysisA,
        tierData: tierDataA,
        studentNames: namesA,
      },
      b: {
        session: rowToSessionSummary(sessionBRes.data as SessionRow),
        themes: themesB,
        analysis: analysisB,
        tierData: tierDataB,
        studentNames: namesB,
      },
      themeOverlap: computeThemeOverlap(themesA, themesB),
      participationDelta: computeParticipationDelta(namesA, namesB),
      savedComparison: comparison,
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('[/api/shared/compare/[token]]', err)
    return NextResponse.json({ error: 'Failed to load comparison' }, { status: 500 })
  }
}
