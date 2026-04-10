/**
 * @file lib/ai/classInsights.ts
 *
 * Generates cross-session class-level insights by feeding all of a professor's
 * session data into Gemini and asking it to identify recurring themes, quality
 * trends, and at-risk students across the entire semester.
 *
 * This is the "zoom out" complement to per-session analysis: where
 * `lib/ai/analysisAgent.ts` analyzes a single session in depth, this module
 * synthesizes patterns across ALL sessions for the professor's account.
 *
 * ## Where it fits
 * - Called by: app/api/process/route.ts (fire-and-forget after session upload)
 * - Called by: app/api/sessions/[id]/debrief/complete/route.ts (fire-and-forget
 *              after professor marks debrief complete, so post-session ratings
 *              can inform the cross-session analysis)
 * - Persists to: `class_insights` via lib/db/classInsights.ts (one row per professor,
 *                upserted — previous insights are overwritten each time)
 *
 * ## Fire-and-forget pattern
 * Callers do NOT await this function. If it throws, the error is silently swallowed
 * by the caller to avoid blocking the response. This function only logs internally.
 *
 * ## Ground-truth vs. AI data
 * The `themeEvolution` and `sessionEffectiveness` fields in the output are built
 * from ground-truth DB data (not from the AI response) to avoid hallucination.
 * Only the narrative, qualityTrend, topThemes, and watchlist come from Gemini.
 *
 * Uses: lib/ai/geminiClient.ts, lib/db/classInsights.ts
 */

import { getGeminiClient, getGeminiModel } from '@/lib/ai/geminiClient'
import { fetchInsightsInput, upsertClassInsights } from '@/lib/db/classInsights'
import type { ClassInsights, ThemeEvolutionEntry } from '@/types'

/**
 * Builds the Gemini prompt for class-wide insight generation.
 *
 * The prompt is assembled from the aggregated `InsightsInput` struct returned by
 * `fetchInsightsInput()`. Conditionally appends debrief and reflection context
 * when that data is available — the AI is instructed to use debrief ratings as
 * "ground truth" about which questions actually resonated in the room, and to
 * compare pre-session question themes vs. post-session reflection themes to surface
 * expectation/reality gaps.
 *
 * @param input - The aggregated session data from lib/db/classInsights.ts
 * @returns The full prompt string to send to Gemini
 */
/**
 * What it does:
 * Builds the Gemini prompt string used for generating class-wide insights based on aggregated session data.
 *
 * Why it is used:
 * To meticulously prepare the input query for the Gemini AI model. This prompt guides the AI to analyze student questions, debrief feedback, and reflection themes comprehensively, ultimately producing high-quality insights for a professor.
 *
 * Important implementation details:
 * 1. Assembles a detailed `sessionSummary` object for the prompt, including speaker, date, submission counts, pre-session themes, debrief ratings, and student reflection data.
 * 2. Conditionally appends specific instructions and context about debrief and reflection data if available. The AI is directed to use debrief ratings as "ground truth" about question resonance and to compare pre-session question themes with post-session reflection themes to identify expectation/reality gaps.
 * 3. Clearly specifies the exact JSON output structure expected from Gemini, along with detailed rules for populating each field (e.g., `narrative`, `qualityTrend`, `topThemes`, `watchlist`, `themeEvolution`).
 * 4. Establishes the AI's persona as an "expert curriculum analyst" to ensure the desired analytical tone and focus.
 */
function buildPrompt(input: Awaited<ReturnType<typeof fetchInsightsInput>>): string {
  const lastSession = input.sessions.at(-1)
  const sessionsWithDebriefs = input.sessions.filter(s => s.debriefRating !== null)
  const sessionsWithReflections = input.sessions.filter(s => s.studentReflectionThemes.length > 0)
  const sessionSummary = input.sessions.map(s => ({
    speaker: s.speakerName,
    date: new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    submissions: s.submissionCount,
    themes: s.themes,
    ...(s.debriefRating !== null ? {
      debriefRating: s.debriefRating,
      homeRunQuestions: s.debriefHomeRunCount,
      flatQuestions: s.debriefFlatCount,
    } : {}),
    ...(s.studentReflectionThemes.length > 0 ? {
      studentReflectionThemes: s.studentReflectionThemes,
      studentReflectionSummary: s.studentReflectionSummary,
    } : {}),
  }))

  return `You are an expert curriculum analyst helping a university professor understand what their students most want to learn and discuss.

Your job is to identify the CORE THEMES across all student questions — the recurring topics, curiosities, and concerns that students keep coming back to. What are students hungry to hear about? What patterns reveal what this class actually cares about?

Session data (${input.sessions.length} session${input.sessions.length !== 1 ? 's' : ''}, oldest first):
${JSON.stringify(sessionSummary, null, 2)}
${sessionsWithDebriefs.length > 0 ? `
Post-session debrief data is available for ${sessionsWithDebriefs.length} session(s). Sessions with debriefRating, homeRunQuestions, and flatQuestions fields have professor feedback on which questions actually resonated in the room. Use this ground-truth data to assess which themes consistently produce the richest conversations vs. which fall flat.` : ''}
${sessionsWithReflections.length > 0 ? `
Student post-session reflections are available for ${sessionsWithReflections.length} session(s). Sessions with studentReflectionThemes and studentReflectionSummary fields contain AI-analyzed themes from student debrief submissions — what resonated, surprised students, and connected to their careers. Use this data to understand what ACTUALLY LANDED with students vs. what was intended. Compare pre-session question themes with post-session reflection themes to identify gaps between expectation and reality.` : ''}

Return a JSON object with exactly this structure:
{
  "narrative": "2-3 PARAGRAPHS (not sentences) synthesizing what students care about most. Name specific themes. Explain what the patterns reveal about student curiosity and intent. Note any shifts in sophistication or depth over time. Call out anything surprising. Write in a warm, insight-driven tone — this is an intelligence briefing for the professor, not a data dump. Separate paragraphs with double newlines.",
  "qualityTrend": {
    "direction": "improving" | "declining" | "stable",
    "description": "One sentence about how the depth or sophistication of student questions has evolved across sessions."
  },
  "topThemes": [
    {
      "title": "theme title",
      "sessionCount": number,
      "isNew": boolean,
      "summary": "2-3 sentences describing what students are asking about within this theme, how the angle has evolved across sessions, and what it reveals about student interests.",
      "sampleQuestions": ["representative question 1", "representative question 2", "representative question 3"]
    }
  ],
  "watchlist": [
    { "studentName": "name", "reason": "specific reason" }
  ],
  "themeEvolution": [
    { "sessionId": "id", "speakerName": "name", "date": "ISO string", "themes": ["theme1", ...] }
  ],
  "generatedAt": "ISO timestamp"
}

Rules:
- narrative: 2-3 PARAGRAPHS answering "what do these students want to hear about?" — synthesize the dominant themes into a clear picture of student curiosity and intent; mention specific theme names; note evolution in sophistication; call out surprises
- qualityTrend.direction: infer from whether themes are becoming more strategic, personal, or sophisticated over sessions
- topThemes: all unique themes across all sessions, sorted by sessionCount descending; isNew=true only if theme first appeared in the most recent session; summary should describe what students ask about within this theme; sampleQuestions should be 2-3 representative questions students might ask about this theme (generate realistic examples based on the theme and speaker context)
- watchlist: only students absent from the last 2 sessions (if 2+ sessions exist); max 5 entries; empty array if none
- themeEvolution: one entry per session in chronological order, preserving the sessionId and date exactly as provided
- generatedAt: current ISO timestamp`
}

/**
 * Generates and persists cross-session class insights for a professor.
 *
 * Flow:
 * 1. Fetch aggregated session data via `fetchInsightsInput()` (themes, debrief
 *    ratings, reflection summaries, leaderboard, drop-off list)
 * 2. Early-exit if no sessions exist (nothing to analyze)
 * 3. Call Gemini with the full prompt; parse the JSON response
 * 4. Overwrite `themeEvolution` and `sessionEffectiveness` with ground-truth DB
 *    data to prevent hallucination of session ordering or debrief ratings
 * 5. Enrich `topThemes[].sessions` by joining against the per-theme session map
 *    built from ground-truth data (Gemini's sessionCount may be approximate)
 * 6. Persist the assembled `ClassInsights` via `upsertClassInsights()`
 *
 * Fire-and-forget: does not block the caller.
 * Persists to: `class_insights` via lib/db/classInsights.ts
 *
 * @param userId - The professor's user ID
 * @param semesterId - Optional semester filter; if omitted, analyzes ALL sessions
 *                     for the professor (used by the main analytics view)
 */
/**
 * What it does:
 * Orchestrates the end-to-end process of generating and persisting cross-session class insights for a given professor, potentially filtered by a specific semester.
 *
 * Why it is used:
 * To provide professors with an AI-powered, synthetic overview of student learning patterns, emerging themes, and engagement trends across multiple class sessions. This helps them understand student interests, identify areas for curriculum adjustment, and gain deeper insights into class dynamics. It operates as a fire-and-forget asynchronous process, persisting results to the database rather than returning them directly.
 *
 * Important implementation details:
 * 1. Fetches aggregated `InsightsInput` data using `fetchInsightsInput` and gracefully exits if no sessions are available for analysis.
 * 2. Initializes the Gemini client and sends the meticulously constructed prompt (via `buildPrompt`) to the AI model, requesting a JSON response.
 * 3. Includes a `systemInstruction` to the Gemini model, reinforcing the requirement for valid JSON output matching the specified schema.
 * 4. Parses the raw AI response, including a cleanup step to strip any Markdown code fences (e.g., ```json) that Gemini might occasionally add.
 * 5. **Critical Implementation Detail**: To prevent AI hallucination and ensure data accuracy, it explicitly overrides certain AI-generated fields with ground-truth data from the database. Specifically, `themeEvolution` is rebuilt based on the actual chronological session order, `sessionEffectiveness` is derived from real debrief ratings, and `topThemes[].sessions` are enriched/corrected using a ground-truth map of themes to speaker names.
 * 6. Constructs the final `ClassInsights` object by merging the parsed AI data with the corrected ground-truth information.
 * 7. Persists the complete `ClassInsights` object to the `class_insights` table using `upsertClassInsights`, along with the total number of sessions analyzed. The analysis can be scoped to a specific semester or cover all sessions for a professor.
 */
export async function generateClassInsights(userId: string, semesterId?: string): Promise<void> {
  const input = await fetchInsightsInput(userId, semesterId)
  if (input.sessions.length === 0) return

  const ai = getGeminiClient()

  const response = await ai.models.generateContent({
    model: getGeminiModel(),
    contents: buildPrompt(input),
    config: {
      responseMimeType: 'application/json',
      systemInstruction:
        'You are an expert educational data analyst. Always respond with valid JSON matching the requested schema exactly.',
    },
  })

  // Strip markdown fences — Gemini occasionally wraps JSON in ```json blocks
  const raw = (response.text ?? '').trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()

  const parsed = JSON.parse(raw) as Partial<ClassInsights>

  // Build themeEvolution from ground-truth session order to avoid hallucination.
  // Gemini tends to reorder sessions or misremember session IDs; we override its
  // themeEvolution output entirely with the correct data from the DB.
  const themeEvolution: ThemeEvolutionEntry[] = input.sessions.map(s => ({
    sessionId: s.sessionId,
    speakerName: s.speakerName,
    date: s.date,
    themes: s.themes,
  }))

  // Build sessionEffectiveness from ground-truth debrief data.
  // Only sessions with completed debriefs (debriefRating !== null) are included.
  const sessionEffectiveness = input.sessions
    .filter(s => s.debriefRating !== null)
    .map(s => ({
      speakerName: s.speakerName,
      rating: s.debriefRating!,
      homeRunCount: s.debriefHomeRunCount,
      flatCount: s.debriefFlatCount,
    }))

  // Build a ground-truth map of theme title → speaker names for enriching topThemes.
  // This lets us show "which sessions this theme appeared in" without trusting Gemini's
  // session attribution.
  const sessionsByTheme = new Map<string, string[]>()
  for (const s of input.sessions) {
    for (const theme of s.themes) {
      const normalized = theme.toLowerCase()
      const list = sessionsByTheme.get(normalized) ?? []
      list.push(s.speakerName)
      sessionsByTheme.set(normalized, list)
    }
  }

  const analysis: ClassInsights = {
    narrative: parsed.narrative ?? '',
    qualityTrend: parsed.qualityTrend ?? { direction: 'stable', description: '' },
    topThemes: (parsed.topThemes ?? []).map(t => ({
      title: t.title,
      sessionCount: t.sessionCount,
      isNew: t.isNew ?? false,
      summary: t.summary ?? '',
      // Prefer ground-truth session list; fall back to whatever Gemini returned
      sessions: sessionsByTheme.get(t.title.toLowerCase()) ?? t.sessions ?? [],
      sampleQuestions: t.sampleQuestions ?? [],
    })),
    watchlist: parsed.watchlist ?? [],
    themeEvolution,
    // Only include sessionEffectiveness if there is at least one completed debrief
    ...(sessionEffectiveness.length > 0 ? { sessionEffectiveness } : {}),
    generatedAt: new Date().toISOString(),
  }

  await upsertClassInsights(userId, analysis, input.sessions.length, semesterId)
}
