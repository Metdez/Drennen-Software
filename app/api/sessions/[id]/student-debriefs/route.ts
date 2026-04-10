/**
 * @file app/api/sessions/[id]/student-debriefs/route.ts
 *
 * Routes: GET | POST /api/sessions/[id]/student-debriefs
 *
 * Manages student debrief/reflection submissions for a session. After the
 * guest speaker's visit, students submit written reflections on the experience.
 * This endpoint ingests those reflections from a Canvas-style ZIP upload and
 * asynchronously analyses them with Gemini to surface themes, engagement
 * signals, and learning outcomes.
 *
 * GET  — returns whether submissions exist, the aggregate AI analysis (if
 *         ready), and the file count. The UI polls this to show a loading state
 *         while the fire-and-forget AI job is running.
 * POST — accepts a `storagePath` pointing to a ZIP already uploaded to Supabase
 *         Storage (temp-uploads bucket), downloads it, parses submissions, stores
 *         them, and kicks off three fire-and-forget AI jobs. Re-uploading replaces
 *         any previously stored debrief submissions for the session.
 *
 * This endpoint mirrors the structure of the speaker-analyses endpoint but
 * uses the student debrief DB/AI layer instead.
 *
 * Auth:        Required on both methods — 401 if not logged in; 404 if session
 *              belongs to another user.
 * DB calls:    getCurrentUser(), getSessionById(),
 *              hasStudentDebriefs(), getStudentDebriefAnalysis(),
 *              insertStudentDebriefSubmissions(),
 *              deleteStudentDebriefSubmissions(),
 *              upsertStudentDebriefAnalysis()
 * Storage:     downloadTempZip(), deleteTempZip() from lib/supabase/storage.server.ts
 *              (temp-uploads bucket; ZIP is deleted in the `finally` block)
 * AI calls:    runDebriefReflectionAnalysis() — Gemini (fire-and-forget)
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
  insertStudentDebriefSubmissions,
  deleteStudentDebriefSubmissions,
  hasStudentDebriefs,
  getStudentDebriefAnalysis,
  upsertStudentDebriefAnalysis,
} from '@/lib/db/studentDebriefs'
import { runDebriefReflectionAnalysis } from '@/lib/ai/debriefReflectionAnalysis'
import { generateClassInsights } from '@/lib/ai/classInsights'
import { generateSpeakerRecommendations } from '@/lib/ai/speakerRecommendations'

// force-dynamic ensures auth cookies are read on every request, never cached
export const dynamic = 'force-dynamic'

/**
 * GET /api/sessions/[id]/student-debriefs
 *
 * Returns the current state of student debrief submissions and their AI
 * analysis. The UI uses this to determine whether to show the upload form,
 * a loading spinner, or the completed analysis results.
 *
 * @param _request  - Unused
 * @param params    - Async params (Next.js 15 pattern); awaited to get `id`
 * @returns JSON `{ hasDebriefs: boolean, analysis: StudentDebriefAnalysis | null, fileCount: number }`
 *          or `{ error: string }` with status 401 / 404 / 500.
 *
 * @see lib/db/studentDebriefs.ts — `hasStudentDebriefs()`, `getStudentDebriefAnalysis()`
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth check
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Next.js 15: params is a Promise — must be awaited before accessing properties
    const { id: sessionId } = await params
    // Ownership check
    const session = await getSessionById(sessionId)
    if (!session || session.userId !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Fetch both in parallel — independent DB reads
    const [has, analysisResult] = await Promise.all([
      hasStudentDebriefs(sessionId),
      getStudentDebriefAnalysis(sessionId),
    ])

    return NextResponse.json({
      hasDebriefs: has,
      // null means the AI job hasn't completed yet (submissions exist but analysis is pending)
      analysis: analysisResult?.analysis ?? null,
      fileCount: analysisResult?.fileCount ?? 0,
    })
  } catch (err) {
    console.error('[student-debriefs GET]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/sessions/[id]/student-debriefs
 *
 * Ingests a ZIP of student reflection submissions from Supabase Storage,
 * parses them, stores the raw submissions, and kicks off three async AI jobs.
 * Re-uploading replaces any previously stored debrief submissions for this session.
 *
 * @param request   - JSON body `{ storagePath: string }` where `storagePath`
 *                    is the path in the `temp-uploads` Supabase Storage bucket
 *                    for the ZIP uploaded via the browser (lib/supabase/storage.ts).
 * @param params    - Async params (Next.js 15); awaited to get `id`
 * @returns JSON `{ fileCount: number, studentNames: string[] }` on success,
 *          or `{ error: string }` with status 401 / 404 / 400 / 500.
 *
 * @remarks
 * The temp ZIP is always deleted in the `finally` block regardless of outcome —
 * even on error — to prevent orphaned files accumulating in the storage bucket.
 *
 * Fire-and-forget AI jobs (all non-fatal; failures are logged, not thrown):
 *   1. `runDebriefReflectionAnalysis()` → Gemini: analyses reflections and
 *      upserts the result into `student_debrief_analyses`
 *   2. `generateClassInsights()` → Gemini: refreshes cross-session class analysis
 *   3. `generateSpeakerRecommendations()` → Gemini: refreshes recommendation data
 *
 * @see lib/parse/builder.ts — `buildSubmissionsText()`
 * @see lib/ai/debriefReflectionAnalysis.ts — `runDebriefReflectionAnalysis()`
 * @see lib/supabase/storage.server.ts — `downloadTempZip()`, `deleteTempZip()`
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let storagePath: string | null = null
  try {
    // Auth check
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Next.js 15: params is a Promise — must be awaited
    const { id: sessionId } = await params
    // Ownership check
    const session = await getSessionById(sessionId)
    if (!session || session.userId !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const body = await request.json() as { storagePath?: string }
    storagePath = body.storagePath ?? null
    if (!storagePath) {
      return NextResponse.json({ error: 'Missing storagePath' }, { status: 400 })
    }

    // Download ZIP from temp-uploads bucket and parse student submissions
    const zipBuffer = await downloadTempZip(storagePath)
    const { fileCount, submissions } = await buildSubmissionsText(zipBuffer)

    if (fileCount === 0) {
      return NextResponse.json({ error: 'No readable student files found in ZIP' }, { status: 400 })
    }

    // Replace existing submissions if re-uploading (idempotent replace, not append)
    const alreadyExists = await hasStudentDebriefs(sessionId)
    if (alreadyExists) {
      await deleteStudentDebriefSubmissions(sessionId)
    }

    await insertStudentDebriefSubmissions(sessionId, submissions)

    // Deduplicated, sorted student name list returned to the UI for display
    const studentNames = [...new Set(submissions.map(s => s.studentName))].sort()

    // Normalise submissions for AI (matches the shape expected by Gemini prompts)
    const submissionsForAI = submissions.map(s => ({
      student_name: s.studentName,
      submission_text: s.text,
    }))

    // Fire-and-forget: run AI analysis and store results
    runDebriefReflectionAnalysis(session.speakerName, submissionsForAI)
      .then(analysis => upsertStudentDebriefAnalysis(sessionId, user.id, analysis, fileCount))
      .catch(e => console.error('[student-debriefs] AI analysis failed (non-fatal):', e))

    // Fire-and-forget: refresh class insights incorporating new debrief data
    generateClassInsights(user.id, session.semesterId ?? undefined).catch(e =>
      console.error('[student-debriefs] generateClassInsights failed (non-fatal):', e)
    )

    // Fire-and-forget: refresh speaker recommendations based on updated data
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
