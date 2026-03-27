import { NextResponse } from 'next/server'
import { getComparisonByShareToken } from '@/lib/db/comparisons'
import { getThemesBySessionId } from '@/lib/db/themes'
import { getStudentNamesBySession } from '@/lib/db/student_submissions'
import { getSessionAnalysis } from '@/lib/db/sessionAnalyses'
import { getTierData } from '@/lib/db/tierData'
import { createAdminClient } from '@/lib/supabase/server'
import { rowToSessionSummary } from '@/lib/utils/transforms'
import { themesOverlap } from '@/lib/parse/parseThemes'
import type { SessionComparisonData, ThemeOverlapResult, ParticipationDelta, SessionRow } from '@/types'

export const dynamic = 'force-dynamic'

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
