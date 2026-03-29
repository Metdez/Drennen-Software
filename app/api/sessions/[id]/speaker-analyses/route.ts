import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getSessionById } from '@/lib/db/sessions'
import { buildSubmissionsText } from '@/lib/parse/builder'
import { downloadTempZip, deleteTempZip } from '@/lib/supabase/storage.server'
import {
  insertStudentSpeakerAnalysisSubmissions,
  deleteStudentSpeakerAnalysisSubmissions,
  hasStudentSpeakerAnalyses,
  getStudentSpeakerAnalysis,
  upsertStudentSpeakerAnalysis,
} from '@/lib/db/studentSpeakerAnalyses'
import { runSpeakerAnalysisEvaluation } from '@/lib/ai/speakerAnalysisEvaluation'
import { generateClassInsights } from '@/lib/ai/classInsights'
import { generateSpeakerRecommendations } from '@/lib/ai/speakerRecommendations'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: sessionId } = await params
    const session = await getSessionById(sessionId)
    if (!session || session.userId !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const [has, analysisResult] = await Promise.all([
      hasStudentSpeakerAnalyses(sessionId),
      getStudentSpeakerAnalysis(sessionId),
    ])

    return NextResponse.json({
      hasAnalyses: has,
      analysis: analysisResult?.analysis ?? null,
      fileCount: analysisResult?.fileCount ?? 0,
    })
  } catch (err) {
    console.error('[speaker-analyses GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let storagePath: string | null = null
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: sessionId } = await params
    const session = await getSessionById(sessionId)
    if (!session || session.userId !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const body = await request.json() as { storagePath?: string }
    storagePath = body.storagePath ?? null
    if (!storagePath) {
      return NextResponse.json({ error: 'Missing storagePath' }, { status: 400 })
    }

    const zipBuffer = await downloadTempZip(storagePath)
    const { fileCount, submissions } = await buildSubmissionsText(zipBuffer)

    if (fileCount === 0) {
      return NextResponse.json({ error: 'No readable student files found in ZIP' }, { status: 400 })
    }

    // Delete existing speaker analysis submissions if re-uploading
    const alreadyExists = await hasStudentSpeakerAnalyses(sessionId)
    if (alreadyExists) {
      await deleteStudentSpeakerAnalysisSubmissions(sessionId)
    }

    await insertStudentSpeakerAnalysisSubmissions(sessionId, submissions)

    const studentNames = [...new Set(submissions.map(s => s.studentName))].sort()

    // Fire-and-forget: run AI analysis and store results
    const submissionsForAI = submissions.map(s => ({
      student_name: s.studentName,
      submission_text: s.text,
    }))

    runSpeakerAnalysisEvaluation(session.speakerName, submissionsForAI)
      .then(analysis => upsertStudentSpeakerAnalysis(sessionId, user.id, analysis, fileCount))
      .catch(e => console.error('[speaker-analyses] AI analysis failed (non-fatal):', e))

    // Fire-and-forget: refresh class insights with new speaker analysis data
    generateClassInsights(user.id, session.semesterId ?? undefined).catch(e =>
      console.error('[speaker-analyses] generateClassInsights failed (non-fatal):', e)
    )

    // Fire-and-forget: refresh speaker recommendations
    generateSpeakerRecommendations(user.id, session.semesterId ?? undefined).catch(e =>
      console.error('[speaker-analyses] generateSpeakerRecommendations failed (non-fatal):', e)
    )

    return NextResponse.json({ fileCount, studentNames })
  } catch (err) {
    console.error('[speaker-analyses POST]', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  } finally {
    if (storagePath) await deleteTempZip(storagePath).catch(() => {})
  }
}
