/**
 * lib/ai/synthesisAgent.ts
 *
 * Synthesizes data across all three phases of a guest speaker session into a unified
 * cross-phase intelligence report using Google Gemini.
 *
 * The three phases are:
 *   1. Pre-session: AI-generated interview sheet (the questions students asked before
 *      the speaker visited) plus session analysis (theme clusters, tensions, sentiment)
 *   2. Post-session debrief: student personal reflections on what resonated, what
 *      surprised them, career connections (analyzed by debriefReflectionAnalysis.ts)
 *   3. Post-session speaker analysis: structured academic evaluations of the speaker's
 *      leadership style and course concept connections (analyzed by speakerAnalysisEvaluation.ts)
 *
 * The synthesis connects the dots between phases — for example, identifying whether
 * themes students were curious about pre-session were actually addressed, which topics
 * emerged only after the session, and how emotional tone shifted from anticipation to
 * reflection. The output reads like a "session report card" for the professor.
 *
 * Data is optional: only the pre-session output is always present. Debrief and
 * speaker analysis data may be absent if students haven't submitted yet. The agent
 * explicitly marks missing data types rather than hallucinating.
 *
 * AI Provider: Google Gemini (via geminiClient singleton)
 *
 * Key callers:
 *   - app/api/sessions/[id]/synthesis/route.ts (GET triggers generation if not cached;
 *     POST triggers fresh generation)
 *
 * Output is persisted to the session_syntheses table by the calling route.
 */

import { getGeminiClient, getGeminiModel } from '@/lib/ai/geminiClient'
import type {
  SessionAnalysis,
  StudentDebriefAnalysis,
  StudentSpeakerAnalysis,
  SessionSynthesis,
} from '@/types'

/**
 * All data inputs available for synthesis.
 * Only sessionOutput is required — the three analysis fields are optional because
 * post-session data may not exist yet when the professor first views the synthesis tab.
 */
/**
 * All data inputs available for the session synthesis process.
 *
 * It aggregates information from various stages of a university guest speaker session.
 * Only `sessionOutput` is required, as it's always available after session creation. The three analysis fields (`questionsAnalysis`, `debriefAnalysis`, `speakerAnalysis`) are optional because post-session data may not exist yet when a professor first views the synthesis tab, allowing for incremental analysis as data becomes available.
 *
 * This interface serves as the primary input for the `buildSynthesisPrompt` and `runSessionSynthesis` functions, bundling all necessary information for the AI model to perform a comprehensive synthesis.
 */
export interface SynthesisInput {
  speakerName: string
  /** Raw AI-generated interview sheet markdown — always available after session creation */
  sessionOutput: string
  /** Gemini session analysis (theme clusters, tensions, sentiment) — null if not yet generated */
  questionsAnalysis: SessionAnalysis | null
  /** Analyzed student debrief reflections — null if no student debriefs submitted yet */
  debriefAnalysis: StudentDebriefAnalysis | null
  /** Analyzed student speaker evaluations — null if no student analyses submitted yet */
  speakerAnalysis: StudentSpeakerAnalysis | null
}

/**
 * Constructs the Gemini prompt for session synthesis.
 *
 * Assembles a multi-section prompt that feeds all available data types to Gemini
 * in clearly-labelled blocks (PRE-SESSION vs POST-SESSION). This sectioned format
 * helps Gemini track which phase each piece of data came from, which is critical
 * for cross-phase comparisons like curiosity_resolution and tone_shift.
 *
 * The prompt explicitly lists which data types are absent and instructs Gemini
 * NOT to hallucinate data for missing types — instead marking them unavailable in
 * the data_completeness field of the output.
 *
 * @param input - SynthesisInput bundle with optional post-session analysis fields
 * @returns A fully-formed prompt string ready for Gemini content generation
 */
/**
 * Constructs the Gemini prompt for session synthesis by assembling all available data into a structured, multi-section prompt string.
 *
 * It is used to prepare the input for the Gemini AI model, ensuring that all relevant information—from pre-session interview sheets and questions analysis to post-session student debriefs and speaker evaluations—is presented clearly and logically.
 *
 * Important implementation details:
 * - The prompt is divided into clearly-labelled blocks (e.g., `PRE-SESSION`, `POST-SESSION`) to help Gemini track the origin phase of each data piece, which is crucial for cross-phase comparisons (e.g., `curiosity_resolution`, `tone_shift`).
 * - It explicitly lists which data types are absent and instructs Gemini NOT to hallucinate data for missing types, instead guiding it to mark them as unavailable in the output's `data_completeness` field.
 * - Data is formatted into human-readable lists and summaries within each section (e.g., theme clusters, tensions, key moments) for clarity and ease of processing by the AI.
 */
function buildSynthesisPrompt(input: SynthesisInput): string {
  const sections: string[] = []

  sections.push(`Speaker: ${input.speakerName}`)

  // The AI interview sheet (sessionOutput) is always present — it's generated
  // at session creation time and never nullable. This is the baseline data source.
  sections.push(`--- PRE-SESSION: AI Interview Sheet ---\n${input.sessionOutput}\n---`)

  // Append the per-session Gemini analysis if available. This comes from
  // lib/ai/analysisAgent.ts and provides theme clusters, tensions, and
  // pre-session sentiment — the raw signal of what students cared about beforehand.
  if (input.questionsAnalysis) {
    const qa = input.questionsAnalysis
    const themes = qa.theme_clusters.map(t => `- ${t.name} (${t.question_count} questions)`).join('\n')
    const tensions = qa.tensions.map(t => `- ${t.label}: ${t.description}`).join('\n')
    // sentiment is nullable on the type (older records may not have it)
    const sentiment = qa.sentiment
      ? `Aspirational: ${qa.sentiment.aspirational}%, Curious: ${qa.sentiment.curious}%, Personal: ${qa.sentiment.personal}%, Critical: ${qa.sentiment.critical}%`
      : 'N/A'

    sections.push(`--- PRE-SESSION: Questions Analysis ---
Theme clusters:\n${themes}

Underlying tensions:\n${tensions}

Pre-session sentiment: ${sentiment}
---`)
  }

  // Append student debrief reflection analysis if available. This comes from
  // lib/ai/debriefReflectionAnalysis.ts and represents the post-session emotional
  // and personal dimension — what resonated, what surprised students, career links.
  if (input.debriefAnalysis) {
    const da = input.debriefAnalysis
    const themes = da.reflection_themes.map(t => `- ${t.name}: ${t.description} (${t.student_count} students)`).join('\n')
    const moments = da.key_moments.map(m => `- ${m.moment} (mentioned by ${m.mentioned_by}, sentiment: ${m.sentiment})`).join('\n')
    const surprises = da.surprises.map(s => `- ${s.student_name}: ${s.text}`).join('\n')
    const sentiment = da.sentiment
      ? `Inspired: ${da.sentiment.inspired}%, Reflective: ${da.sentiment.reflective}%, Challenged: ${da.sentiment.challenged}%, Indifferent: ${da.sentiment.indifferent}%`
      : 'N/A'

    sections.push(`--- POST-SESSION: Student Debrief Reflections ---
Reflection themes:\n${themes}

Key moments:\n${moments}

Surprises:\n${surprises}

Post-session sentiment: ${sentiment}

Summary: ${da.summary}
---`)
  }

  // Append speaker analysis evaluation if available. This comes from
  // lib/ai/speakerAnalysisEvaluation.ts and represents the post-session analytical
  // dimension — formal evaluations of leadership qualities and course concept connections.
  if (input.speakerAnalysis) {
    const sa = input.speakerAnalysis
    const themes = sa.evaluation_themes.map(t => `- ${t.name}: ${t.description} (${t.student_count} students)`).join('\n')
    const qualities = sa.leadership_qualities.map(q => `- ${q.quality}: ${q.description} (${q.mentioned_by} students)`).join('\n')
    const concepts = sa.course_concept_connections.map(c => `- ${c.concept} (${c.student_count} students)`).join('\n')
    const agreement = sa.areas_of_agreement.map(a => `- ${a.point} (${a.student_count} students, ${a.sentiment})`).join('\n')
    const disagreement = sa.areas_of_disagreement.map(d => `- ${d.point}`).join('\n')

    sections.push(`--- POST-SESSION: Speaker Analysis Evaluations ---
Evaluation themes:\n${themes}

Leadership qualities identified:\n${qualities}

Course concept connections:\n${concepts}

Areas of agreement:\n${agreement}

Areas of disagreement:\n${disagreement}

Analytical sophistication: High ${sa.analytical_sophistication.high}%, Moderate ${sa.analytical_sophistication.moderate}%, Surface ${sa.analytical_sophistication.surface}%

Summary: ${sa.summary}
---`)
  }

  // Build explicit data availability manifest for Gemini.
  // This prevents the model from hallucinating cross-references to data types
  // that aren't present, while still instructing it to analyze what IS available.
  const availableTypes: string[] = ['questions']
  if (input.debriefAnalysis) availableTypes.push('debriefs')
  if (input.speakerAnalysis) availableTypes.push('speaker_analyses')
  const missingTypes: string[] = []
  if (!input.debriefAnalysis) missingTypes.push('debriefs')
  if (!input.speakerAnalysis) missingTypes.push('speaker_analyses')

  sections.push(`Available data types: ${availableTypes.join(', ')}`)
  if (missingTypes.length > 0) {
    sections.push(`Missing data types: ${missingTypes.join(', ')} — do NOT hallucinate data for these. Mark them as unavailable in your analysis.`)
  }

  // Join all labelled sections with double newlines for clear visual separation in the prompt
  return sections.join('\n\n')
}

/**
 * Module-level system instruction for the synthesis agent.
 *
 * Extracted as a named constant (rather than inlined in the function call) because:
 *  1. It's long enough to clutter the function body.
 *  2. It doubles as documentation of the full expected JSON output schema.
 *
 * The instruction defines 6 output fields and enforces cross-phase cross-referencing
 * in the narrative. The strict "do NOT fabricate" rule for missing data types is
 * reinforced both here and in the user prompt (belt-and-suspenders approach).
 */
/**
 * Module-level system instruction for the synthesis agent, defining its role and the precise structure of its expected JSON output.
 *
 * It is used to programmatically instruct the Gemini model on its task as an educational intelligence analyst and to enforce a strict JSON output schema.
 *
 * Important implementation details:
 * - Extracted as a named constant (rather than inlined in the function call) to improve readability of the `runSessionSynthesis` function and to serve as clear, self-documenting reference for the full expected JSON output schema.
 * - Defines 6 primary output fields (`narrative`, `curiosity_resolution`, `theme_evolution`, `emergent_themes`, `tone_shift`, `gaps`, `data_completeness`) and specifies rules for their content, including enforcing cross-phase cross-referencing.
 * - Reinforces the strict "do NOT fabricate" rule for missing data types, complementing the instruction provided in the user prompt (a "belt-and-suspenders" approach to prevent AI hallucination).
 */
const SYSTEM_INSTRUCTION = `You are an educational intelligence analyst synthesizing student data across multiple phases of a university guest speaker session. Your job is to connect the dots between what students asked BEFORE the session and what they observed/reflected on AFTER the session.

Respond with valid JSON only. No markdown, no explanation text, no code fences.

Return a JSON object with EXACTLY this structure:
{
  "narrative": "string — 3-4 paragraph executive summary that weaves together all available data types into a coherent story of what happened intellectually and emotionally during this session. Reference specific themes and patterns. This should read like a session report card.",

  "curiosity_resolution": [
    {
      "question_theme": "string — theme from the pre-session questions",
      "addressed": boolean,
      "evidence": "string — specific evidence from debriefs/analyses showing whether and how the speaker addressed this topic. If no post-session data is available for this theme, say so."
    }
  ],

  "theme_evolution": [
    {
      "theme": "string — a theme that appeared in at least one data source",
      "pre_session": "string or null — how this theme manifested in pre-session questions (null if not present)",
      "post_session": "string or null — how this theme manifested in post-session debriefs or analyses (null if not present)",
      "evolution": "string — narrative of how understanding of this theme shifted from before to after the session"
    }
  ],

  "emergent_themes": [
    {
      "theme": "string — theme that appeared ONLY in post-session data, not in pre-session questions",
      "source": "debriefs" or "speaker_analyses",
      "description": "string — what this theme is about and why it emerged",
      "student_count": number
    }
  ],

  "tone_shift": {
    "pre": { "dominant": "string — dominant emotional tone before session", "description": "string — 1 sentence" },
    "post": { "dominant": "string — dominant emotional tone after session", "description": "string — 1 sentence" },
    "shift_narrative": "string — 2-3 sentences describing the emotional arc from pre to post session"
  },

  "gaps": [
    {
      "theme": "string — theme that appeared in one data source but was absent from others",
      "present_in": ["questions" or "debriefs" or "speaker_analyses"],
      "absent_from": ["questions" or "debriefs" or "speaker_analyses"],
      "significance": "string — why this gap matters (e.g., 'suggests the speaker didn't cover this' or 'suggests it didn't resonate long-term')"
    }
  ],

  "data_completeness": {
    "has_questions": boolean,
    "has_debriefs": boolean,
    "has_speaker_analyses": boolean,
    "missing_note": "string or null — if any data type is missing, a brief note about what additional insights would be possible with it"
  }
}

Rules:
- curiosity_resolution: one entry per major question theme (up to 10). Only mark "addressed": true if you have concrete evidence from post-session data.
- theme_evolution: include themes that appeared in at least 2 data sources, showing how they changed. 4-8 entries.
- emergent_themes: only themes that appeared AFTER the session that were NOT asked about beforehand. 0-5 entries.
- tone_shift: compare the pre-session sentiment (from questions analysis) with post-session sentiment (from debriefs). If debriefs are not available, use speaker analysis tone.
- gaps: 2-5 entries of the most significant gaps.
- If a data type is missing, do NOT fabricate data for it. Instead, note what's missing and focus your analysis on the available cross-references.
- The narrative should explicitly call out cross-references between data types (e.g., "Students were curious about X in their questions, and 80% praised the speaker's handling of X in their analyses, but only 30% mentioned it in debriefs — suggesting it didn't stick long-term").
- Be specific. Use actual theme names and patterns from the data. Avoid generic statements.`

/**
 * Runs the session synthesis agent to produce a cross-phase intelligence report.
 *
 * Weaves together pre-session questions analysis, post-session student debrief
 * reflections, and post-session speaker analysis evaluations into a unified
 * `SessionSynthesis` object that answers: "What did students want to know,
 * what did the speaker deliver, and what actually stuck?"
 *
 * The output structure:
 *  - narrative: 3-4 paragraph session "report card" for the professor
 *  - curiosity_resolution: per-theme evidence of whether the speaker addressed it
 *  - theme_evolution: how key themes changed from pre- to post-session
 *  - emergent_themes: topics that only surfaced after the session
 *  - tone_shift: emotional arc from anticipation to reflection
 *  - gaps: themes present in one data source but absent from others
 *  - data_completeness: manifest of which data types were available
 *
 * Caller is responsible for persisting the result to the `session_syntheses`
 * table via `upsertSessionSynthesis` in lib/db/sessionSyntheses.ts.
 *
 * @param input - SynthesisInput bundle (questionsAnalysis always required;
 *   debriefAnalysis and speakerAnalysis are optional)
 * @returns Parsed SessionSynthesis JSON object
 *
 * Uses: lib/ai/geminiClient.ts
 * Called by: app/api/sessions/[id]/synthesis/route.ts (POST handler)
 * Persists to: session_syntheses table via lib/db/sessionSyntheses.ts (caller's responsibility)
 */
/**
 * Runs the session synthesis agent to produce a comprehensive cross-phase intelligence report on a university guest speaker session.
 *
 * This function is the core orchestrator for generating the `SessionSynthesis` output. It is used to transform raw and analyzed session data into a structured report that answers key questions like "What did students want to know, what did the speaker deliver, and what actually stuck?" This report provides professors with valuable insights into the session's intellectual and emotional impact.
 *
 * Important implementation details:
 * - It leverages `getGeminiClient` and `getGeminiModel` from `lib/ai/geminiClient` to interact with the Gemini AI.
 * - It calls `buildSynthesisPrompt` to construct the detailed user prompt containing all available session data.
 * - It applies `SYSTEM_INSTRUCTION` as the AI's guiding directive, ensuring the output adheres to the specified `SessionSynthesis` JSON schema.
 * - It forces a JSON response type (`responseMimeType: 'application/json'`) to prevent Gemini from wrapping the output in markdown fences or additional prose.
 * - The raw JSON string from Gemini is trimmed and parsed to produce the final `SessionSynthesis` object.
 * - The caller (e.g., `app/api/sessions/[id]/synthesis/route.ts`) is responsible for persisting the generated `SessionSynthesis` object to the database (e.g., via `upsertSessionSynthesis` in `lib/db/sessionSyntheses.ts`).
 */
export async function runSessionSynthesis(input: SynthesisInput): Promise<SessionSynthesis> {
  // Uses: lib/ai/geminiClient.ts
  const ai = getGeminiClient()
  const model = getGeminiModel()

  const response = await ai.models.generateContent({
    model,
    contents: buildSynthesisPrompt(input),
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      // Force JSON response to avoid markdown fences or prose wrapping the output
      responseMimeType: 'application/json',
    },
  })

  // response.text is the raw JSON string; trim and parse directly
  const raw = (response.text ?? '').trim()
  return JSON.parse(raw) as SessionSynthesis
}
