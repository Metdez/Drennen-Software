import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getSessionById } from '@/lib/db/sessions'
import { getThemesBySessionId } from '@/lib/db/themes'
import { getStudentNamesBySession } from '@/lib/db/student_submissions'
import { getSessionAnalysis } from '@/lib/db/sessionAnalyses'
import { getTierData } from '@/lib/db/tierData'
import { upsertComparison } from '@/lib/db/comparisons'
import { themesOverlap } from '@/lib/parse/parseThemes'
import { runComparativeAnalysis } from '@/lib/ai/comparisonAgent'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { sessionIdA, sessionIdB } = await request.json()
    if (!sessionIdA || !sessionIdB) {
      return NextResponse.json({ error: 'Missing session IDs' }, { status: 400 })
    }

    // Fetch both sessions and verify ownership
    const [sessionA, sessionB] = await Promise.all([
      getSessionById(sessionIdA),
      getSessionById(sessionIdB),
    ])
    if (!sessionA || sessionA.userId !== user.id) {
      return NextResponse.json({ error: 'Session A not found' }, { status: 404 })
    }
    if (!sessionB || sessionB.userId !== user.id) {
      return NextResponse.json({ error: 'Session B not found' }, { status: 404 })
    }

    // Parallel fetch supporting data
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

    // Compute theme overlap
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

    // Compute participation
    const setA = new Set(namesA)
    const setB = new Set(namesB)
    const overlap = namesA.filter(n => setB.has(n)).length
    const onlyA = namesA.filter(n => !setB.has(n)).length
    const onlyB = namesB.filter(n => !setA.has(n)).length

    // Run AI comparative analysis
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

    // Save to DB
    const comparison = await upsertComparison(user.id, sessionIdA, sessionIdB, aiResult)

    return NextResponse.json({ comparison })
  } catch (err) {
    console.error('[/api/compare/analysis POST]', err)
    const message = err instanceof Error ? err.message : 'Failed to generate comparative analysis'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
