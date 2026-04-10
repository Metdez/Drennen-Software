/**
 * @file lib/ai/semesterComparison.ts
 *
 * Generates a plain-text narrative comparing student engagement and theme patterns
 * across multiple semesters (cohorts) for a single professor.
 *
 * Where `comparisonAgent.ts` compares two individual sessions side-by-side, this
 * module zooms out to the semester level: it answers questions like "how did Spring
 * 2025 students differ from Fall 2025 in the topics they cared about?" and "which
 * themes are persistent across all cohorts vs. unique to a specific semester?"
 *
 * ## Where it fits
 * - Called by: app/api/semesters/compare/route.ts (awaited — result returned to client)
 * - Input data (`CohortComparisonData`) is pre-assembled by `lib/db/semesterComparison.ts`
 *   before this agent is invoked; theme persistence stats are computed from DB, not by AI
 * - Output: plain-text narrative prose (no JSON), returned directly to the route
 *
 * ## Error handling
 * Unlike most agents, this function catches its own errors and returns a fallback
 * string rather than throwing. This prevents the compare page from hard-failing
 * when the AI narrative can't be generated — the quantitative data still renders.
 *
 * Uses: lib/ai/geminiClient.ts
 */

import { getGeminiClient, getGeminiModel } from '@/lib/ai/geminiClient'
import type { CohortComparisonData } from '@/types/comparison'

/**
 * Builds the Gemini prompt for cross-semester cohort comparison.
 *
 * Three JSON blocks are embedded in the prompt:
 * 1. `semesterSummaries` — aggregate stats per semester (session/student counts,
 *    average submissions, top themes). Derived from ground-truth DB data.
 * 2. `persistentThemes` — themes that appeared in more than one semester, ranked
 *    by total occurrence count. Limited to 15 entries for token efficiency.
 * 3. `uniquePerSemester` — up to 5 themes that appeared exclusively in each semester,
 *    helping the AI highlight what made each cohort distinctive.
 *
 * The prompt instructs Gemini to write flowing prose (no bullets) because the output
 * is rendered as a narrative paragraph in the compare page UI.
 *
 * @param data - Pre-assembled cohort comparison data from lib/db/semesterComparison.ts
 * @returns The full prompt string to send to Gemini
 */
/**
 * Builds the Gemini prompt for cross-semester cohort comparison.
 *
 * What it does: This function constructs a detailed prompt string tailored for the Gemini AI model. It embeds three distinct JSON blocks containing aggregated data about various academic semesters and their associated themes.
 *
 * Why it is used: The prompt serves as the primary input for the Gemini AI, guiding it to generate a concise, narrative comparison of student engagement and evolving academic themes across different cohorts. By structuring the data and providing explicit instructions, it ensures the AI focuses on key metrics and produces output suitable for direct display in the UI.
 *
 * Important implementation details:
 * 1.  Three JSON blocks are embedded in the prompt:
 *     *   `semesterSummaries`: Aggregate statistics per semester (session/student counts, average submissions, top themes), derived from ground-truth database data.
 *     *   `persistentThemes`: Themes that appeared in more than one semester, ranked by total occurrence count. These are limited to 15 entries for token efficiency.
 *     *   `uniquePerSemester`: Up to 5 themes that appeared exclusively in each semester, designed to help the AI highlight what made each cohort distinctive.
 * 2.  The `persistentThemes` are filtered to only include themes present in 2 or more semesters and then truncated to the top 15 to manage AI token limits.
 * 3.  `uniquePerSemester` themes are filtered to those appearing in exactly one semester and capped at 5 per semester name.
 * 4.  The prompt explicitly instructs Gemini to write flowing prose without bullet points, as the output is rendered as a narrative paragraph in the compare page UI, requiring a natural language flow.
 */
function buildPrompt(data: CohortComparisonData): string {
  const semesterSummaries = data.semesters.map(s => ({
    name: s.name,
    sessionCount: s.sessionCount,
    studentCount: s.studentCount,
    avgSubmissions: s.avgSubmissions,
    topThemes: s.topThemes,
  }))

  // Only include themes that appear across 2+ semesters; cap at 15 to stay within token budget
  const persistentThemes = data.themePersistence
    .filter(t => t.semesterIds.length > 1)
    .slice(0, 15)
    .map(t => ({
      theme: t.theme,
      appearsInSemesters: t.semesterIds.length,
      totalOccurrences: t.totalOccurrences,
    }))

  // Per-semester unique themes: only themes exclusive to exactly one semester, capped at 5 per semester
  const uniquePerSemester = data.semesters.map(s => {
    const onlyHere = data.themePersistence
      .filter(t => t.semesterIds.length === 1 && t.semesterIds[0] === s.id)
      .map(t => t.theme)
      .slice(0, 5)
    return { semester: s.name, uniqueThemes: onlyHere }
  })

  return `You are an expert curriculum analyst helping a university professor compare student engagement across multiple semesters/cohorts.

Given the following semester data, write a concise narrative (3-5 sentences) comparing these cohorts. Focus on:
- How student engagement (session counts, submission rates) differs across semesters
- Which themes persist across cohorts vs. which are unique to specific semesters
- What these patterns suggest about evolving student interests or course improvements
- Any notable trends (growing participation, shifting topic focus, etc.)

Semester data:
${JSON.stringify(semesterSummaries, null, 2)}

Themes that persist across multiple semesters:
${JSON.stringify(persistentThemes, null, 2)}

Themes unique to specific semesters:
${JSON.stringify(uniquePerSemester, null, 2)}

Write a clear, actionable narrative for the professor. Be specific — name actual themes and semesters. Do not use bullet points; write flowing prose.`
}

/**
 * Generates a plain-text narrative comparing student engagement and theme patterns
 * across the provided semesters.
 *
 * Unlike most agents, this function catches and swallows its own errors, returning a
 * user-friendly fallback string instead of throwing. This design choice lets the
 * compare page degrade gracefully — the quantitative comparison table still renders
 * even if the narrative AI call fails (e.g., due to a temporary Gemini outage).
 *
 * Called by: app/api/semesters/compare/route.ts
 * Uses: lib/ai/geminiClient.ts
 * NOT fire-and-forget: the caller awaits this, but a failure returns a fallback string
 * rather than propagating an exception.
 *
 * @param data - Pre-assembled cohort comparison data including per-semester stats
 *               and theme persistence counts from lib/db/semesterComparison.ts
 * @returns Plain-text narrative prose (3-5 sentences) comparing the cohorts, or a
 *          fallback error string if generation fails
 */
/**
 * Generates a plain-text narrative comparing student engagement and theme patterns across the provided semesters using the Gemini AI.
 *
 * What it does: This asynchronous function orchestrates the entire AI-driven comparison process. It first builds the necessary prompt using the input data, then sends this prompt to the Gemini AI model, processes the AI's response, and returns a generated narrative. It also includes robust error handling.
 *
 * Why it is used: This function provides a qualitative, AI-generated summary of complex quantitative data (like student engagement and theme persistence). It offers a professor an easily digestible narrative overview of trends and differences between academic cohorts, complementing raw data tables with interpretive prose.
 *
 * Important implementation details:
 * 1.  It utilizes `getGeminiClient()` and `getGeminiModel()` from `@/lib/ai/geminiClient` to interact with the Gemini API.
 * 2.  A `systemInstruction` is provided to Gemini, establishing the AI's persona as an "expert educational data analyst" and ensuring the response is "Plain text only, no markdown formatting."
 * 3.  Crucially, unlike most AI agents, this function catches and explicitly swallows its own errors (e.g., network issues, API failures, or empty responses from Gemini). Instead of throwing an exception, it returns a user-friendly fallback string. This design ensures the compare page UI can degrade gracefully, allowing the quantitative comparison table to render even if the AI narrative generation fails.
 * 4.  It includes a specific guard against empty responses from the Gemini model, which can occasionally occur on low-confidence inputs, returning a dedicated fallback message in such cases.
 * 5.  The function is called by API routes (e.g., `app/api/semesters/compare/route.ts`) and awaits its completion, but its error-handling strategy prevents exceptions from propagating up the call stack.
 */
export async function generateCohortComparison(data: CohortComparisonData): Promise<string> {
  try {
    const ai = getGeminiClient()

    const response = await ai.models.generateContent({
      model: getGeminiModel(),
      contents: buildPrompt(data),
      config: {
        systemInstruction:
          'You are an expert educational data analyst. Respond with a concise narrative paragraph comparing the given semesters. Plain text only, no markdown formatting.',
      },
    })

    const text = (response.text ?? '').trim()
    // Guard against empty responses — Gemini occasionally returns nothing on low-confidence inputs
    if (!text) {
      return 'AI narrative could not be generated. The model returned an empty response.'
    }

    return text
  } catch (err) {
    // Swallow the error so the compare page can still render its quantitative data
    console.error('[semesterComparison] Gemini generation failed:', err)
    return 'AI narrative could not be generated at this time. Please try again later.'
  }
}
