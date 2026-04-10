/**
 * @file app/api/sessions/[id]/rerun/route.ts
 *
 * Route: POST /api/sessions/[id]/rerun
 *
 * Re-runs the AI generation pipeline for an existing session using the
 * professor's currently active system prompt. The original session is NOT
 * modified (sessions are immutable by design). A new session row is inserted
 * with the same speaker name, semester, and student submissions but fresh AI
 * output. This is useful when a professor activates a new custom prompt version
 * and wants to see how the same submissions are synthesised differently.
 *
 * Pipeline (mirrors /api/process):
 *   1. Check subscription access (same gate as /api/process)
 *   2. Load original student submissions from DB (no ZIP re-upload needed)
 *   3. Resolve the currently active custom prompt (or built-in default)
 *   4. Call xAI Grok to generate a fresh question sheet
 *   5. Insert a NEW session row (new UUID; original is immutable)
 *   6. Insert student submissions + parsed themes for the new session
 *   7. Fire-and-forget: class insights, session analysis, student profiles,
 *      tier classification
 *
 * Auth:        Required — 401 if not logged in; 404 if session belongs to
 *              another user.
 * Subscription: Gated by checkSubscriptionAccess(); free-session count is
 *              decremented when access.reason === 'free_session'.
 * DB calls:    getCurrentUser(), checkSubscriptionAccess(), decrementFreeSession(),
 *              getSessionById(), getSubmissionsBySession(), getActivePrompt(),
 *              insertSession(), insertStudentSubmissions(), insertSessionThemes()
 * AI calls:    generateQuestionSheet() — xAI Grok (synchronous; user waits)
 *              generateClassInsights() — Gemini (fire-and-forget)
 *              generateAndCacheSessionAnalysis() — Gemini (fire-and-forget)
 *              generateStudentProfiles() — Gemini (fire-and-forget)
 *              classifyAndStoreTiers() — Gemini (fire-and-forget)
 */

import { NextResponse } from 'next/server'
import { generateQuestionSheet } from '@/lib/ai/client'
import { generateClassInsights } from '@/lib/ai/classInsights'
import { generateAndCacheSessionAnalysis } from '@/lib/ai/generateSessionAnalysis'
import { generateStudentProfiles } from '@/lib/ai/studentProfile'
import { classifyAndStoreTiers } from '@/lib/ai/tierClassifier'
import { getActivePrompt } from '@/lib/db/systemPrompts'
import { insertSession, insertSessionThemes, insertStudentSubmissions, getSessionById } from '@/lib/db/sessions'
import { getSubmissionsBySession } from '@/lib/db/studentSubmissions'
import { checkSubscriptionAccess, decrementFreeSession } from '@/lib/db/subscription'
import { getCurrentUser } from '@/lib/db/users'
import { formatSubmissionsForAi, type ParsedSubmission } from '@/lib/parse/builder'
import { parseThemesFromOutput } from '@/lib/parse/parseThemes'

/**
 * Exports a Next.js `dynamic` configuration for the route.
 * 1. What it does: Specifies the rendering behavior of the Next.js API route.
 * 2. Why it is used: Ensures that this API route is always dynamically rendered at request time and is not cached. This is critical for routes that perform actions like data modification, complex AI computations, and rely on up-to-date database information, preventing stale responses.
 * 3. Important implementation details: Set to `'force-dynamic'` to opt out of static rendering and data caching for the route.
 */
export const dynamic = 'force-dynamic'

/**
 * Handles the POST request to re-process an existing educational session's submissions using AI.
 * 1. What it does: This function orchestrates the re-analysis of student submissions from a previously processed session. It fetches the original submissions, applies the current AI analysis pipeline, creates a *new* session record with the updated AI output, and triggers several asynchronous background tasks for further insights and profiling.
 * 2. Why it is used: Allows users to re-evaluate a set of student submissions, potentially with updated AI models, system prompts, or new features, without needing to re-upload the original files. This provides flexibility for refining analyses or applying new capabilities to historical data.
 * 3. Important implementation details:
 *    - **Authentication and Authorization:** Verifies the current user's identity and checks their subscription access (`canGenerate`). Handles unauthorized access (401) and subscription requirements (403), including decrementing free session counts if applicable.
 *    - **Session and Submission Retrieval:** Fetches the `originalSession` and its `submissionRows` using the `params.id`. It validates that the session exists and belongs to the current user (404), and that submissions are available (400).
 *    - **Data Preparation:** Transforms raw `submissionRows` into `ParsedSubmission` objects and then formats them into a single text string (`text`) suitable for AI processing.
 *    - **AI Processing:** Calls `generateQuestionSheet` with the original speaker name, formatted submission text, and the active system prompt (if any) to obtain the new AI analysis `output`.
 *    - **New Session Creation:** Inserts a *new* session record into the database with the AI-generated `output`, linking it to the user, original speaker name, file count, and semester ID. It also records the `promptVersionId`.
 *    - **Parallel Database Inserts:** Asynchronously inserts the original `submissions` (linked to the new session) and `parsedThemes` extracted from the AI `output` into the database using `Promise.all` for efficiency. Includes error logging for these operations.
 *    - **Asynchronous Background Tasks:** Triggers several non-blocking AI-related tasks (`generateClassInsights`, `generateAndCacheSessionAnalysis`, `generateStudentProfiles`, `classifyAndStoreTiers`) using `.catch()` to log errors but not halt the main request flow. These tasks run in the background to enrich data and create further insights.
 *    - **Response:** Upon successful re-processing, returns a JSON object containing the `sessionId` of the *new* session, its `output`, and `fileCount`.
 *    - **Error Handling:** Implements comprehensive `try...catch` blocks to handle various errors, returning appropriate HTTP status codes (e.g., 401, 403, 404, 400, 500) and error messages.
 */
export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const access = await checkSubscriptionAccess(user.id)
    if (!access.canGenerate) {
      return NextResponse.json(
        { error: 'subscription_required', reason: access.reason },
        { status: 403 }
      )
    }

    const originalSession = await getSessionById(params.id)
    if (!originalSession || originalSession.userId !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const submissionRows = await getSubmissionsBySession(params.id)
    if (submissionRows.length === 0) {
      return NextResponse.json(
        { error: 'Original submissions unavailable for re-processing.' },
        { status: 400 }
      )
    }

    const submissions: ParsedSubmission[] = submissionRows.map((row) => ({
      studentName: row.student_name,
      filename: row.filename,
      text: row.submission_text,
    }))
    const text = formatSubmissionsForAi(submissions)

    const activePrompt = await getActivePrompt(user.id)
    const { output } = await generateQuestionSheet(
      originalSession.speakerName,
      text,
      activePrompt?.promptText ?? undefined
    )

    const session = await insertSession({
      userId: user.id,
      speakerName: originalSession.speakerName,
      output,
      fileCount: submissions.length,
      semesterId: originalSession.semesterId,
      promptVersionId: activePrompt?.id ?? null,
    })

    if (access.reason === 'free_session') {
      await decrementFreeSession(user.id)
    }

    const parsedThemes = parseThemesFromOutput(output)

    await Promise.all([
      insertStudentSubmissions(session.id, submissions).catch((e) =>
        console.error('[/api/sessions/[id]/rerun] insertStudentSubmissions failed:', e)
      ),
      insertSessionThemes(session.id, parsedThemes).catch((e) =>
        console.error('[/api/sessions/[id]/rerun] insertSessionThemes failed:', e)
      ),
    ])

    generateClassInsights(user.id, originalSession.semesterId ?? undefined).catch((e) =>
      console.error('[/api/sessions/[id]/rerun] generateClassInsights failed (non-fatal):', e)
    )

    generateAndCacheSessionAnalysis(
      session.id,
      user.id,
      session.speakerName,
      session.output,
      submissions.map((s) => ({ student_name: s.studentName, submission_text: s.text }))
    ).catch((e) =>
      console.error('[/api/sessions/[id]/rerun] generateAndCacheSessionAnalysis failed (non-fatal):', e)
    )

    generateStudentProfiles(user.id, [...new Set(submissions.map((s) => s.studentName))]).catch((e) =>
      console.error('[/api/sessions/[id]/rerun] generateStudentProfiles failed (non-fatal):', e)
    )

    classifyAndStoreTiers(session.id, session.speakerName, session.output).catch((e) =>
      console.error('[/api/sessions/[id]/rerun] classifyAndStoreTiers failed (non-fatal):', e)
    )

    return NextResponse.json({
      sessionId: session.id,
      output: session.output,
      fileCount: session.fileCount,
    })
  } catch (err) {
    console.error('[/api/sessions/[id]/rerun POST]', err)
    const message = err instanceof Error ? err.message : 'Failed to rerun session'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
