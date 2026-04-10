/**
 * @file lib/ai/debriefSummary.ts
 *
 * Generates a concise executive prose summary of a completed post-session debrief.
 *
 * The debrief is a professor-authored record created after a guest speaker session
 * ends. It captures which student questions "landed" (home run / solid / flat / unused),
 * professor notes on surprise moments, speaker feedback, and follow-up topics.
 *
 * When the professor clicks "Mark Complete", this module is called to synthesize all
 * of that structured debrief data into a short 3-5 sentence narrative summary that
 * is then stored in `session_debriefs.ai_summary` and surfaced in the UI alongside
 * the raw debrief fields.
 *
 * ## Where it fits
 * - Called by: app/api/sessions/[id]/debrief/complete/route.ts
 * - Persists to: `session_debriefs.ai_summary` (written by the calling route after
 *                this function returns)
 * - NOT fire-and-forget: the calling route awaits this and saves the result before
 *   responding to the client, because the summary is immediately displayed in the UI
 *
 * Uses: lib/ai/geminiClient.ts
 */

import { getGeminiClient, getGeminiModel } from '@/lib/ai/geminiClient'
import type { SessionDebrief, QuestionFeedback } from '@/types'

/**
 * Groups an array of question feedback items by their status bucket.
 *
 * Returns a Record keyed by status (`home_run`, `solid`, `flat`, `unused`),
 * where each value is an array of formatted strings like:
 *   `"What was your biggest leadership failure?" (Jake M.)`
 *
 * These strings are then concatenated into the prompt so Gemini can reference
 * specific questions and their attributed students in the summary.
 *
 * @param feedback - Array of per-question feedback entries from the debrief form
 * @returns Grouped question strings ready for prompt insertion
 */
/**
 * Groups an array of question feedback items by their status bucket.
 *
 * What it does: This function takes an array of `QuestionFeedback` objects and organizes them into an object where keys are status categories (`home_run`, `solid`, `flat`, `unused`) and values are arrays of formatted strings. Each string represents a question and its attribution, e.g., `"What was your biggest leadership failure?" (Jake M.)`.
 *
 * Why it is used: It pre-processes raw feedback data into a structured and human-readable format. This makes it easier to embed specific questions and their attributed students directly into the AI prompt, allowing the Gemini model to reference them effectively when generating the summary.
 *
 * Important implementation details:
 * - Initializes a `Record` with all four predefined status categories (`home_run`, `solid`, `flat`, `unused`) to ensure every bucket exists, even if empty.
 * - Iterates through each `QuestionFeedback` item and pushes a formatted string into the appropriate status array.
 * - Uses optional chaining (`groups[q.status]?.push`) for robust handling, though in this context, `q.status` is expected to always match one of the predefined keys.
 */
function groupByStatus(feedback: QuestionFeedback[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {
    home_run: [],
    solid: [],
    flat: [],
    unused: [],
  }
  for (const q of feedback) {
    groups[q.status]?.push(`"${q.questionText}" (${q.attribution})`)
  }
  return groups
}

/**
 * Builds the Gemini prompt for debrief summary generation.
 *
 * Maps the numeric 1-5 overall rating to a human-readable label so the AI
 * receives descriptive context ("Strong") rather than just a number ("4").
 * Conditionally includes optional debrief fields (surprise moments, speaker
 * feedback, student observations, follow-up topics) — only appended when present,
 * to keep the prompt clean when the professor didn't fill in every field.
 *
 * The prompt explicitly instructs Gemini to respond in plain prose (no JSON,
 * no markdown, no bullets) because this summary is rendered directly in the UI
 * as a paragraph of text.
 *
 * @param speakerName - The guest speaker's name
 * @param debrief - The full debrief record as stored in Supabase
 * @returns The full prompt string to send to Gemini
 */
/**
 * Builds the Gemini prompt for debrief summary generation.
 *
 * What it does: This function constructs a comprehensive prompt string that is sent to the Gemini AI model. It aggregates various pieces of debrief information, including the speaker's name, overall session rating, grouped question feedback, and optional free-text fields like surprise moments or student observations.
 *
 * Why it is used: To provide the Gemini model with rich, contextualized data from the session debrief. This enables the AI to generate an accurate, relevant, and well-informed summary. It translates numerical ratings into more descriptive labels and conditionally includes optional fields to maintain prompt clarity and conciseness.
 *
 * Important implementation details:
 * - Calls `groupByStatus` to organize and format question feedback, which is then embedded into the prompt.
 * - Maps the 1-5 numeric `overallRating` to a descriptive label (e.g., 'Strong', 'Disappointing') to provide richer, more qualitative context for the AI.
 * - Utilizes template literals with conditional logic (`${condition ? value : ''}`) to append optional debrief fields (surprise moments, speaker feedback, student observations, follow-up topics) only when they are present, preventing the prompt from becoming cluttered with empty sections.
 * - Explicitly instructs Gemini on the desired output format: plain prose (no JSON, no markdown, no bullets) and specifies key areas to cover, ensuring the summary is directly consumable by the UI as a paragraph of text.
 */
function buildPrompt(speakerName: string, debrief: SessionDebrief): string {
  const groups = groupByStatus(debrief.questionsFeedback)

  // Map 1-5 numeric rating to a descriptor for richer prompt context
  const ratingLabel = ['', 'Disappointing', 'Below Expectations', 'Solid', 'Strong', 'Exceptional'][
    debrief.overallRating ?? 0
  ] ?? 'Not rated'

  return `You are helping a university professor capture learnings from a guest speaker session.

Speaker: ${speakerName}
Overall Rating: ${debrief.overallRating ?? 'Not rated'}/5 (${ratingLabel})

Questions That Landed:
- HOME RUN (${groups.home_run.length}): ${groups.home_run.join('; ') || 'None'}
- SOLID (${groups.solid.length}): ${groups.solid.join('; ') || 'None'}
- FELL FLAT (${groups.flat.length}): ${groups.flat.join('; ') || 'None'}
- UNUSED (${groups.unused.length}): ${groups.unused.join('; ') || 'None'}

${debrief.surpriseMoments ? `Surprise Moments: ${debrief.surpriseMoments}` : ''}
${debrief.speakerFeedback ? `Speaker Feedback: ${debrief.speakerFeedback}` : ''}
${debrief.studentObservations.length > 0 ? `Student Observations:\n${debrief.studentObservations.map(o => `- ${o.studentName}: ${o.note}`).join('\n')}` : ''}
${debrief.followupTopics ? `Follow-up Topics: ${debrief.followupTopics}` : ''}

Write a concise 3-5 sentence executive debrief summary. Cover: (1) overall session quality, (2) what resonated most with the room, (3) any surprises or unexpected moments, (4) actionable takeaways for future sessions. Write in third person, professional tone. Do not use bullet points — write flowing prose.`
}

/**
 * Generates a 3-5 sentence executive prose summary of a completed debrief.
 *
 * Sends structured debrief data (question feedback, overall rating, observations)
 * to Gemini and returns the plain-text narrative response. The calling route is
 * responsible for persisting the returned string to `session_debriefs.ai_summary`.
 *
 * This is NOT fire-and-forget — the summary is immediately shown to the professor
 * in the UI, so the caller awaits this function before responding.
 *
 * Called by: app/api/sessions/[id]/debrief/complete/route.ts
 * Uses: lib/ai/geminiClient.ts
 *
 * @param speakerName - The guest speaker's name (for context in the summary)
 * @param debrief - The completed debrief record containing ratings, question feedback,
 *                  observations, and optional free-text fields
 * @returns Plain-text prose summary (3-5 sentences), trimmed
 */
/**
 * Generates a 3-5 sentence executive prose summary of a completed debrief.
 *
 * What it does: This asynchronous function orchestrates the end-to-end process of generating an AI-powered summary for a guest speaker session debrief. It takes the speaker's name and the full `SessionDebrief` record, constructs a detailed prompt using `buildPrompt`, sends this prompt to the Gemini AI model, and returns the AI's generated plain-text summary.
 *
 * Why it is used: To automate the creation of a concise, executive summary for professors, providing quick, actionable insights immediately after a debrief is completed. This summary is critical for streamlining the feedback process and is directly displayed in the application's user interface.
 *
 * Important implementation details:
 * - It is an `async` function, indicating interaction with an external API (Gemini).
 * - Retrieves the configured Gemini client and model using `getGeminiClient()` and `getGeminiModel()` from `@/lib/ai/geminiClient`.
 * - Sets a strict `systemInstruction` for the Gemini model, reinforcing its role as an 'expert educational analyst' and explicitly instructing it to respond with 'plain text only — no JSON, no markdown formatting, no bullet points', aligning with the UI's rendering requirements.
 * - Calls `buildPrompt` to dynamically create the request payload based on the debrief data.
 * - The AI's response is trimmed (`.trim()`) to remove any leading or trailing whitespace.
 * - This function is not 'fire-and-forget'; its caller (e.g., `app/api/sessions/[id]/debrief/complete/route.ts`) awaits its completion, and the resulting summary is immediately shown to the professor in the UI. The calling route is also responsible for persisting this summary to `session_debriefs.ai_summary` in the database.
 */
export async function generateDebriefSummary(
  speakerName: string,
  debrief: SessionDebrief,
): Promise<string> {
  const ai = getGeminiClient()

  const response = await ai.models.generateContent({
    model: getGeminiModel(),
    contents: buildPrompt(speakerName, debrief),
    config: {
      systemInstruction:
        'You are an expert educational analyst writing concise session debrief summaries. Respond with plain text only — no JSON, no markdown formatting, no bullet points.',
    },
  })

  return (response.text ?? '').trim()
}
