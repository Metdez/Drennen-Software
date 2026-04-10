/**
 * lib/ai/speakerAnalysisEvaluation.ts
 *
 * Evaluates student speaker analysis submissions using Gemini AI.
 *
 * After a guest speaker session, students submit formal analytical assignments
 * evaluating the speaker's message, leadership style, communication approach,
 * and connections to course concepts. This is distinct from debrief reflections
 * (lib/ai/debriefReflectionAnalysis.ts) — these are structured academic
 * evaluations assessing critical thinking skills, not personal reflections.
 *
 * The evaluation produces a `StudentSpeakerAnalysis` object that gives the
 * professor a synthesized view of:
 *  - How students evaluated the speaker across key dimensions (evaluation_themes)
 *  - Which leadership qualities students identified in the speaker
 *  - How students connected the session to course concepts and frameworks
 *  - Where students agreed and diverged in their assessments
 *  - The overall analytical sophistication of the cohort (high/moderate/surface)
 *  - Notable observations demonstrating advanced critical thinking
 *
 * This analysis feeds into:
 *  1. The synthesis agent (lib/ai/synthesisAgent.ts) as the `speakerAnalysis` input
 *  2. The post-session portal feedback (lib/ai/speakerPortalPostSession.ts) indirectly
 *     via student reflection themes stored in student_speaker_analyses table
 *
 * Data flow:
 *  - Submissions come from the student_speaker_analysis_submissions table
 *  - Results are stored in the student_speaker_analyses table
 *  - Triggered from app/api/sessions/[id]/speaker-analyses/route.ts (POST handler)
 *
 * Uses: lib/ai/geminiClient.ts
 * Called by: app/api/sessions/[id]/speaker-analyses/route.ts (POST handler)
 * Persists to: student_speaker_analyses table (caller's responsibility)
 */

import { getGeminiClient, getGeminiModel } from '@/lib/ai/geminiClient'
import type { StudentSpeakerAnalysis } from '@/types'

/**
 * Constructs the Gemini prompt for evaluating student speaker analysis submissions.
 *
 * Formats all student submissions with their names as attribution markers so
 * Gemini can produce named quotes. The student names are included deliberately
 * here (unlike the speaker-facing brief/portal) because the output is private
 * to the professor — it's a professor-facing analytical report.
 *
 * @param speakerName - The name of the evaluated speaker
 * @param submissions - Array of student name + submission text pairs
 * @returns A fully-formed prompt string ready for Gemini content generation
 */
/**
 * Constructs the Gemini prompt for evaluating student speaker analysis submissions.
 *
 * Formats all student submissions with their names as attribution markers so
 * Gemini can produce named quotes. The student names are included deliberately
 * here (unlike the speaker-facing brief/portal) because the output is private
 * to the professor — it's a professor-facing analytical report.
 *
 * @param speakerName - The name of the evaluated speaker
 * @param submissions - Array of student name + submission text pairs
 * @returns A fully-formed prompt string ready for Gemini content generation
 */
function buildSpeakerAnalysisPrompt(
  speakerName: string,
  submissions: Array<{ student_name: string; submission_text: string }>
): string {
  const submissionsText = submissions
    .map((s) => `[${s.student_name}]: ${s.submission_text}`)
    .join('\n\n')

  return `You are analyzing student speaker evaluation analyses for a university management class. These are NOT casual reflections or pre-session questions — they are structured analytical evaluations written AFTER a guest speaker session. Students are evaluating the speaker's message, leadership style, communication approach, and how the speaker's experience connects to course concepts. This is a formal analytical assignment assessing critical thinking.

Speaker: ${speakerName}

Student speaker analyses (${submissions.length} total):
---
${submissionsText}
---

Analyze all student speaker evaluations and return a JSON object with EXACTLY this structure:
{
  "evaluation_themes": [
    {
      "name": "string — theme name (e.g. 'Servant Leadership Style', 'Data-Driven Decision Making')",
      "description": "string — 1-2 sentences summarizing what students observed about this aspect of the speaker",
      "student_count": number,
      "quotes": [
        { "text": "string — direct quote or close paraphrase from a student", "student_name": "string" }
      ]
    }
  ],
  "leadership_qualities": [
    {
      "quality": "string — the leadership quality identified (e.g. 'Resilience', 'Emotional Intelligence')",
      "description": "string — how students described this quality in the speaker",
      "mentioned_by": number,
      "quotes": [
        { "text": "string — student quote illustrating this quality", "student_name": "string" }
      ]
    }
  ],
  "course_concept_connections": [
    {
      "concept": "string — the course concept referenced (e.g. 'Transformational Leadership', 'Stakeholder Theory')",
      "student_count": number,
      "examples": [
        { "text": "string — how the student connected the concept to the speaker", "student_name": "string" }
      ]
    }
  ],
  "areas_of_agreement": [
    {
      "point": "string — something most students agreed on about the speaker",
      "student_count": number,
      "sentiment": "positive" | "negative" | "neutral"
    }
  ],
  "areas_of_disagreement": [
    {
      "point": "string — an aspect of the speaker where students had differing assessments",
      "perspectives": [
        { "position": "string — one student's take", "student_name": "string" }
      ]
    }
  ],
  "analytical_sophistication": {
    "high": number,
    "moderate": number,
    "surface": number,
    "summary": "string — 1-2 sentences assessing the overall depth of the cohort's analytical thinking"
  },
  "notable_observations": [
    {
      "text": "string — a particularly insightful or unique observation from a student",
      "student_name": "string",
      "why_notable": "string — why this observation stands out"
    }
  ],
  "summary": "string — 2-3 paragraph narrative: what aspects of the speaker students focused on most, the overall quality of analytical thinking, key patterns in how students evaluated the speaker, and what the professor should know about the cohort's critical evaluation skills"
}

Rules:
- evaluation_themes: identify 4-8 major themes in how students evaluated the speaker. Include 1-3 representative quotes per theme. student_count is the number of students who addressed this theme.
- leadership_qualities: specific leadership traits or qualities students identified in the speaker. Include up to 6. Each should have 1-2 supporting quotes.
- course_concept_connections: management/leadership course concepts students explicitly connected to the speaker. Include up to 8. Each should have 1-2 examples.
- areas_of_agreement: 3-5 points where the majority of students converged in their assessment.
- areas_of_disagreement: 2-4 points where students had meaningfully different evaluations. Include 2-3 contrasting perspectives per point.
- analytical_sophistication: percentage of student analyses that demonstrate high (nuanced, multi-dimensional, uses course frameworks), moderate (solid observations but limited depth), or surface-level (descriptive only, no critical analysis) thinking. Must sum to 100.
- notable_observations: up to 5 observations that are particularly insightful, original, or demonstrate advanced critical thinking.
- summary: write as if briefing the professor. Be specific — reference actual patterns from the data. Focus on what the analyses reveal about students' developing critical thinking skills.
- Return ONLY valid JSON. No markdown fences, no explanation text.`
}

/**
 * Evaluates a cohort's student speaker analysis submissions using Gemini.
 *
 * Analyzes all student submissions holistically (not one at a time) to surface
 * cross-student patterns, consensus points, disagreements, and standout critical
 * thinking. The analysis is designed to help the professor understand the
 * cohort's analytical depth and provide tailored feedback at scale.
 *
 * Returns a structured `StudentSpeakerAnalysis` object with:
 *  - evaluation_themes: 4-8 major evaluation dimensions with representative quotes
 *  - leadership_qualities: traits students identified in the speaker
 *  - course_concept_connections: frameworks students explicitly referenced
 *  - areas_of_agreement: points where the majority converged
 *  - areas_of_disagreement: aspects where students diverged meaningfully
 *  - analytical_sophistication: high/moderate/surface breakdown (must sum to 100)
 *  - notable_observations: up to 5 standout observations with why_notable context
 *  - summary: 2-3 paragraph professor briefing narrative
 *
 * Caller is responsible for persisting the result to the
 * `student_speaker_analyses` table via the API route handler.
 *
 * @param speakerName - The name of the speaker being evaluated
 * @param submissions - Array of student name + submission text pairs
 * @returns Parsed StudentSpeakerAnalysis JSON object
 *
 * Uses: lib/ai/geminiClient.ts
 * Called by: app/api/sessions/[id]/speaker-analyses/route.ts (POST handler)
 * Persists to: student_speaker_analyses table (caller's responsibility)
 */
/**
 * Evaluates a cohort's student speaker analysis submissions using Gemini.
 *
 * Analyzes all student submissions holistically (not one at a time) to surface
 * cross-student patterns, consensus points, disagreements, and standout critical
 * thinking. The analysis is designed to help the professor understand the
 * cohort's analytical depth and provide tailored feedback at scale.
 *
 * Returns a structured `StudentSpeakerAnalysis` object with:
 *  - evaluation_themes: 4-8 major evaluation dimensions with representative quotes
 *  - leadership_qualities: traits students identified in the speaker
 *  - course_concept_connections: frameworks students explicitly referenced
 *  - areas_of_agreement: points where the majority converged
 *  - areas_of_disagreement: aspects where students diverged meaningfully
 *  - analytical_sophistication: high/moderate/surface breakdown (must sum to 100)
 *  - notable_observations: up to 5 standout observations with why_notable context
 *  - summary: 2-3 paragraph professor briefing narrative
 *
 * Caller is responsible for persisting the result to the
 * `student_speaker_analyses` table via the API route handler.
 *
 * @param speakerName - The name of the speaker being evaluated
 * @param submissions - Array of student name + submission text pairs
 * @returns Parsed StudentSpeakerAnalysis JSON object
 *
 * Uses: lib/ai/geminiClient.ts
 * Called by: app/api/sessions/[id]/speaker-analyses/route.ts (POST handler)
 * Persists to: student_speaker_analyses table (caller's responsibility)
 */
export async function runSpeakerAnalysisEvaluation(
  speakerName: string,
  submissions: Array<{ student_name: string; submission_text: string }>
): Promise<StudentSpeakerAnalysis> {
  // Uses: lib/ai/geminiClient.ts
  const ai = getGeminiClient()
  const model = getGeminiModel()

  const response = await ai.models.generateContent({
    model,
    contents: buildSpeakerAnalysisPrompt(speakerName, submissions),
    config: {
      systemInstruction: 'You are an expert at analyzing student analytical evaluations of guest speakers for university professors. Always respond with valid JSON only.',
      // Force JSON response to avoid markdown fences or prose wrapping the output
      responseMimeType: 'application/json',
    },
  })

  // response.text is the raw JSON string; trim and parse directly
  const raw = (response.text ?? '').trim()
  return JSON.parse(raw) as StudentSpeakerAnalysis
}
