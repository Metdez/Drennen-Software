import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getSessionById } from '@/lib/db/sessions'
import { buildSubmissionsText } from '@/lib/parse/builder'
import { downloadTempZip, deleteTempZip } from '@/lib/supabase/storage.server'
import {
  insertStudentDebriefSubmissions,
  deleteStudentDebriefSubmissions,
  hasStudentDebriefs,
  getStudentDebriefAnalysis,
  upsertStudentDebriefAnalysis,
} from '@/lib/db/studentDebriefs'
import { runDebriefReflectionAnalysis } from '@/lib/ai/debriefReflectionAnalysis'
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
      hasStudentDebriefs(sessionId),
      getStudentDebriefAnalysis(sessionId),
    ])

    return NextResponse.json({
      hasDebriefs: has,
      analysis: analysisResult?.analysis ?? null,
      fileCount: analysisResult?.fileCount ?? 0,
    })
  } catch (err) {
    console.error('[student-debriefs GET]', err)
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

    // Delete existing debrief submissions if re-uploading
    const alreadyExists = await hasStudentDebriefs(sessionId)
    if (alreadyExists) {
      await deleteStudentDebriefSubmissions(sessionId)
    }

    await insertStudentDebriefSubmissions(sessionId, submissions)

    const studentNames = [...new Set(submissions.map(s => s.studentName))].sort()

    // Fire-and-forget: run AI analysis and store results
    const submissionsForAI = submissions.map(s => ({
      student_name: s.studentName,
      submission_text: s.text,
    }))

    runDebriefReflectionAnalysis(session.speakerName, submissionsForAI)
      .then(analysis => upsertStudentDebriefAnalysis(sessionId, user.id, analysis, fileCount))
      .catch(e => console.error('[student-debriefs] AI analysis failed (non-fatal):', e))

    // Fire-and-forget: refresh class insights with new debrief data
    generateClassInsights(user.id, session.semesterId ?? undefined).catch(e =>
      console.error('[student-debriefs] generateClassInsights failed (non-fatal):', e)
    )

    // Fire-and-forget: refresh speaker recommendations
    generateSpeakerRecommendations(user.id, session.semesterId ?? undefined).catch(e =>
      console.error('[student-debriefs] generateSpeakerRecommendations failed (non-fatal):', e)
    )

    return NextResponse.json({ fileCount, studentNames })
  } catch (err) {
    console.error('[student-debriefs POST]', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  } finally {
    if (storagePath) await deleteTempZip(storagePath).catch(() => {})
  }
}
