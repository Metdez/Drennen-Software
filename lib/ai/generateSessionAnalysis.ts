/**
 * @file lib/ai/generateSessionAnalysis.ts
 *
 * Thin orchestration wrapper that combines Gemini analysis generation with
 * database persistence for a single session.
 *
 * This file exists to give `app/api/process/route.ts` a single fire-and-forget
 * call that handles both the AI work and the DB write without the route handler
 * needing to import from two separate modules. The function is intentionally
 * simple — it delegates entirely to `runSessionAnalysis` and `insertSessionAnalysis`.
 *
 * **Fire-and-forget pattern:** The caller (the process route) does NOT await
 * this function. It is invoked after the session is saved so that the professor
 * receives their interview sheet immediately while analysis pre-caches in the
 * background. By the time the professor navigates to the Preview page's Analysis
 * tab, the result is already in the DB and loads instantly.
 *
 * Uses: lib/ai/analysisAgent.ts (runSessionAnalysis)
 * Uses: lib/db/sessionAnalyses.ts (insertSessionAnalysis)
 *
 * Called by: app/api/process/route.ts (fire-and-forget after session save)
 */

import { runSessionAnalysis } from '@/lib/ai/analysisAgent'
import { insertSessionAnalysis } from '@/lib/db/sessionAnalyses'

/**
 * Runs Gemini session analysis and persists the result to the DB.
 *
 * Designed to be called fire-and-forget from `/api/process` so analysis
 * is pre-cached by the time the professor navigates to the Preview page.
 *
 * Execution steps:
 *   1. Calls `runSessionAnalysis` (Gemini) to produce theme clusters, tensions,
 *      suggestions, blind spots, and sentiment distribution.
 *   2. Calls `insertSessionAnalysis` to write the result to `session_analyses`.
 *
 * If either step throws, the error will be an unhandled rejection on the
 * fire-and-forget call site. The process route should wrap the invocation in
 * a `.catch()` or `void` to prevent unhandled rejection warnings, since a
 * pre-cache failure is non-fatal — the analysis tab can re-trigger on demand.
 *
 * Uses: lib/ai/analysisAgent.ts — runSessionAnalysis
 * Uses: lib/db/sessionAnalyses.ts — insertSessionAnalysis
 *
 * Called by: app/api/process/route.ts
 *
 * @param sessionId    - ID of the newly created session row
 * @param userId       - Professor's user ID (needed for RLS-compliant insert)
 * @param speakerName  - Guest speaker's name
 * @param sessionOutput - The AI-generated markdown interview sheet
 * @param submissions   - Raw student submissions to analyze
 */
export async function generateAndCacheSessionAnalysis(
  sessionId: string,
  userId: string,
  speakerName: string,
  sessionOutput: string,
  submissions: Array<{ student_name: string; submission_text: string }>
): Promise<void> {
  // Step 1: Generate analysis via Gemini
  // Uses: lib/ai/analysisAgent.ts
  const analysis = await runSessionAnalysis(speakerName, sessionOutput, submissions)

  // Step 2: Persist to DB so the Preview page can load it without re-generating
  // Uses: lib/db/sessionAnalyses.ts
  await insertSessionAnalysis(sessionId, userId, analysis)
}
