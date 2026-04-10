/**
 * @file app/api/sessions/[id]/speaker-analyses/route.ts
 *
 * Routes: GET | POST /api/sessions/[id]/speaker-analyses
 *
 * Manages student speaker-analysis submissions for a session. After the guest
 * speaker's visit, students submit written analyses evaluating the speaker's
 * arguments, style, and persuasiveness. This endpoint ingests those submissions
 * from a Canvas-style ZIP upload and asynchronously evaluates them with Gemini.
 *
 * GET  — returns whether submissions exist, the aggregate AI evaluation (if
 *         ready), and the file count. The UI polls this to show a loading state
 *         while the fire-and-forget AI job runs.
 * POST — accepts a `storagePath` pointing to a ZIP already uploaded to Supabase
 *         Storage (temp-uploads bucket), downloads and parses submissions, stores
 *         them, then kicks off three fire-and-forget AI jobs. Re-uploading replaces
 *         any previously stored submissions for the session.
 *
 * Auth:        Required on both methods — 401 if not logged in; 404 if session
 *              belongs to another user.
 * DB calls:    getCurrentUser(), getSessionById(),
 *              hasStudentSpeakerAnalyses(), getStudentSpeakerAnalysis(),
 *              insertStudentSpeakerAnalysisSubmissions(),
 *              deleteStudentSpeakerAnalysisSubmissions(),
 *              upsertStudentSpeakerAnalysis()
 * Storage:     downloadTempZip(), deleteTempZip() from lib/supabase/storage.server.ts
 *              (temp-uploads bucket; ZIP is deleted in the `finally` block)
 * AI calls:    runSpeakerAnalysisEvaluation() — Gemini (fire-and-forget)
 *              generateClassInsights() — Gemini (fire-and-forget)
 *              generateSpeakerRecommendations() — Gemini (fire-and-forget)
 * Parse:       buildSubmissionsText() from lib/parse/builder.ts
 */

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

/**
 * What it does: Specifies the Next.js runtime behavior for this API route.
 * Why it is used: It ensures that this API route is always rendered dynamically at request time, preventing it from being statically optimized or cached.
 * Important implementation details: 'force-dynamic' is a Next.js specific export that forces dynamic rendering, which is necessary here because the route performs database operations and AI calls that need to be fresh for each request.
 */
export const dynamic = 'force-dynamic'

/**
 * What it does: Handles GET requests to retrieve the status and results of student speaker analyses for a specific session.
 * Why it is used: This endpoint allows a client (e.g., a frontend application) to check if a session has associated speaker analyses and to fetch the summary of those analyses if they exist.
 * Important implementation details:
 * - It requires an authenticated user and validates that the session identified by `id` belongs to the current user.
 * - It concurrently checks for the existence of analyses (`hasStudentSpeakerAnalyses`) and fetches the actual analysis data (`getStudentSpeakerAnalysis`) using `Promise.all` for efficiency.
 * - The response includes a boolean `hasAnalyses`, the `analysis` object (or `null`), and `fileCount`.
 */
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

/**
 * What it does: Handles POST requests to initiate the processing and AI analysis of student speaker submissions for a given session.
 * Why it is used: This endpoint is used to upload a ZIP file containing student submissions. The submissions are then parsed, stored in the database, and sent to AI services for speaker analysis, class insights, and speaker recommendations.
 * Important implementation details:
 * - It requires an authenticated user and validates that the session identified by `id` belongs to the current user.
 * - It expects a `storagePath` in the request body, which points to a temporarily uploaded ZIP file in Supabase storage.
 * - The ZIP file is downloaded, unzipped, and its contents are processed to extract student submissions.
 * - If speaker analyses already exist for the session, old submissions are deleted before inserting new ones, allowing for re-uploading.
 * - Student submissions are inserted into the database.
 * - AI analysis for speaker evaluation (`runSpeakerAnalysisEvaluation`), class insights generation (`generateClassInsights`), and speaker recommendations (`generateSpeakerRecommendations`) are triggered asynchronously (fire-and-forget) using `.then().catch()`. This prevents the main request from timing out while waiting for potentially long-running AI processes.
 * - The temporary ZIP file is deleted from Supabase storage in a `finally` block to ensure cleanup regardless of success or failure.
 * - The response includes the `fileCount` of processed submissions and a list of `studentNames` found in the submissions.
 */
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
