import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getSessionById } from '@/lib/db/sessions'
import { getSessionAnalysis } from '@/lib/db/sessionAnalyses'
import { hasStudentDebriefs, getStudentDebriefAnalysis } from '@/lib/db/studentDebriefs'
import { hasStudentSpeakerAnalyses, getStudentSpeakerAnalysis } from '@/lib/db/studentSpeakerAnalyses'
import { getSessionSynthesis, upsertSessionSynthesis } from '@/lib/db/sessionSyntheses'
import { runSessionSynthesis } from '@/lib/ai/synthesisAgent'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: sessionId } = await params
    const session = await getSessionById(sessionId)
    if (!session || session.userId !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Determine which data types currently exist
    const [hasDebriefs, hasSpeakerAnalyses] = await Promise.all([
      hasStudentDebriefs(sessionId),
      hasStudentSpeakerAnalyses(sessionId),
    ])

    const currentTypes: string[] = ['questions']
    if (hasDebriefs) currentTypes.push('debriefs')
    if (hasSpeakerAnalyses) currentTypes.push('speaker_analyses')

    const dataCompleteness = {
      has_questions: true,
      has_debriefs: hasDebriefs,
      has_speaker_analyses: hasSpeakerAnalyses,
    }

    // Require at least 2 data types
    if (currentTypes.length < 2) {
      return NextResponse.json({
        insufficient: true,
        available: currentTypes,
        dataCompleteness,
      })
    }

    // Check cached synthesis
    const cached = await getSessionSynthesis(sessionId)
    if (cached) {
      // Staleness check: are there new data types not in the cached version?
      const cachedSet = new Set(cached.dataTypes)
      const isStale = currentTypes.some(t => !cachedSet.has(t))
      if (!isStale) {
        return NextResponse.json({
          synthesis: cached.synthesis,
          dataCompleteness,
        })
      }
    }

    // Gather prerequisite analyses
    const [questionsAnalysis, debriefResult, speakerResult] = await Promise.all([
      getSessionAnalysis(sessionId),
      hasDebriefs ? getStudentDebriefAnalysis(sessionId) : Promise.resolve(null),
      hasSpeakerAnalyses ? getStudentSpeakerAnalysis(sessionId) : Promise.resolve(null),
    ])

    // Check if individual analyses are ready (they may still be processing)
    const ready: string[] = ['questions'] // questions analysis is optional for synthesis
    if (!hasDebriefs || debriefResult) ready.push('debriefs')
    if (!hasSpeakerAnalyses || speakerResult) ready.push('speaker_analyses')

    const pendingTypes = currentTypes.filter(t => !ready.includes(t))
    if (pendingTypes.length > 0) {
      return NextResponse.json({
        pending: true,
        available: currentTypes,
        ready,
        pendingTypes,
        dataCompleteness,
      })
    }

    // Generate synthesis
    const synthesis = await runSessionSynthesis({
      speakerName: session.speakerName,
      sessionOutput: session.output,
      questionsAnalysis,
      debriefAnalysis: debriefResult?.analysis ?? null,
      speakerAnalysis: speakerResult?.analysis ?? null,
    })

    // Persist to DB (non-fatal if it fails)
    await upsertSessionSynthesis(sessionId, user.id, synthesis, currentTypes).catch(e =>
      console.error('[/api/sessions/[id]/synthesis] upsert failed (non-fatal):', e)
    )

    return NextResponse.json({
      synthesis,
      dataCompleteness,
    })
  } catch (err) {
    console.error('[/api/sessions/[id]/synthesis]', err)
    let message = err instanceof Error ? err.message : String(err)
    try {
      const parsed = JSON.parse(message)
      if (parsed?.error?.message) message = parsed.error.message
    } catch { /* not JSON */ }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
