/**
 * @file lib/ai/comparisonAgent.ts
 *
 * Side-by-side comparative analysis of two guest speaker sessions.
 *
 * When a professor compares two sessions, this agent synthesizes the structured
 * metadata from both (themes, sentiment, tier quality, participation overlap) into
 * a narrative analysis that surfaces insights only visible when viewing the sessions
 * together — e.g., which speaker triggered more critical questioning, how student
 * participation patterns shifted, or whether the same themes recurred with different
 * emotional tones.
 *
 * ## Where it fits
 * - Called by: app/api/compare/analysis/route.ts (awaited — result returned to client)
 * - The calling route pre-computes sharedThemes, uniqueThemes, and participation stats
 *   from the DB before invoking this agent; this agent's job is narrative synthesis only
 * - Output type: `ComparativeAnalysis` (lib/types/session.ts)
 *
 * ## NOT fire-and-forget
 * The caller awaits this function and returns the result directly in the API response.
 * The result is cached to `saved_comparisons` by the calling route.
 *
 * Uses: lib/ai/geminiClient.ts
 */

import { getGeminiClient, getGeminiModel } from '@/lib/ai/geminiClient'
import type { ComparativeAnalysis, SessionAnalysis, SessionTierData } from '@/types'

/**
 * Structured input bundle pre-assembled by the calling route.
 * Theme overlap, unique themes, and participation counts are computed from DB data
 * before being passed here — this agent receives the already-joined stats rather
 * than raw session rows, which keeps AI prompting fast and deterministic.
 */
/**
 * Structured input bundle pre-assembled by the calling route.
 * What it does: Defines the shape of the data required for the comparative analysis agent, encompassing details of two guest speaker sessions along with pre-computed comparative statistics.
 * Why it is used: To provide a type-safe and consistent interface for the data passed to the AI comparison agent. By pre-assembling and computing statistics (like theme overlap, unique themes, and participation counts) outside of this agent, it ensures that the AI prompting process is fast, deterministic, and receives all necessary context efficiently.
 * Important implementation details:
 * - Theme overlap, unique themes, and participation counts are explicitly noted as being computed from DB data *before* being passed to this agent, avoiding redundant computation within the AI context.
 * - Includes optional fields (`sentimentA/B`, `tierDataA/B`) that can be `null`, indicating that these asynchronous analyses might not yet be available for older sessions.
 * - Acts as a clear contract for the data required by the `buildComparisonPrompt` function.
 */
interface ComparisonInput {
  speakerA: string
  speakerB: string
  dateA: string
  dateB: string
  submissionCountA: number
  submissionCountB: number
  themesA: string[]
  themesB: string[]
  /** Pairs of semantically similar themes, one from each session */
  sharedThemes: Array<{ themeA: string; themeB: string }>
  /** Themes that appeared only in session A */
  uniqueThemesA: string[]
  /** Themes that appeared only in session B */
  uniqueThemesB: string[]
  /** Gemini session-analysis sentiment breakdown for session A, or null if not yet generated */
  sentimentA: SessionAnalysis['sentiment'] | null
  /** Gemini session-analysis sentiment breakdown for session B, or null if not yet generated */
  sentimentB: SessionAnalysis['sentiment'] | null
  /** Tier classification data for session A, or null if not yet generated */
  tierDataA: SessionTierData | null
  /** Tier classification data for session B, or null if not yet generated */
  tierDataB: SessionTierData | null
  /** Number of students who submitted for BOTH sessions */
  participationOverlap: number
  /** Students who submitted only for session A */
  participationOnlyA: number
  /** Students who submitted only for session B */
  participationOnlyB: number
  /** Total unique students across both sessions */
  totalStudents: number
}

/**
 * Builds the Gemini prompt for comparative session analysis.
 *
 * Formats both sessions in parallel sections so Gemini can directly compare them.
 * Conditionally includes sentiment and tier quality sections — both are generated
 * asynchronously after session upload, so they may not be present for older sessions.
 *
 * The tier framework (Tier 1–4) is embedded in the prompt to give Gemini context
 * for interpreting the tier counts when drawing quality comparisons.
 *
 * @param input - Pre-assembled comparison data from the calling route
 * @returns The full prompt string to send to Gemini
 */
/**
 * Builds the Gemini prompt for comparative session analysis.
 * What it does: Constructs a comprehensive, natural language prompt string that encapsulates all the provided `ComparisonInput` data, specifically formatted for the Gemini AI model to perform a detailed comparative analysis.
 * Why it is used: To translate structured application data into an effective conversational input for the AI. It ensures that the Gemini model receives all necessary context, including domain-specific frameworks (like the Tier Quality Framework), to generate relevant and insightful comparisons.
 * Important implementation details:
 * - Formats both sessions (A and B) in distinct, parallel sections within the prompt, enabling Gemini to directly compare their attributes.
 * - Conditionally includes sentiment and tier quality sections using helper functions (`sentimentSection`, `tierSection`). This gracefully handles cases where this data might not be available (e.g., for older sessions or if generation failed).
 * - Embeds the detailed "Tier Quality Framework" (Tier 1–4 definitions) directly into the prompt. This provides Gemini with the necessary pedagogical context to interpret the `tierData` counts and draw meaningful conclusions about question quality.
 * - Explicitly defines the desired JSON output structure, including specific rules for the number of items in certain arrays, guiding the AI to produce a consistent and parseable result.
 */
function buildComparisonPrompt(input: ComparisonInput): string {
  // Helper: format sentiment percentages for prompt inclusion, or report "not available"
  const sentimentSection = (label: string, s: SessionAnalysis['sentiment'] | null) =>
    s
      ? `${label}: aspirational=${s.aspirational}%, curious=${s.curious}%, personal=${s.personal}%, critical=${s.critical}%`
      : `${label}: not available`

  // Helper: format tier counts for prompt inclusion; null means tierClassifier hasn't run yet
  const tierSection = (label: string, td: SessionTierData | null) => {
    if (!td) return `${label}: not available`
    const c = td.tierCounts
    return `${label}: Tier 1=${c['1'] ?? 0}, Tier 2=${c['2'] ?? 0}, Tier 3=${c['3'] ?? 0}, Tier 4=${c['4'] ?? 0}`
  }

  return `You are an expert at comparative analysis of university guest speaker sessions for a management class.

Compare these two sessions:

## Session A: ${input.speakerA}
- Date: ${input.dateA}
- Submissions: ${input.submissionCountA} students
- Themes: ${input.themesA.join(', ')}
- ${sentimentSection('Sentiment', input.sentimentA)}
- ${tierSection('Question Quality', input.tierDataA)}

## Session B: ${input.speakerB}
- Date: ${input.dateB}
- Submissions: ${input.submissionCountB} students
- Themes: ${input.themesB.join(', ')}
- ${sentimentSection('Sentiment', input.sentimentB)}
- ${tierSection('Question Quality', input.tierDataB)}

## Theme Overlap
Shared themes (appeared in both): ${input.sharedThemes.map(s => `"${s.themeA}" ↔ "${s.themeB}"`).join(', ') || 'none'}
Unique to ${input.speakerA}: ${input.uniqueThemesA.join(', ') || 'none'}
Unique to ${input.speakerB}: ${input.uniqueThemesB.join(', ') || 'none'}

## Participation
${input.participationOverlap} of ${input.totalStudents} students submitted for both sessions.
${input.participationOnlyA} students only submitted for ${input.speakerA}.
${input.participationOnlyB} students only submitted for ${input.speakerB}.

## Tier Quality Framework
- Tier 1 — Tension/Trade-off questions: Expose a real dilemma, difficult decision, or uncomfortable truth. These are gold.
- Tier 2 — Specific experience questions: Ask about a specific moment, turning point, failure, or decision.
- Tier 3 — Strategic insight questions: About how they think, frameworks, industry lessons.
- Tier 4 — Generic advice questions: "What advice would you give?" Generic questions.

Return a JSON object with EXACTLY this structure:
{
  "narrative": "string — 2-3 paragraphs synthesizing what this comparison reveals about pedagogical effectiveness. Go beyond restating numbers — provide genuine insight about what types of speakers, topics, or approaches generate stronger intellectual engagement.",
  "key_differences": [
    {
      "title": "string — short title for this difference",
      "description": "string — 1-2 sentences explaining the difference and its significance",
      "dimension": "themes" | "sentiment" | "participation" | "quality" | "engagement"
    }
  ],
  "sentiment_shift": {
    "summary": "string — one sentence summarizing how student sentiment differed between sessions",
    "notable_changes": [
      {
        "dimension": "string — sentiment category",
        "direction": "up" | "down" | "stable",
        "detail": "string — what this shift suggests"
      }
    ]
  },
  "recommendations": [
    {
      "text": "string — specific, actionable recommendation for future sessions",
      "reason": "string — grounded in the comparison data"
    }
  ]
}

Rules:
- key_differences: exactly 3-5 items. Surface patterns NOT visible from viewing sessions individually.
- recommendations: exactly 2-3 items. Must be specific and actionable.
- sentiment_shift.notable_changes: 2-4 items.
- The narrative must provide genuine insight, not just restate the numbers.
- Return ONLY valid JSON. No markdown fences, no explanation text.`
}

/**
 * Runs a side-by-side comparative analysis of two guest speaker sessions and
 * returns a structured `ComparativeAnalysis` result with narrative, key differences,
 * sentiment shift, and actionable recommendations.
 *
 * The analysis surfaces cross-session patterns that are NOT visible when looking at
 * either session in isolation — e.g., recurring themes with different emotional
 * tones, shifts in question quality tier distribution, or participation changes.
 *
 * NOT fire-and-forget: the calling route awaits this and returns the result to the
 * client, then caches it to `saved_comparisons`.
 *
 * Called by: app/api/compare/analysis/route.ts
 * Uses: lib/ai/geminiClient.ts
 *
 * @param input - Pre-assembled comparison data including themes, sentiment, tier
 *                quality, and participation stats for both sessions
 * @returns Structured comparative analysis with narrative, key_differences,
 *          sentiment_shift, and recommendations
 * @throws If Gemini returns invalid JSON or an error response
 */
/**
 * Runs a side-by-side comparative analysis of two guest speaker sessions and returns a structured `ComparativeAnalysis` result.
 * What it does: Orchestrates the entire comparative analysis process by obtaining the Gemini AI client, building the prompt from the input data, sending the prompt to Gemini, and parsing the AI's JSON response into a structured `ComparativeAnalysis` object.
 * Why it is used: To provide deep, AI-powered insights into the pedagogical effectiveness and engagement patterns between different guest speaker sessions. It surfaces cross-session patterns (e.g., shifts in sentiment, question quality, or participation) that are not evident from viewing individual session data, offering actionable intelligence for educators.
 * Important implementation details:
 * - It's an `async` function, reflecting its interaction with an external AI service.
 * - Leverages `getGeminiClient()` and `getGeminiModel()` from `@/lib/ai/geminiClient` to interact with the Gemini API.
 * - Calls `buildComparisonPrompt(input)` to generate the detailed prompt string, delegating the prompt construction logic.
 * - Configures the Gemini API call with a `systemInstruction` for role definition and `responseMimeType: 'application/json'`. This crucial setting ensures the AI returns pure JSON without markdown fences, simplifying parsing.
 * - Parses the AI's raw text response directly into the `ComparativeAnalysis` type, assuming the `responseMimeType` configuration successfully enforces JSON output.
 * - The function is designed to be awaited by the calling route (e.g., `app/api/compare/analysis/route.ts`), which then returns the result to the client and caches it, indicating its role in a request-response cycle and data persistence strategy.
 * - Handles potential parsing issues by trimming the response and attempting `JSON.parse`.
 */
export async function runComparativeAnalysis(
  input: ComparisonInput
): Promise<ComparativeAnalysis> {
  const ai = getGeminiClient()
  const model = getGeminiModel()

  const response = await ai.models.generateContent({
    model,
    contents: buildComparisonPrompt(input),
    config: {
      systemInstruction:
        'You are an expert educational data analyst specializing in comparative analysis. Always respond with valid JSON matching the requested schema exactly.',
      responseMimeType: 'application/json',
    },
  })

  // responseMimeType: 'application/json' suppresses markdown fences, so raw JSON is safe to parse directly
  const raw = (response.text ?? '').trim()
  return JSON.parse(raw) as ComparativeAnalysis
}
