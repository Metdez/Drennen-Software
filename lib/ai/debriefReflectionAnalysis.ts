/**
 * lib/ai/debriefReflectionAnalysis.ts
 *
 * Analyzes student post-session debrief reflections using Gemini AI.
 *
 * After a guest speaker session, students submit personal reflective narratives
 * about what resonated, what surprised them, what they're still thinking about,
 * and how it connects to their career goals. This is distinct from speaker
 * analysis evaluations (lib/ai/speakerAnalysisEvaluation.ts) — reflections are
 * informal, emotional, and career-focused rather than structured academic critiques.
 *
 * The analysis synthesizes the cohort's reflections into a `StudentDebriefAnalysis`
 * object that gives the professor a synthesized view of:
 *  - Dominant reflection themes (what stuck with students)
 *  - Key session moments that multiple students referenced
 *  - Surprising or assumption-challenging moments
 *  - Career connection patterns (what paths students are envisioning)
 *  - Post-session sentiment distribution (inspired / reflective / challenged / indifferent)
 *
 * This analysis feeds into three downstream consumers:
 *  1. The synthesis agent (lib/ai/synthesisAgent.ts) as the `debriefAnalysis` input
 *  2. The post-session speaker portal (lib/ai/speakerPortalPostSession.ts) via
 *     the anonymized reflection_themes and summary fields
 *  3. The speaker recommendations agent (lib/ai/speakerRecommendations.ts) via
 *     studentReflectionThemes stored on the InsightsInput session objects
 *
 * Data flow:
 *  - Submissions come from the student_debrief_submissions table
 *  - Results are stored in the student_debrief_analyses table
 *  - Triggered from app/api/sessions/[id]/student-debriefs/route.ts (POST handler)
 *
 * Uses: lib/ai/geminiClient.ts
 * Called by: app/api/sessions/[id]/student-debriefs/route.ts (POST handler)
 * Persists to: student_debrief_analyses table (caller's responsibility)
 */

import { getGeminiClient, getGeminiModel } from '@/lib/ai/geminiClient'
import type { StudentDebriefAnalysis } from '@/types'

/**
 * Constructs the Gemini prompt for analyzing student post-session debrief reflections.
 *
 * Formats submissions with student name attribution markers so Gemini can produce
 * attributed quotes in the output. The output is professor-facing only (never shared
 * with speakers or students), so including student names here is appropriate.
 *
 * @param speakerName - The name of the speaker the reflections are about
 * @param submissions - Array of student name + reflection text pairs
 * @returns A fully-formed prompt string ready for Gemini content generation
 */
/**
 * Constructs the Gemini prompt for analyzing student post-session debrief reflections.
 *
 * What it does:
 * It formats individual student reflection submissions, attributing each to its student, and embeds them within a comprehensive prompt for the Gemini AI.
 *
 * Why it is used:
 * This function is crucial for preparing the input to the Gemini AI, ensuring the AI receives all necessary context and instructions to perform a detailed analysis of student debriefs. It explicitly defines the desired output structure (a complex JSON object) and the rules for generating its content.
 *
 * Important implementation details:
 * - It formats each student's submission as `[student_name]: submission_text` to enable Gemini to attribute quotes in its analysis. Student names are included because the output is exclusively for professors.
 * - The prompt text meticulously defines a `StudentDebriefAnalysis` JSON schema that the AI must adhere to, including specific fields like `reflection_themes`, `key_moments`, `surprises`, `career_connections`, `sentiment`, and an overall `summary`.
 * - It provides detailed rules for populating each field, such as the number of themes, quotes per theme, and the sentiment percentages summing to 100.
 * - It explicitly instructs the AI to return "ONLY valid JSON. No markdown fences, no explanation text" to ensure a clean, parseable response.
 */
function buildDebriefReflectionPrompt(
  speakerName: string,
  submissions: Array<{ student_name: string; submission_text: string }>
): string {
  const submissionsText = submissions
    .map((s) => `[${s.student_name}]: ${s.submission_text}`)
    .join('\n\n')

  return `You are analyzing student post-session debrief reflections for a university management class. These are NOT questions — they are reflective narratives written AFTER a guest speaker session. Students write about what resonated, what surprised them, what they're still thinking about, and how it connects to their career goals.

Speaker: ${speakerName}

Student reflections (${submissions.length} total):
---
${submissionsText}
---

Analyze all student reflections and return a JSON object with EXACTLY this structure:
{
  "reflection_themes": [
    {
      "name": "string — theme name (e.g. 'Authenticity in Leadership')",
      "description": "string — 1-2 sentences summarizing what students reflected on in this theme",
      "student_count": number,
      "quotes": [
        { "text": "string — direct quote or close paraphrase from a student", "student_name": "string" }
      ]
    }
  ],
  "key_moments": [
    {
      "moment": "string — a specific moment, idea, or quote from the session that students mentioned",
      "mentioned_by": number,
      "sentiment": "positive" | "neutral" | "mixed"
    }
  ],
  "surprises": [
    { "text": "string — what surprised the student and why", "student_name": "string" }
  ],
  "career_connections": [
    { "text": "string — how the student connected the session to their career path", "student_name": "string", "career_area": "string — e.g. 'consulting', 'entrepreneurship', 'tech'" }
  ],
  "sentiment": {
    "inspired": number,
    "reflective": number,
    "challenged": number,
    "indifferent": number
  },
  "summary": "string — 2-3 paragraph narrative: what overall landed with students, what the key takeaways were, and what the professor should know about how the session was received"
}

Rules:
- reflection_themes: identify 4-8 major themes from the reflections. Include 1-3 representative quotes per theme. student_count is the number of students who touched on this theme.
- key_moments: specific moments, stories, or ideas from the speaker session that multiple students referenced. Ranked by frequency.
- surprises: things students explicitly said surprised them or challenged their assumptions. Include up to 5.
- career_connections: how students are connecting the session to their own career trajectories. Include up to 5.
- sentiment: percentage of reflections that are primarily inspired/energized, thoughtfully reflective, intellectually challenged, or indifferent/disengaged. Must sum to 100.
- summary: write as if briefing the professor. Be specific — reference actual patterns from the data.
- Return ONLY valid JSON. No markdown fences, no explanation text.`
}

/**
 * Analyzes a cohort's student post-session debrief reflections using Gemini.
 *
 * Processes all submissions holistically to surface cross-student patterns
 * rather than evaluating individual submissions. The professor receives a
 * synthesized picture of how the session landed emotionally and intellectually.
 *
 * Returns a structured `StudentDebriefAnalysis` object with:
 *  - reflection_themes: 4-8 major themes with student counts and representative quotes
 *  - key_moments: specific session moments referenced by multiple students
 *  - surprises: things that challenged student assumptions (up to 5)
 *  - career_connections: how students mapped the session to their own trajectories (up to 5)
 *  - sentiment: inspired/reflective/challenged/indifferent percentage breakdown (sums to 100)
 *  - summary: 2-3 paragraph professor briefing narrative
 *
 * The summary and reflection_themes are deliberately reused by downstream consumers
 * (speakerPortalPostSession.ts, speakerRecommendations.ts) as anonymized signals
 * about what resonated with the class.
 *
 * Caller is responsible for persisting the result to the
 * `student_debrief_analyses` table via the API route handler.
 *
 * @param speakerName - The name of the speaker the reflections are about
 * @param submissions - Array of student name + reflection text pairs
 * @returns Parsed StudentDebriefAnalysis JSON object
 *
 * Uses: lib/ai/geminiClient.ts
 * Called by: app/api/sessions/[id]/student-debriefs/route.ts (POST handler)
 * Persists to: student_debrief_analyses table (caller's responsibility)
 */
/**
 * Analyzes a cohort's student post-session debrief reflections using the Gemini AI.
 *
 * What it does:
 * This function orchestrates the AI analysis process. It takes a speaker's name and an array of student reflections, constructs an AI prompt, sends it to the Gemini model, and then parses the AI's structured JSON response into a `StudentDebriefAnalysis` object. It focuses on surfacing cross-student patterns and a synthesized view of the session's impact.
 *
 * Why it is used:
 * It is used to automate the complex task of analyzing qualitative student feedback, transforming raw reflections into actionable insights for professors. This saves significant manual effort and provides a consistent, AI-generated summary of how guest speaker sessions resonated emotionally and intellectually with students, which can inform future curriculum and speaker selections.
 *
 * Important implementation details:
 * - It initializes the Gemini client and model using `getGeminiClient` and `getGeminiModel` from `lib/ai/geminiClient.ts`.
 * - It utilizes `buildDebriefReflectionPrompt` to construct the detailed prompt, ensuring the AI receives all necessary context and output requirements.
 * - A critical configuration for the AI call includes `systemInstruction` (setting the AI's persona) and `responseMimeType: 'application/json'` to enforce a pure JSON output, preventing markdown fences or conversational text from wrapping the response.
 * - The function explicitly handles parsing the raw text response from the AI as JSON, including trimming potential whitespace.
 * - The resulting `StudentDebriefAnalysis` object has a strictly defined structure, and certain parts (like `summary` and `reflection_themes`) are designed for reuse by downstream components such as `speakerPortalPostSession.ts` and `speakerRecommendations.ts`.
 * - The responsibility for persisting the generated analysis to the `student_debrief_analyses` table is explicitly placed on the caller (e.g., an API route handler), not within this function.
 */
export async function runDebriefReflectionAnalysis(
  speakerName: string,
  submissions: Array<{ student_name: string; submission_text: string }>
): Promise<StudentDebriefAnalysis> {
  // Uses: lib/ai/geminiClient.ts
  const ai = getGeminiClient()
  const model = getGeminiModel()

  const response = await ai.models.generateContent({
    model,
    contents: buildDebriefReflectionPrompt(speakerName, submissions),
    config: {
      systemInstruction: 'You are an expert at analyzing student reflections for university professors. Always respond with valid JSON only.',
      // Force JSON response to avoid markdown fences or prose wrapping the output
      responseMimeType: 'application/json',
    },
  })

  // response.text is the raw JSON string; trim and parse directly
  const raw = (response.text ?? '').trim()
  return JSON.parse(raw) as StudentDebriefAnalysis
}
