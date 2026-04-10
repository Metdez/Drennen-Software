/**
 * lib/ai/speakerBrief.ts
 *
 * Generates a polished, professional preparation brief intended to be sent
 * directly to an incoming guest speaker before their session with the class.
 *
 * Unlike the speaker portal (which is a self-service web view), the brief is
 * a downloadable document — think of it as a one-page briefing memo from the
 * professor to the speaker. It synthesizes student submission data into a warm,
 * executive-friendly narrative without exposing raw student question text or
 * internal scoring details.
 *
 * Inputs aggregated from:
 *  - Session metadata (speaker name, date, file count)
 *  - Session themes extracted from the AI interview sheet (session_themes table)
 *  - Per-session Gemini analysis (session_analyses table, via SanitizedAnalysis)
 *  - Cross-session class insights (class_insights table, via SanitizedClassInsights)
 *
 * Output (SpeakerBriefContent) is persisted to the `speaker_briefs` table via
 * lib/db/speakerBriefs.ts, triggered from app/api/sessions/[id]/brief/route.ts.
 *
 * Uses: lib/ai/geminiClient.ts
 * Called by: app/api/sessions/[id]/brief/route.ts (POST handler)
 * Persists to: speaker_briefs table via lib/db/speakerBriefs.ts
 */

import { getGeminiClient, getGeminiModel } from '@/lib/ai/geminiClient'
import type { SpeakerBriefContent } from '@/types'

/**
 * A sanitized subset of the per-session Gemini analysis (SessionAnalysis).
 * Fields are cherry-picked here so that speakerBrief.ts does not need to
 * import the full SessionAnalysis type and can be consumed safely even when
 * the full analysis object contains additional internal fields.
 *
 * Produced by: app/api/sessions/[id]/brief/route.ts (reads session_analyses row)
 * Also re-exported and used by: lib/ai/speakerPortal.ts
 */
export interface SanitizedAnalysis {
  theme_clusters: Array<{
    name: string
    question_count: number
    top_question: string
  }>
  tensions: Array<{ label: string; description: string }>
  suggestions: Array<{ text: string; reason: string }>
  blind_spots: Array<{ title: string; description: string }>
  sentiment: {
    aspirational: number
    curious: number
    personal: number
    critical: number
  }
}

/**
 * A sanitized subset of ClassInsights scoped to what the speaker brief needs.
 * Gives the brief contextual depth by surfacing semester-level patterns
 * (recurring themes, quality trend) without exposing the full class insights
 * object, which contains fields irrelevant or inappropriate for the speaker.
 *
 * Produced by: app/api/sessions/[id]/brief/route.ts (reads class_insights row)
 * Also re-exported and used by: lib/ai/speakerPortal.ts
 */
export interface SanitizedClassInsights {
  narrative: string
  qualityTrend: { direction: string; description: string }
  topThemes: Array<{ title: string; sessionCount: number }>
}

/**
 * Constructs the Gemini prompt for speaker brief generation.
 *
 * Builds a structured data section from the session metadata, optional
 * per-session analysis, and optional class-wide insights. The more data
 * that is available, the richer the resulting brief. The function is kept
 * private to this module; callers should use `generateSpeakerBrief` instead.
 *
 * @param params - All session and analysis data needed to populate the brief
 * @returns A fully-formed prompt string ready for Gemini content generation
 * @remarks
 * The prompt deliberately withholds raw student question text and all internal
 * scoring/tier labels. The brief is designed to be sent externally to executives,
 * so it synthesizes and abstracts student data rather than quoting it.
 */
function buildBriefPrompt(params: {
  speakerName: string
  sessionDate: string
  fileCount: number
  themes: string[]
  analysis: SanitizedAnalysis | null
  classInsights: SanitizedClassInsights | null
}): string {
  const { speakerName, sessionDate, fileCount, themes, analysis, classInsights } = params

  // Build the core data section from the session metadata and theme list.
  // This is the minimum data always present; analysis and classInsights are optional.
  let dataSection = `Speaker: ${speakerName}
Session Date: ${sessionDate}
Number of Student Submissions: ${fileCount}

Session Themes (${themes.length} total):
${themes.map((t, i) => `${i + 1}. ${t}`).join('\n')}`

  // Append per-session Gemini analysis if available.
  // Includes theme clusters, tensions, interview angles, blind spots, and sentiment distribution.
  if (analysis) {
    dataSection += `

Theme Analysis:
${analysis.theme_clusters.map(c => `- "${c.name}" (${c.question_count} questions) — top question: "${c.top_question}"`).join('\n')}

Key Tensions Across Submissions:
${analysis.tensions.map(t => `- ${t.label}: ${t.description}`).join('\n')}

Suggested Interview Angles:
${analysis.suggestions.map(s => `- ${s.text} (${s.reason})`).join('\n')}

Topics Students Did NOT Ask About (Blind Spots):
${analysis.blind_spots.map(b => `- ${b.title}: ${b.description}`).join('\n')}

Student Sentiment Distribution:
- Aspirational: ${analysis.sentiment.aspirational}%
- Curious/Analytical: ${analysis.sentiment.curious}%
- Personal/Life-Advice: ${analysis.sentiment.personal}%
- Critical/Challenging: ${analysis.sentiment.critical}%`
  }

  // Append semester-level class insights if available.
  // This gives the brief contextual depth by surfacing recurring themes and
  // the quality trend across all sessions this semester, helping the speaker
  // understand the intellectual arc of the class beyond just this one visit.
  if (classInsights) {
    dataSection += `

Class-Wide Context (across all sessions this semester):
${classInsights.narrative}

Quality Trend: ${classInsights.qualityTrend.direction} — ${classInsights.qualityTrend.description}

Recurring Themes Across the Semester:
${classInsights.topThemes.map(t => `- "${t.title}" (appeared in ${t.sessionCount} sessions)`).join('\n')}`
  }

  return `You are preparing a polished, professional prep brief for a guest speaker who will be visiting a university management class (MGMT 305).

The brief will be sent directly to the speaker by the professor. It must be warm, respectful, and intellectually engaging — suitable for a Fortune 500 CEO or senior executive.

Here is the data from student submissions for this session:
---
${dataSection}
---

Using the data above, generate a JSON object with EXACTLY this structure:

{
  "header": {
    "speakerName": "${speakerName}",
    "date": "${sessionDate}",
    "studentCount": ${fileCount},
    "courseLabel": "MGMT 305"
  },
  "narrative": "string — A 3-5 sentence paragraph written in warm, professional prose. This is a 'What Students Care About' summary. Synthesize the themes into a compelling narrative about what excites students about this speaker. Do NOT list questions. Write as if addressing the speaker directly: 'Your upcoming session...'",
  "topThemes": [
    {
      "title": "string — short theme label, 2-5 words",
      "description": "string — one sentence describing what students are curious about within this theme"
    }
  ],
  "talkingPoints": [
    {
      "point": "string — a broad area where the speaker might want to have a story or reflection ready",
      "rationale": "string — why this matters, grounded in the student data. Start with: 'Students are especially interested in...'"
    }
  ],
  "classContext": "string — A paragraph giving the speaker a sense of the audience: upper-division management students, how many submitted, the intellectual posture of the class (based on sentiment data and quality trend). Be specific but warm.",
  "whatToExpect": "string — A short paragraph about the session format: 'Professor Drennen will moderate a structured conversation using student-sourced questions. The session will cover approximately 10 topic areas. You are not expected to prepare a presentation — just come ready for a thoughtful conversation.'"
}

Rules:
- topThemes: exactly 3-5 items, drawn from the session themes
- talkingPoints: exactly 3-5 items, grounded in the data but framed as broad preparation areas (NOT the actual interview questions)
- NEVER include student names anywhere in the output
- NEVER include raw student question text — synthesize and abstract
- NEVER reference quality rankings, tier labels, or internal scoring
- The tone should be warm, respectful, and professionally engaging — like a briefing memo from a trusted colleague
- Return ONLY valid JSON. No markdown fences, no explanation text.`
}

/**
 * Generates a professional preparation brief for an incoming guest speaker.
 *
 * Calls Gemini with a rich prompt that weaves together session metadata,
 * per-session analysis, and semester-level class insights into a warm,
 * skimmable JSON document structured as: header, narrative, topThemes,
 * talkingPoints, classContext, and whatToExpect.
 *
 * The Gemini system instruction enforces that student names and raw question
 * text are NEVER included in the output — the brief is safe to send externally.
 *
 * Caller is responsible for persisting the returned SpeakerBriefContent to
 * the `speaker_briefs` table via `upsertSpeakerBrief` in lib/db/speakerBriefs.ts.
 *
 * @param params - Session metadata, optional analysis, and optional class insights
 * @returns Parsed SpeakerBriefContent JSON object ready for storage and export
 *
 * Uses: lib/ai/geminiClient.ts
 * Called by: app/api/sessions/[id]/brief/route.ts (POST handler)
 * @remarks
 * The `responseMimeType: 'application/json'` Gemini config option is used to
 * suppress markdown fence wrapping. The response is trimmed and parsed directly —
 * no cleanJSON step is needed here because JSON mode is strictly enforced.
 * Student names and raw question text are prohibited by the system instruction.
 * @see app/api/sessions/[id]/brief/route.ts — POST handler that calls this function
 * @see lib/db/speakerBriefs.ts — upsertSpeakerBrief persists the returned content
 */
export async function generateSpeakerBrief(params: {
  speakerName: string
  sessionDate: string
  fileCount: number
  themes: string[]
  analysis: SanitizedAnalysis | null
  classInsights: SanitizedClassInsights | null
}): Promise<SpeakerBriefContent> {
  // Uses: lib/ai/geminiClient.ts
  const ai = getGeminiClient()
  const model = getGeminiModel()

  const response = await ai.models.generateContent({
    model,
    contents: buildBriefPrompt(params),
    config: {
      systemInstruction:
        'You are an expert at writing polished, professional documents for senior executives. Always respond with valid JSON only. Never include student names or raw question text.',
      // Force JSON response to avoid markdown fences or prose wrapping the output
      responseMimeType: 'application/json',
    },
  })

  // response.text is the raw JSON string; trim and parse directly
  const raw = (response.text ?? '').trim()
  return JSON.parse(raw) as SpeakerBriefContent
}
