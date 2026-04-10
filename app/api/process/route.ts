/**
 * POST /api/process
 *
 * The core session-generation pipeline. Authenticated professors POST here
 * after uploading a Canvas ZIP of student question submissions. This route
 * orchestrates every step from storage retrieval to AI generation to DB
 * persistence to five fire-and-forget background jobs.
 *
 * Auth: required (cookie-based Supabase session via getCurrentUser())
 * Subscription gate: checkSubscriptionAccess() must return canGenerate=true
 *   — free-trial users with remaining sessions pass; expired/no-subscription
 *     users receive 403 { error: 'subscription_required', reason }.
 *
 * Request body: { speakerName: string; storagePath: string }
 *   - speakerName: display name for the guest speaker
 *   - storagePath: path to the previously uploaded ZIP inside the
 *     `temp-uploads` Supabase Storage bucket (set by the browser upload step)
 *
 * Pipeline (in order):
 *  1. Auth + subscription check
 *  2. Download ZIP from temp-uploads bucket via downloadTempZip()
 *  3. Parse ZIP → structured text + student submissions via buildSubmissionsText()
 *  4. Resolve active prompt: professor's saved override or built-in default
 *  5. Call xAI Grok (OpenAI SDK interface) via generateQuestionSheet()
 *  6. Resolve active semester (NULL = unassigned)
 *  7. Persist session row via insertSession()
 *  8. Decrement free session counter if applicable
 *  9. In parallel: insertStudentSubmissions() + insertSessionThemes()
 * 10. Compute theme overlap against the last 5 sessions (non-fatal)
 * 11–15. Five fire-and-forget Gemini jobs (all non-blocking, failures logged):
 *        generateClassInsights, generateAndCacheSessionAnalysis,
 *        generateStudentProfiles, classifyAndStoreTiers
 * Finally: delete the temp ZIP from storage regardless of success/failure
 *
 * Response (200): { sessionId, output, fileCount, overlappingThemes }
 *   - output: raw AI markdown that the client caches in sessionStorage
 *   - overlappingThemes: theme titles that also appeared in recent sessions
 *
 * Error responses:
 *   401 — not authenticated
 *   400 — missing speakerName, missing storagePath, or empty ZIP
 *   403 — subscription_required
 *   500 — unexpected error
 */
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { buildSubmissionsText } from '@/lib/parse/builder'
import { generateQuestionSheet } from '@/lib/ai/client'
import { insertSession, insertStudentSubmissions, insertSessionThemes } from '@/lib/db/sessions'
import { downloadTempZip, deleteTempZip } from '@/lib/supabase/storage.server'
import { parseThemesFromOutput, themesOverlap } from '@/lib/parse/parseThemes'
import { getRecentThemeTitles } from '@/lib/db/themes'
import { generateClassInsights } from '@/lib/ai/classInsights'
import { generateAndCacheSessionAnalysis } from '@/lib/ai/generateSessionAnalysis'
import { generateStudentProfiles } from '@/lib/ai/studentProfile'
import { classifyAndStoreTiers } from '@/lib/ai/tierClassifier'
import { getActiveSemester } from '@/lib/db/semesters'
import { checkSubscriptionAccess, decrementFreeSession } from '@/lib/db/subscription'
import { getActivePrompt } from '@/lib/db/systemPrompts'

/**
 * Sets the Next.js route segment config.
 *
 * It is used to ensure this API route is always treated as dynamic, preventing it from being statically optimized or cached.
 *
 * By setting `force-dynamic`, every request to this endpoint will execute the `POST` handler, which is crucial as it involves authentication, database writes, and dynamic AI model calls that cannot be pre-rendered or cached.
 */
export const dynamic = 'force-dynamic'

/**
 * Handles the full ZIP → AI → DB pipeline for a new session.
 *
 * @param request - Next.js Request; body must be JSON with speakerName and storagePath
 * @returns 200 { sessionId, output, fileCount, overlappingThemes } on success
 */
/**
 * Handles the full ZIP file processing pipeline, from receiving student submissions to generating AI-powered insights and persisting data to the database.
 *
 * It is used as the primary API endpoint for professors to initiate the generation of interview question sheets based on a ZIP archive of student work, integrating various backend services.
 *
 * Important implementation details:
 * - **Authentication & Authorization**: Verifies the current user is an authenticated professor (`getCurrentUser`) and has valid subscription access (`checkSubscriptionAccess`).
 * - **Input Validation**: Expects a JSON body with `speakerName` and `storagePath` for the temporary ZIP file, returning 400 for missing fields.
 * - **File Handling**: Downloads the ZIP from Supabase (`downloadTempZip`), extracts student submissions (`buildSubmissionsText`), and ensures the temporary ZIP is deleted in a `finally` block, even on error.
 * - **AI Integration**: Orchestrates calls to multiple AI services:
 *     - `generateQuestionSheet` (using xAI Grok) for the primary question sheet.
 *     - `generateClassInsights`, `generateAndCacheSessionAnalysis`, `generateStudentProfiles`, and `classifyAndStoreTiers` (using Gemini) as non-blocking background jobs for comprehensive analytics.
 * - **Database Persistence**: Inserts core session data immediately (`insertSession`), then concurrently persists student submissions and parsed themes (`insertStudentSubmissions`, `insertSessionThemes`).
 * - **Concurrency & Performance**: Uses `Promise.all` for parallel database writes and spawns several AI analysis jobs as fire-and-forget background tasks. This allows the API to return a response to the client quickly while complex computations complete asynchronously.
 * - **Subscription Management**: Decrements a free session counter if the user is on a trial.
 * - **Error Handling**: Provides specific HTTP status codes (401, 403, 400, 500) for different failure scenarios and logs internal errors without blocking the user where possible (e.g., non-fatal analytics job failures).
 * - **Theme Overlap Detection**: Identifies if themes from the current session have appeared in recent past sessions for the same professor, to highlight recurring topics.
 */
export async function POST(request: Request) {
  // Track storagePath so the finally block can always clean up the temp ZIP,
  // even if we return early with a 4xx before the variable is set in the try block.
  let storagePath: string | null = null
  try {
    // Step 1: verify the caller is an authenticated professor
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Step 2: subscription gate — free trial, paid, or blocked
    const access = await checkSubscriptionAccess(user.id)
    if (!access.canGenerate) {
      // access.reason distinguishes 'no_subscription', 'trial_expired', etc.
      return NextResponse.json(
        { error: 'subscription_required', reason: access.reason },
        { status: 403 }
      )
    }

    const body = await request.json() as { speakerName?: string; storagePath?: string }
    const speakerName = body.speakerName ?? null
    // Assign to outer variable so the finally block can clean up the temp file
    storagePath = body.storagePath ?? null

    if (!speakerName?.trim()) {
      return NextResponse.json({ error: 'Missing speakerName' }, { status: 400 })
    }
    if (!storagePath) {
      return NextResponse.json({ error: 'Missing storagePath' }, { status: 400 })
    }

    // Step 3: download the ZIP the browser already uploaded to temp-uploads bucket
    const zipBuffer = await downloadTempZip(storagePath)

    // Step 4: extract ZIP, parse PDFs/DOCXs, build structured submission text
    // Returns individual student submission objects alongside the concatenated text
    const { text, fileCount, submissions } = await buildSubmissionsText(zipBuffer)

    if (fileCount === 0) {
      return NextResponse.json({ error: 'No readable student files found in ZIP' }, { status: 400 })
    }

    // Step 5: resolve the professor's active custom prompt, or fall back to the
    // built-in default in lib/ai/prompt.ts (activePrompt === null → default)
    const activePrompt = await getActivePrompt(user.id)
    const customPromptText = activePrompt?.promptText ?? undefined

    // Step 6: call xAI Grok via the OpenAI SDK (baseURL overridden to x.ai/v1)
    // Returns the full 10-section markdown interview sheet
    const { output } = await generateQuestionSheet(speakerName.trim(), text, customPromptText)

    // Step 7: attach to the active semester if one exists; NULL = unassigned
    const activeSemester = await getActiveSemester(user.id)
    const semesterId = activeSemester?.id ?? null

    // Step 8: persist the session row — sessions are IMMUTABLE after this point
    // promptVersionId = NULL means the built-in default prompt was used
    const session = await insertSession({
      userId: user.id,
      speakerName: speakerName.trim(),
      output,
      fileCount,
      semesterId,
      promptVersionId: activePrompt?.id ?? null,
    })

    // Step 9: decrement the free-session counter only if this was a free slot
    // (reason = 'free_session' means the user was on their trial allowance)
    if (access.reason === 'free_session') {
      await decrementFreeSession(user.id)
    }

    // Step 10: persist per-student and per-theme rows for the analytics layer.
    // These run in parallel; failures are logged but do NOT abort the response —
    // the session row is already saved and the professor should get their output.
    const parsedThemes = parseThemesFromOutput(output)
    let overlappingThemes: string[] = []

    await Promise.all([
      insertStudentSubmissions(session.id, submissions).catch((e) =>
        console.error('[/api/process] insertStudentSubmissions failed:', e)
      ),
      insertSessionThemes(session.id, parsedThemes).catch((e) =>
        console.error('[/api/process] insertSessionThemes failed:', e)
      ),
    ])

    // Step 11: detect which themes from THIS session also appeared in the last 5 sessions.
    // The client uses overlappingThemes to display a "recurring topic" badge.
    // Non-fatal — a failure here must not block the response.
    try {
      if (parsedThemes.length > 0) {
        // Fetch theme titles from the 5 most recent other sessions for this professor
        const recentTitles = await getRecentThemeTitles(user.id, session.id, 5)
        overlappingThemes = parsedThemes
          .filter(t => recentTitles.some(r => themesOverlap(t.themeTitle, r)))
          .map(t => t.themeTitle)
      }
    } catch (e) {
      console.error('[/api/process] overlap detection failed (non-fatal):', e)
    }

    // --- Fire-and-forget background jobs -----------------------------------------
    // All four jobs below are intentionally non-blocking: we do NOT await them.
    // The client receives its response immediately; jobs run asynchronously in the
    // same Node.js event loop and complete in the background. Each failure is
    // logged but does not surface to the user.
    // -------------------------------------------------------------------------------

    // Job A: regenerate cross-session class insights (Gemini) so the Analytics
    // page shows up-to-date summaries without the professor waiting.
    generateClassInsights(user.id, semesterId ?? undefined).catch(e =>
      console.error('[/api/process] generateClassInsights failed (non-fatal):', e)
    )

    // Job B: pre-compute per-session Gemini analysis (theme clusters, tensions,
    // sentiment) so that the Preview page's Analysis tab loads instantly.
    generateAndCacheSessionAnalysis(
      session.id,
      user.id,
      session.speakerName,
      session.output,
      // Map submission objects to the shape expected by the analysis agent
      submissions.map(s => ({ student_name: s.studentName, submission_text: s.text }))
    ).catch(e =>
      console.error('[/api/process] generateAndCacheSessionAnalysis failed (non-fatal):', e)
    )

    // Job C: regenerate AI growth-intelligence profiles for every student
    // who submitted in this ZIP. De-duplicated via Set to avoid redundant calls.
    const affectedStudents = [...new Set(submissions.map(s => s.studentName))]
    generateStudentProfiles(user.id, affectedStudents).catch(e =>
      console.error('[/api/process] generateStudentProfiles failed (non-fatal):', e)
    )

    // Job D: classify the AI output into question quality tiers (Tier 1–4)
    // via Gemini and cache the result in session_tier_data for the leaderboard.
    classifyAndStoreTiers(session.id, session.speakerName, session.output).catch(e =>
      console.error('[/api/process] classifyAndStoreTiers failed (non-fatal):', e)
    )

    // Return the session data the client needs immediately.
    // The client caches `output` in sessionStorage under `session_${sessionId}`
    // to avoid a redundant fetch when navigating to /preview.
    return NextResponse.json({
      sessionId: session.id,
      output: session.output,
      fileCount: session.fileCount,
      overlappingThemes,
    })

  } catch (err) {
    console.error('[/api/process]', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  } finally {
    // Always clean up the temp ZIP from storage, even on error paths.
    // Swallow deletion errors — a stale temp file is not a blocking issue.
    if (storagePath) await deleteTempZip(storagePath).catch(() => {})
  }
}
