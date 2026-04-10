/**
 * @file lib/ai/analysisAgent.ts
 *
 * Gemini-powered analysis agents for session and theme deep-dives.
 *
 * This file contains three distinct analysis functions, each targeting a
 * different analytical scope:
 *
 * 1. **`runSessionAnalysis`** — Analyzes all submissions for a single speaker
 *    session. Produces theme clusters, underlying tensions, interview
 *    suggestions, blind spots, and sentiment distribution. Result is cached
 *    in the `session_analyses` table via `generateAndCacheSessionAnalysis`.
 *
 * 2. **`runThemeAnalysis`** — Drills into a single theme within one session.
 *    Surfaces what students are really asking beneath the surface, probe
 *    questions for the professor, missed angles, and behavioral patterns.
 *    Powers the `/preview/theme` deep-dive page.
 *
 * 3. **`runCrossSessionThemeAnalysis`** — Examines how a recurring theme
 *    appears across multiple sessions / speakers. Identifies persistent
 *    student curiosities and patterns over time. Powers the
 *    `/analytics/theme` cross-session view.
 *
 * All three functions use Google Gemini via the shared singleton.
 * Uses: lib/ai/geminiClient.ts — never instantiate GoogleGenAI directly.
 *
 * Called by:
 *   - lib/ai/generateSessionAnalysis.ts (`runSessionAnalysis`)
 *   - app/api/sessions/[id]/analysis/route.ts (POST — `runSessionAnalysis`)
 *   - app/api/sessions/[id]/theme-analysis/route.ts (`runThemeAnalysis`)
 *   - app/api/analytics/themes/route.ts (`runCrossSessionThemeAnalysis`)
 */

import { getGeminiClient, getGeminiModel } from '@/lib/ai/geminiClient'
import type { SessionAnalysis, ThemeAnalysis, CrossSessionThemeAnalysis } from '@/types'

// ---------------------------------------------------------------------------
// Session-level analysis
// ---------------------------------------------------------------------------

/**
 * Constructs the Gemini prompt for whole-session analysis.
 *
 * The prompt embeds both the AI-generated interview sheet (already theme-grouped)
 * and the raw student submissions. This dual-context approach lets Gemini use
 * the interview sheet's theme titles as anchors for cluster assignment while
 * still reasoning over the full, unfiltered submission text.
 *
 * The requested JSON schema maps directly to the `SessionAnalysis` type in
 * `types/index.ts`. Strict schema instructions are included in the prompt itself
 * (not just the system instruction) to reduce hallucinated field names.
 *
 * @param speakerName - Guest speaker's name, used as context for blind-spot detection
 * @param sessionOutput - The AI-generated markdown interview sheet for this session
 * @param submissions - Array of raw student submissions with student names
 * @returns            - Fully formatted prompt string ready to send to Gemini
 */
/**
 * Constructs the Gemini prompt for whole-session analysis.
 *
 * The prompt embeds both the AI-generated interview sheet (already theme-grouped)
 * and the raw student submissions. This dual-context approach lets Gemini use
 * the interview sheet's theme titles as anchors for cluster assignment while
 * still reasoning over the full, unfiltered submission text.
 *
 * The requested JSON schema maps directly to the `SessionAnalysis` type in
 * `types/index.ts`. Strict schema instructions are included in the prompt itself
 * (not just the system instruction) to reduce hallucinated field names.
 *
 * @param speakerName - Guest speaker's name, used as context for blind-spot detection
 * @param sessionOutput - The AI-generated markdown interview sheet for this session
 * @param submissions - Array of raw student submissions with student names
 * @returns            - Fully formatted prompt string ready to send to Gemini
 */
function buildSessionAnalysisPrompt(
  speakerName: string,
  sessionOutput: string,
  submissions: Array<{ student_name: string; submission_text: string }>
): string {
  // Format submissions as labeled paragraphs so the model can attribute findings
  const submissionsText = submissions
    .map((s) => `[${s.student_name}]: ${s.submission_text}`)
    .join('\n\n')

  return `You are analyzing student questions submitted before a guest speaker session for a university management class.

Speaker: ${speakerName}

The AI-generated interview sheet (which already grouped questions into themes) is below:
---
${sessionOutput}
---

Raw student submissions (${submissions.length} total):
---
${submissionsText}
---

Analyze the student submissions and return a JSON object with EXACTLY this structure:
{
  "theme_clusters": [
    {
      "name": "string — theme title from the interview sheet",
      "question_count": number,
      "top_question": "string — the single best/most representative raw question text",
      "questions": [
        { "text": "string — raw question text", "student_name": "string" }
      ]
    }
  ],
  "tensions": [
    {
      "label": "string — 2-4 words naming the tension, e.g. 'Passion vs Pragmatism'",
      "description": "string — one sentence describing what this tension reveals about student thinking"
    }
  ],
  "suggestions": [
    {
      "text": "string — specific interview angle or follow-up to suggest",
      "reason": "string — short reason why (e.g. '→ 9 questions in Career Pivots cluster')"
    }
  ],
  "blind_spots": [
    {
      "title": "string — short topic name",
      "description": "string — one sentence explaining why it matters for this speaker"
    }
  ],
  "sentiment": {
    "aspirational": number,
    "curious": number,
    "personal": number,
    "critical": number
  }
}

Rules:
- theme_clusters: include ALL themes from the interview sheet, map each student submission to its closest theme. question_count is the number of submissions in that cluster.
- tensions: identify 2–3 underlying contradictions across ALL submissions (not per theme).
- suggestions: exactly 3 suggestions, each grounded in the data.
- blind_spots: 2–3 topics the speaker is known for that NO students asked about.
- sentiment: percentages of submissions that are primarily aspirational / curious-analytical / personal-life-advice / critical-challenging. Must sum to 100.
- Return ONLY valid JSON. No markdown fences, no explanation text.`
}

/**
 * Runs Gemini analysis over all submissions for a single session, returning
 * structured insights that power the Analysis and Insights tabs on the Preview page.
 *
 * The response is requested as `application/json` MIME type to prevent Gemini
 * from wrapping the JSON in markdown fences. The raw text is still `.trim()`-ed
 * before parsing as a safety measure.
 *
 * This function does NOT persist the result — persistence is handled by
 * `lib/ai/generateSessionAnalysis.ts` which wraps this call with a DB write.
 * Direct callers (the API route POST handler) handle persistence themselves.
 *
 * Uses: lib/ai/geminiClient.ts — never instantiate GoogleGenAI directly
 *
 * Called by: lib/ai/generateSessionAnalysis.ts,
 *            app/api/sessions/[id]/analysis/route.ts (POST)
 *
 * @param speakerName  - Guest speaker's name (used as blind-spot context)
 * @param sessionOutput - The markdown interview sheet for this session
 * @param submissions   - Raw student submissions array
 * @returns             - Parsed `SessionAnalysis` object
 * @throws              - JSON.parse will throw if Gemini returns malformed JSON
 */
/**
 * Runs Gemini analysis over all submissions for a single session, returning
 * structured insights that power the Analysis and Insights tabs on the Preview page.
 *
 * The response is requested as `application/json` MIME type to prevent Gemini
 * from wrapping the JSON in markdown fences. The raw text is still `.trim()`-ed
 * before parsing as a safety measure.
 *
 * This function does NOT persist the result — persistence is handled by
 * `lib/ai/generateSessionAnalysis.ts` which wraps this call with a DB write.
 * Direct callers (the API route POST handler) handle persistence themselves.
 *
 * Uses: lib/ai/geminiClient.ts — never instantiate GoogleGenAI directly
 *
 * Called by: lib/ai/generateSessionAnalysis.ts,
 *             app/api/sessions/[id]/analysis/route.ts (POST)
 *
 * @param speakerName  - Guest speaker's name (used as blind-spot context)
 * @param sessionOutput - The markdown interview sheet for this session
 * @param submissions   - Raw student submissions array
 * @returns             - Parsed `SessionAnalysis` object
 * @throws              - JSON.parse will throw if Gemini returns malformed JSON
 */
export async function runSessionAnalysis(
  speakerName: string,
  sessionOutput: string,
  submissions: Array<{ student_name: string; submission_text: string }>
): Promise<SessionAnalysis> {
  // Uses: lib/ai/geminiClient.ts — never instantiate GoogleGenAI directly
  const ai = getGeminiClient()
  const model = getGeminiModel()

  const response = await ai.models.generateContent({
    model,
    contents: buildSessionAnalysisPrompt(speakerName, sessionOutput, submissions),
    config: {
      systemInstruction: 'You are an expert at analyzing student questions for university professors. Always respond with valid JSON only.',
      // Requesting JSON MIME type suppresses markdown fences in the response
      responseMimeType: 'application/json',
    },
  })

  const raw = (response.text ?? '').trim()
  return JSON.parse(raw) as SessionAnalysis
}

// ---------------------------------------------------------------------------
// Theme deep-dive analysis
// ---------------------------------------------------------------------------

/**
 * Constructs the Gemini prompt for single-theme deep-dive analysis.
 *
 * Unlike the session-level prompt, this one focuses exclusively on the
 * questions assigned to one theme, asking Gemini to surface what students are
 * really asking beneath the surface-level text.
 *
 * @param themeName  - Theme title (e.g. "Leadership and Building Teams")
 * @param speakerName - Guest speaker's name (context for relevance)
 * @param questions   - Questions belonging to this theme with student attribution
 * @returns            - Fully formatted prompt string
 */
/**
 * Constructs the Gemini prompt for single-theme deep-dive analysis.
 *
 * Unlike the session-level prompt, this one focuses exclusively on the
 * questions assigned to one theme, asking Gemini to surface what students are
 * really asking beneath the surface-level text.
 *
 * @param themeName  - Theme title (e.g. "Leadership and Building Teams")
 * @param speakerName - Guest speaker's name (context for relevance)
 * @param questions   - Questions belonging to this theme with student attribution
 * @returns            - Fully formatted prompt string
 */
function buildThemeAnalysisPrompt(
  themeName: string,
  speakerName: string,
  questions: Array<{ text: string; student_name: string }>
): string {
  const questionsText = questions
    .map((q) => `[${q.student_name}]: ${q.text}`)
    .join('\n')

  return `You are doing a deep analysis of one specific theme cluster from a university guest speaker session.

Speaker: ${speakerName}
Theme: ${themeName}
Student questions in this theme (${questions.length} total):
---
${questionsText}
---

Return a JSON object with EXACTLY this structure:
{
  "narrative": "string — 2 paragraphs. First: what students are REALLY asking beneath the surface. Second: a key pattern or insight the professor should know.",
  "probe_questions": [
    {
      "question": "string — a follow-up question the professor could ask to go deeper",
      "why": "string — short reason why this probe matters (start with →)"
    }
  ],
  "missed_angles": [
    "string — an angle or sub-topic within this theme that students didn't ask about"
  ],
  "patterns": [
    {
      "emoji": "string — a single emoji that represents this pattern",
      "text": "string — one sentence describing a behavioral or linguistic pattern across these questions"
    }
  ]
}

Rules:
- probe_questions: exactly 3
- missed_angles: 2–3 items
- patterns: exactly 2–3 items
- emoji: must be a single emoji character, no text
- Return ONLY valid JSON. No markdown fences, no explanation.`
}

/**
 * Runs Gemini deep-dive analysis on a single theme cluster from one session.
 *
 * Powers the `/preview/theme` page, giving professors a richer view of what
 * students are really asking within a specific theme — including latent concerns,
 * follow-up probe questions, and missed angles.
 *
 * Uses: lib/ai/geminiClient.ts — never instantiate GoogleGenAI directly
 *
 * Called by: app/api/sessions/[id]/theme-analysis/route.ts
 *
 * @param themeName  - The theme title to analyze (matches `session_themes.title`)
 * @param speakerName - Guest speaker's name
 * @param questions   - Questions in this theme cluster with student attribution
 * @returns            - Parsed `ThemeAnalysis` object
 * @throws             - JSON.parse will throw if Gemini returns malformed JSON
 */
/**
 * Runs Gemini deep-dive analysis on a single theme cluster from one session.
 *
 * Powers the `/preview/theme` page, giving professors a richer view of what
 * students are really asking within a specific theme — including latent concerns,
 * follow-up probe questions, and missed angles.
 *
 * Uses: lib/ai/geminiClient.ts — never instantiate GoogleGenAI directly
 *
 * Called by: app/api/sessions/[id]/theme-analysis/route.ts
 *
 * @param themeName  - The theme title to analyze (matches `session_themes.title`)
 * @param speakerName - Guest speaker's name
 * @param questions   - Questions in this theme cluster with student attribution
 * @returns            - Parsed `ThemeAnalysis` object
 * @throws             - JSON.parse will throw if Gemini returns malformed JSON
 */
export async function runThemeAnalysis(
  themeName: string,
  speakerName: string,
  questions: Array<{ text: string; student_name: string }>
): Promise<ThemeAnalysis> {
  // Uses: lib/ai/geminiClient.ts — never instantiate GoogleGenAI directly
  const ai = getGeminiClient()
  const model = getGeminiModel()

  const response = await ai.models.generateContent({
    model,
    contents: buildThemeAnalysisPrompt(themeName, speakerName, questions),
    config: {
      systemInstruction: 'You are an expert at analyzing student questions for university professors. Always respond with valid JSON only.',
      responseMimeType: 'application/json',
    },
  })

  const raw = (response.text ?? '').trim()
  return JSON.parse(raw) as ThemeAnalysis
}

// ---------------------------------------------------------------------------
// Cross-session Theme analysis
// ---------------------------------------------------------------------------

/**
 * Constructs the Gemini prompt for cross-session theme analysis.
 *
 * This prompt receives questions from multiple sessions — each labeled with
 * both the student name and the speaker name — so Gemini can trace patterns
 * across speakers over time rather than within a single session.
 *
 * An important nuance: the input questions are pulled by broad text-similarity
 * matching (not hard-assigned theme labels), so the model is explicitly
 * instructed to filter out loosely-related questions itself before writing
 * the analysis.
 *
 * @param themeName - The cross-session theme being analyzed
 * @param questions - Questions from multiple sessions, each tagged with session_id and speaker_name
 * @returns          - Fully formatted prompt string
 */
/**
 * Constructs the Gemini prompt for cross-session theme analysis.
 *
 * This prompt receives questions from multiple sessions — each labeled with
 * both the student name and the speaker name — so Gemini can trace patterns
 * across speakers over time rather than within a single session.
 *
 * An important nuance: the input questions are pulled by broad text-similarity
 * matching (not hard-assigned theme labels), so the model is explicitly
 * instructed to filter out loosely-related questions itself before writing
 * the analysis.
 *
 * @param themeName - The cross-session theme being analyzed
 * @param questions - Questions from multiple sessions, each tagged with session_id and speaker_name
 * @returns          - Fully formatted prompt string
 */
function buildCrossSessionThemeAnalysisPrompt(
  themeName: string,
  questions: Array<{ text: string; student_name: string; session_id: string; speaker_name: string }>
): string {
  // Include speaker name in each line so the model can attribute patterns to specific sessions
  const questionsText = questions
    .map((q) => `[${q.speaker_name}] [${q.student_name}]: ${q.text}`)
    .join('\n')

  return `You are doing a deep analysis of a core theme that has emerged across multiple university guest speaker sessions.

Theme: ${themeName}
All student questions potentially related to this theme (${questions.length} total):
---
${questionsText}
---

Your task:
1. Review all the provided questions. Some may be loosely related, some very directly related.
2. Select only the questions that are truly relevant to the core theme.
3. Write a compelling analysis.

Return a JSON object with EXACTLY this structure:
{
  "narrative": "string — 2 paragraphs analyzing what students are consistently asking about this theme across different speakers. What is the underlying curiosity or anxiety?",
  "patterns": [
    {
      "emoji": "string — a single emoji",
      "text": "string — one sentence describing a specific pattern or sub-theme"
    }
  ],
  "missed_angles": [
    "string — what aspects of this theme are students failing to ask about?"
  ],
  "relevant_questions": [
    {
      "student_name": "string",
      "text": "string",
      "speaker_name": "string"
    }
  ]
}

Rules:
- relevant_questions: Include ONLY the questions from the input list that strongly match the theme.
- patterns: exactly 2-3 items
- missed_angles: exactly 2 items
- Return ONLY valid JSON. No markdown fences, no explanation.`
}

/**
 * Runs Gemini analysis across questions from multiple sessions that share a
 * common theme, identifying longitudinal patterns in student curiosity.
 *
 * This is a more expensive call than single-session analysis because it
 * processes questions spanning all of a professor's sessions. Results are
 * cached by the calling API route to avoid repeated Gemini calls.
 *
 * The model is asked to self-filter the input — questions are provided by
 * rough theme match, but the model returns only the truly relevant ones in
 * `relevant_questions`, giving callers a clean subset to display.
 *
 * Uses: lib/ai/geminiClient.ts — never instantiate GoogleGenAI directly
 *
 * Called by: app/api/analytics/themes/route.ts
 *
 * @param themeName - The overarching theme name (e.g. "Leadership")
 * @param questions - Candidate questions from all sessions, tagged with session/speaker context
 * @returns          - Parsed `CrossSessionThemeAnalysis` object including self-filtered `relevant_questions`
 * @throws           - JSON.parse will throw if Gemini returns malformed JSON
 */
/**
 * Runs Gemini analysis across questions from multiple sessions that share a
 * common theme, identifying longitudinal patterns in student curiosity.
 *
 * This is a more expensive call than single-session analysis because it
 * processes questions spanning all of a professor's sessions. Results are
 * cached by the calling API route to avoid repeated Gemini calls.
 *
 * The model is asked to self-filter the input — questions are provided by
 * rough theme match, but the model returns only the truly relevant ones in
 * `relevant_questions`, giving callers a clean subset to display.
 *
 * Uses: lib/ai/geminiClient.ts — never instantiate GoogleGenAI directly
 *
 * Called by: app/api/analytics/themes/route.ts
 *
 * @param themeName - The overarching theme name (e.g. "Leadership")
 * @param questions - Candidate questions from all sessions, tagged with session/speaker context
 * @returns          - Parsed `CrossSessionThemeAnalysis` object including self-filtered `relevant_questions`
 * @throws           - JSON.parse will throw if Gemini returns malformed JSON
 */
export async function runCrossSessionThemeAnalysis(
  themeName: string,
  questions: Array<{ text: string; student_name: string; session_id: string; speaker_name: string }>
): Promise<CrossSessionThemeAnalysis> {
  // Uses: lib/ai/geminiClient.ts — never instantiate GoogleGenAI directly
  const ai = getGeminiClient()
  const model = getGeminiModel()

  const response = await ai.models.generateContent({
    model,
    contents: buildCrossSessionThemeAnalysisPrompt(themeName, questions),
    config: {
      systemInstruction: 'You are an expert at analyzing student questions across multiple sessions. Always respond with valid JSON only.',
      responseMimeType: 'application/json',
    },
  })

  const raw = (response.text ?? '').trim()
  return JSON.parse(raw) as CrossSessionThemeAnalysis
}
