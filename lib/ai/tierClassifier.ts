/**
 * lib/ai/tierClassifier.ts
 *
 * Classifies every question in a session's AI-generated interview sheet into
 * one of four quality tiers (Tier 1–4) using Google Gemini.
 *
 * The tier system is a pedagogical quality rubric developed for this course:
 *  - Tier 1: Tension/Trade-off — the highest quality; exposes real dilemmas
 *  - Tier 2: Specific experience — asks about a concrete moment or decision
 *  - Tier 3: Strategic insight — asks how the speaker thinks or what they've learned
 *  - Tier 4: Generic advice — the lowest quality; could be asked of anyone
 *
 * This classification runs as a fire-and-forget job after session generation
 * (via `classifyAndStoreTiers`) so it does not block the professor from seeing
 * results. The stored tier data powers the quality visualization on the `/preview`
 * page and feeds into the analytics dashboard.
 *
 * A standard 10-section interview sheet has 20 questions (1 primary + 1 backup per
 * section), so tierCounts should sum to 20 for a complete classification.
 *
 * Uses: lib/ai/geminiClient.ts, lib/db/tierData.ts
 * Called by: app/api/process/route.ts (fire-and-forget after session save)
 *            app/api/sessions/[id]/rerun/route.ts (re-classification after rerun)
 * Persists to: session_tier_data table via lib/db/tierData.ts
 */

import { getGeminiClient, getGeminiModel } from '@/lib/ai/geminiClient'
import type { TierData } from '@/types'
import { upsertTierData } from '@/lib/db/tierData'

/**
 * Authoritative tier definitions passed verbatim to Gemini in every prompt.
 * Defined as a module-level constant so the rubric is never accidentally altered
 * between the two prompt-building and classification paths.
 */
const TIER_DEFINITIONS = `
Tier 1 — Tension/Trade-off questions: Questions that expose a real dilemma, difficult decision, or uncomfortable truth.
Tier 2 — Specific experience questions: Questions that ask about a specific moment, turning point, failure, or decision.
Tier 3 — Strategic insight questions: Questions about how they think, what frameworks they use, what they've learned.
Tier 4 — Generic advice questions: "What advice would you give?" or "What's your morning routine?" Generic questions.
`

/**
 * Constructs the Gemini prompt for question tier classification.
 *
 * Provides Gemini with both the tier definitions and the full interview sheet
 * markdown so it can assign every Primary and Backup question to a tier.
 * The expected output is a structured JSON object with tierCounts and
 * tierAssignments, enabling per-question granularity in the analytics.
 *
 * @param speakerName - The speaker's name (used for context in the prompt)
 * @param output - The full AI-generated interview sheet markdown
 * @returns A fully-formed prompt string ready for Gemini content generation
 */
function buildPrompt(speakerName: string, output: string): string {
  return `You are an expert at evaluating the quality of student interview questions for a guest speaker series.

Given the tier definitions below and a generated interview sheet for ${speakerName}, classify each question (both Primary and Backup) into Tier 1, 2, 3, or 4.

## Tier Definitions
${TIER_DEFINITIONS}

## Interview Sheet
${output}

Return a JSON object with this exact structure:
{
  "tierCounts": { "1": <count>, "2": <count>, "3": <count>, "4": <count> },
  "tierAssignments": [
    {
      "tier": <1|2|3|4>,
      "themeNumber": <section number 1-10>,
      "themeTitle": "<section title>",
      "questionType": "primary" | "backup",
      "studentName": "<student attribution>"
    }
  ]
}

Rules:
- Classify every Primary and Backup question (should be 20 total for a standard 10-section sheet)
- tierCounts should sum to the total number of questions classified
- Be strict: only Tier 1 if it truly exposes a tension or trade-off
- Tier 4 is for genuinely generic questions only`
}

/**
 * Classifies all questions in a session's AI-generated interview sheet into
 * Tier 1–4 quality tiers using Gemini.
 *
 * Returns a `TierData` object with:
 *  - tierCounts: total number of questions in each tier (should sum to ~20)
 *  - tierAssignments: per-question records with tier, theme number, theme title,
 *    question type (primary/backup), and student attribution
 *
 * Defensive parsing is applied: markdown code fences are stripped before JSON.parse
 * in case Gemini wraps the response despite responseMimeType: 'application/json'.
 * Nullish coalescing ensures a valid TierData shape even if Gemini omits a field.
 *
 * This is the lower-level primitive; prefer `classifyAndStoreTiers` for the
 * full fire-and-forget pipeline that also persists to the database.
 *
 * @param speakerName - The speaker's name (context for the prompt)
 * @param output - The full AI-generated interview sheet markdown
 * @returns Parsed TierData object with tierCounts and tierAssignments
 *
 * Uses: lib/ai/geminiClient.ts
 * Called by: classifyAndStoreTiers (this file)
 */
export async function classifyQuestionTiers(
  speakerName: string,
  output: string
): Promise<TierData> {
  // Uses: lib/ai/geminiClient.ts
  const ai = getGeminiClient()

  const response = await ai.models.generateContent({
    model: getGeminiModel(),
    contents: buildPrompt(speakerName, output),
    config: {
      // Force JSON response to avoid markdown fences or prose wrapping the output
      responseMimeType: 'application/json',
      systemInstruction:
        'You are an expert educational data analyst. Always respond with valid JSON matching the requested schema exactly.',
    },
  })

  // Strip markdown fences defensively — responseMimeType: 'application/json' should
  // prevent them, but Gemini has been observed wrapping JSON in ```json...``` blocks.
  const raw = (response.text ?? '').trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()

  const parsed = JSON.parse(raw) as Partial<TierData>

  // Ensure a valid TierData shape even if Gemini omits a field
  return {
    tierCounts: parsed.tierCounts ?? {},
    tierAssignments: parsed.tierAssignments ?? [],
  }
}

/**
 * Fire-and-forget orchestrator: classifies question tiers and persists the
 * result to the `session_tier_data` table.
 *
 * This is the top-level entry point called from the session processing pipeline.
 * It wraps `classifyQuestionTiers` (the Gemini call) and `upsertTierData` (the DB
 * write) into a single void function suitable for non-blocking execution.
 *
 * Because this is fire-and-forget, callers should NOT await it on the critical
 * path. Any errors will surface as unhandled promise rejections unless the caller
 * wraps in a try/catch.
 *
 * @param sessionId - The session UUID to associate tier data with
 * @param speakerName - The speaker's name (context for classification)
 * @param output - The full AI-generated interview sheet markdown
 *
 * Uses: lib/db/tierData.ts
 * Called by: app/api/process/route.ts (after session save, fire-and-forget)
 *            app/api/sessions/[id]/rerun/route.ts (after rerun, fire-and-forget)
 * Persists to: session_tier_data table via lib/db/tierData.ts
 */
export async function classifyAndStoreTiers(
  sessionId: string,
  speakerName: string,
  output: string
): Promise<void> {
  const tierData = await classifyQuestionTiers(speakerName, output)
  // Uses: lib/db/tierData.ts
  await upsertTierData(sessionId, tierData)
}
