import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getSessionById } from '@/lib/db/sessions'
import { getThemesBySessionId } from '@/lib/db/themes'
import { getStudentNamesBySession } from '@/lib/db/student_submissions'
import { getSessionAnalysis } from '@/lib/db/sessionAnalyses'
import { getTierData } from '@/lib/db/tierData'
import { getComparison } from '@/lib/db/comparisons'
import { themesOverlap } from '@/lib/parse/parseThemes'
import type { SessionComparisonData, SessionSummary, Session, ThemeOverlapResult, ParticipationDelta } from '@/types'

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
  const uniqueToA = themesA.filter(t => !sharedASet.has(t))
  const uniqueToB = themesB.filter((_, i) => !matchedB.has(i))

  return { shared, uniqueToA, uniqueToB }
}

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

function computeParticipationDelta(namesA: string[], namesB: string[]): ParticipationDelta {
  const setA = new Set(namesA)
  const setB = new Set(namesB)
  const bothSessions = namesA.filter(n => setB.has(n)).sort()
  const onlyA = namesA.filter(n => !setB.has(n)).sort()
  const onlyB = namesB.filter(n => !setA.has(n)).sort()
  const totalUnique = new Set([...namesA, ...namesB]).size
  return { bothSessions, onlyA, onlyB, totalUnique }
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const idA = searchParams.get('a')
    const idB = searchParams.get('b')
    if (!idA || !idB) {
      return NextResponse.json({ error: 'Missing session IDs (a and b)' }, { status: 400 })
    }

    // Fetch both sessions and verify ownership
    const [sessionA, sessionB] = await Promise.all([
      getSessionById(idA),
      getSessionById(idB),
    ])
    if (!sessionA || sessionA.userId !== user.id) {
      return NextResponse.json({ error: 'Session A not found' }, { status: 404 })
    }
    if (!sessionB || sessionB.userId !== user.id) {
      return NextResponse.json({ error: 'Session B not found' }, { status: 404 })
    }

    // Parallel fetch all supporting data
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
