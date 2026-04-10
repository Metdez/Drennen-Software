/**
 * @file app/api/sessions/[id]/brief/route.ts
 *
 * Routes: GET | POST | PUT /api/sessions/[id]/brief
 *
 * Manages the AI-generated speaker brief for a session. The brief is a
 * structured document the professor can share with the guest speaker before
 * the class visit — it summarises student themes, tensions, sentiment, and
 * suggestions drawn from the class analysis.
 *
 * GET   — returns the stored brief (null if not yet generated)
 * POST  — generates and persists the brief via Gemini (idempotent: returns
 *         existing brief if already generated)
 * PUT   — saves professor edits to the brief without regenerating it
 *
 * Auth:        Required on all methods — 401 if not logged in; 404 if session
 *              belongs to another user.
 * DB calls:    getCurrentUser(), getSessionById(), getSpeakerBrief(),
 *              insertSpeakerBrief(), updateSpeakerBriefEdits(),
 *              getSessionAnalysis(), getClassInsights(),
 *              session_themes (admin client)
 * AI calls:    generateSpeakerBrief() → Gemini (POST only, skipped on cache hit)
 *
 * PII note: before calling Gemini, analysis data is sanitised via
 * sanitizeAnalysis() to remove any student-identifying information; only
 * aggregate theme and sentiment data is sent to the AI.
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getSessionById } from '@/lib/db/sessions'
import { getSpeakerBrief, insertSpeakerBrief, updateSpeakerBriefEdits } from '@/lib/db/speakerBriefs'
import { getSessionAnalysis } from '@/lib/db/sessionAnalyses'
import { getClassInsights } from '@/lib/db/classInsights'
import { createAdminClient } from '@/lib/supabase/server'
import { generateSpeakerBrief } from '@/lib/ai/speakerBrief'
import { extractErrorMessage } from '@/lib/utils/errors'
import type { SanitizedAnalysis, SanitizedClassInsights } from '@/lib/ai/speakerBrief'
import type { SessionAnalysis } from '@/types'

// force-dynamic ensures auth cookies are read fresh on every request
/**
 * What it does: This constant is a Next.js configuration that forces the route handler to be dynamic.
 * Why it is used: It ensures that the route handler will be executed at request time, rather than being cached statically. This is crucial for authentication, as it guarantees that authentication cookies are read freshly on every incoming request.
 * Important implementation details: The value 'force-dynamic' specifically disables static rendering and caching, making the route behave like a traditional server-side rendered (SSR) endpoint for all requests.
 */
export const dynamic = 'force-dynamic'

/**
 * Strips student PII from a SessionAnalysis before it is sent to Gemini.
 *
 * The full analysis may contain individual student names or raw submission
 * excerpts in fields we don't need for brief generation. This function
 * projects only the aggregate-level fields that are safe to share externally.
 *
 * @param analysis - Full per-session analysis from the `session_analyses` table
 * @returns A sanitized version containing only theme cluster summaries,
 *          tensions, suggestions, blind spots, and sentiment distribution
 */
/**
 * What it does: This function strips student Personally Identifiable Information (PII) from a `SessionAnalysis` object before it is sent to the Gemini AI model.
 * Why it is used: To ensure data privacy and compliance by preventing sensitive student data (like names or raw submission excerpts) from being exposed to external AI services. It projects only aggregate-level fields that are safe to share.
 * Important implementation details: It takes a full `SessionAnalysis` and returns a `SanitizedAnalysis` containing only theme cluster summaries (name, question count, top question), tensions, suggestions, blind spots, and sentiment distribution. Other potentially sensitive fields are omitted.
 */
function sanitizeAnalysis(analysis: SessionAnalysis): SanitizedAnalysis {
  return {
    theme_clusters: analysis.theme_clusters.map((c) => ({
      name: c.name,
      question_count: c.question_count,
      top_question: c.top_question,
    })),
    tensions: analysis.tensions,
    suggestions: analysis.suggestions,
    blind_spots: analysis.blind_spots,
    sentiment: analysis.sentiment,
  }
}

/**
 * GET /api/sessions/[id]/brief
 *
 * @param _request  - Unused; session ID comes from the route segment
 * @param params.id - Session UUID from the URL path segment
 * @returns JSON `{ brief: SpeakerBrief | null }` — null means not yet generated.
 *          Returns `{ error: string }` with status 401 / 404 / 500 on failure.
 */
/**
 * What it does: Handles GET requests to retrieve a speaker brief for a specific session.
 * Why it is used: To fetch and display the AI-generated or user-edited speaker brief associated with a given session in the user interface.
 * Important implementation details: It performs an authentication check using `getCurrentUser()` and an authorization check to ensure the user owns the session. If the user is unauthorized or the session is not found/owned, it returns appropriate error responses (401, 404). It then retrieves the brief using `getSpeakerBrief()` and returns it as a JSON object. Errors during the process are caught, logged, and returned as a 500 status with a sanitized error message.
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Auth check — returns null if cookie is absent or expired
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const session = await getSessionById(params.id)
    if (!session || session.userId !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const brief = await getSpeakerBrief(params.id)
    return NextResponse.json({ brief })
  } catch (err) {
    console.error('[/api/sessions/[id]/brief] GET', err)
    // extractErrorMessage() sanitizes raw Gemini/AI SDK error JSON into a
    // human-readable string — prevents internal error details from leaking
    return NextResponse.json({ error: extractErrorMessage(err) }, { status: 500 })
  }
}

/**
 * POST /api/sessions/[id]/brief
 *
 * Idempotent — if a brief already exists for this session it is returned
 * immediately without calling Gemini again.
 *
 * Generation pipeline:
 *   1. Fetch session theme titles from `session_themes`
 *   2. Fetch cached `session_analyses` (generated by /api/process)
 *   3. Fetch cross-session class insights for this professor
 *   4. Sanitize analysis data (strip PII)
 *   5. Call generateSpeakerBrief() → Gemini
 *   6. Persist result to `speaker_briefs`
 *
 * @param _request  - No request body required
 * @param params.id - Session UUID from the URL path segment
 * @returns JSON `{ brief: SpeakerBrief }` on success, or `{ error: string }`
 *          with status 401 / 404 / 500 on failure.
 */
/**
 * What it does: Handles POST requests to generate a new speaker brief for a specific session. It's designed to be idempotent.
 * Why it is used: To initiate the AI-driven generation of a speaker brief. This endpoint is typically called when a user requests a brief for a session for the first time.
 * Important implementation details: It includes an idempotency check, returning an existing brief if one is already present to avoid redundant AI calls. The generation pipeline involves fetching session themes, a cached session analysis, and cross-session class insights. All data passed to the `generateSpeakerBrief()` AI function is first sanitized to remove PII. An admin Supabase client is used for fetching themes to bypass RLS for this specific read after user ownership has been verified. The generated content is then persisted to the `speaker_briefs` table. Authentication, authorization, and comprehensive error handling are implemented, returning 401, 404, or 500 status codes as appropriate.
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

    const session = await getSessionById(params.id)
    if (!session || session.userId !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Idempotency check: return the existing brief without calling Gemini again
    const existing = await getSpeakerBrief(params.id)
    if (existing) {
      return NextResponse.json({ brief: existing })
    }

    // Admin client used here because we only need a read on session_themes and
    // ownership has already been verified above. Avoids RLS auth dependency
    // for this ancillary data fetch.
    const supabase = createAdminClient()

    // Fetch theme titles for this session (used as structured input for Gemini)
    const { data: themeRows, error: themeErr } = await supabase
      .from('session_themes')
      .select('theme_title')
      .eq('session_id', params.id)
      .order('theme_number', { ascending: true })
    if (themeErr) throw new Error(`Failed to fetch themes: ${themeErr.message}`)
    const themes = (themeRows ?? []).map((r) => r.theme_title as string)

    // Cached per-session Gemini analysis (typically already populated by
    // the fire-and-forget job kicked off in /api/process)
    const analysis = await getSessionAnalysis(params.id)

    // Cross-session class insights for this professor (e.g. quality trends,
    // recurring themes). These give Gemini more context for the brief.
    const classInsights = await getClassInsights(user.id)

    // Sanitize data — strip all student PII before passing to Gemini
    const sanitizedAnalysis: SanitizedAnalysis | null = analysis
      ? sanitizeAnalysis(analysis)
      : null

    const sanitizedInsights: SanitizedClassInsights | null = classInsights
      ? {
          narrative: classInsights.narrative,
          qualityTrend: classInsights.qualityTrend,
          topThemes: classInsights.topThemes.map((t) => ({
            title: t.title,
            sessionCount: t.sessionCount,
          })),
        }
      : null

    // Human-readable date shown in the brief header
    const sessionDate = new Date(session.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    // Generate the speaker brief via Gemini
    const content = await generateSpeakerBrief({
      speakerName: session.speakerName,
      sessionDate,
      fileCount: session.fileCount,
      themes,
      analysis: sanitizedAnalysis,
      classInsights: sanitizedInsights,
    })

    // Persist to DB so subsequent GETs and the download endpoint can use it
    const brief = await insertSpeakerBrief(params.id, user.id, content)

    return NextResponse.json({ brief })
  } catch (err) {
    console.error('[/api/sessions/[id]/brief] POST', err)
    return NextResponse.json({ error: extractErrorMessage(err) }, { status: 500 })
  }
}

/**
 * PUT /api/sessions/[id]/brief
 *
 * Saves professor edits to an existing brief. The edited version is stored in
 * `speaker_briefs.edited_content` separately from the original AI-generated
 * `content`, so the AI output is never overwritten and can always be restored.
 *
 * @param request   - JSON body `{ editedContent: string | null }`;
 *                    pass null to clear edits and revert to the AI output.
 * @param params.id - Session UUID from the URL path segment
 * @returns JSON `{ success: true }` or `{ error: string }` with status
 *          401 / 404 / 500.
 */
/**
 * What it does: Handles PUT requests to save user-made edits to an existing speaker brief.
 * Why it is used: To allow professors to modify the AI-generated brief content, personalizing it before use or download. It stores these edits separately from the original AI output.
 * Important implementation details: It requires an authenticated user and verifies that the user owns the session. The request body is expected to contain `editedContent` (a string or `null`). Passing `null` for `editedContent` will clear any existing edits, effectively reverting the brief to its original AI-generated version. Edits are saved using `updateSpeakerBriefEdits()`, storing them in the `edited_content` field of the `speaker_briefs` table, preserving the original AI-generated content. Error handling includes 401, 404, and 500 status responses.
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const session = await getSessionById(params.id)
    if (!session || session.userId !== user.id) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const body = await request.json()
    const { editedContent } = body

    // Passing null clears the edited version and falls back to the AI original
    await updateSpeakerBriefEdits(params.id, editedContent ?? null)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[/api/sessions/[id]/brief] PUT', err)
    return NextResponse.json({ error: extractErrorMessage(err) }, { status: 500 })
  }
}
