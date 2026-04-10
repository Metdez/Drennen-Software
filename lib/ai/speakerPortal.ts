/**
 * lib/ai/speakerPortal.ts
 *
 * Generates the PRE-SESSION content for a speaker's self-service preparation portal.
 *
 * While the speaker brief (`lib/ai/speakerBrief.ts`) is a downloadable document
 * for offline reading, the portal is a live web experience at `/speaker/[token]`
 * that gives the speaker a skimmable, interactive view of what to expect. It
 * includes actual (lightly-edited) student questions, audience profiles, and
 * optionally data from past speaker sessions to help the speaker understand
 * what resonates with this particular class.
 *
 * The portal has TWO phases:
 *  1. Pre-session (this file): Generated before the speaker visits; provides
 *     student interests, sample questions, talking points, and audience profile.
 *  2. Post-session (lib/ai/speakerPortalPostSession.ts): Generated after the
 *     debrief is completed; shows the speaker the impact their session had.
 *
 * Inputs:
 *  - Session metadata (speaker name, professor name, date, file count)
 *  - Full AI interview sheet output (sessionOutput) — the actual student questions
 *  - Session themes from the session_themes table
 *  - Per-session Gemini analysis (SanitizedAnalysis from session_analyses table)
 *  - Class-wide insights (SanitizedClassInsights from class_insights table)
 *  - Debrief history from past sessions (used to generate pastSpeakerInsights)
 *
 * Output (SpeakerPortalContent) is persisted to the `speaker_portals` table via
 * lib/db/speakerPortals.ts, triggered from app/api/sessions/[id]/portal/route.ts.
 *
 * Uses: lib/ai/geminiClient.ts, lib/ai/speakerBrief.ts (SanitizedAnalysis/ClassInsights types)
 * Called by: app/api/sessions/[id]/portal/route.ts (POST handler)
 * Persists to: speaker_portals table via lib/db/speakerPortals.ts
 */

import { getGeminiClient, getGeminiModel } from '@/lib/ai/geminiClient'
import type { SpeakerPortalContent } from '@/types'
import type { SanitizedAnalysis, SanitizedClassInsights } from '@/lib/ai/speakerBrief'

/**
 * A single entry from the professor's post-session debrief history.
 * When 2+ completed debriefs exist, this data is fed to the portal prompt
 * so Gemini can generate the `pastSpeakerInsights` section — actionable tips
 * about what works with this particular class, grounded in real feedback.
 *
 * Sourced by: app/api/sessions/[id]/portal/route.ts (queries session_debriefs table)
 */
export interface DebriefHistoryEntry {
  speakerName: string
  rating: number
  speakerFeedback: string
  homeRunCount: number
  surpriseMoments: string
}

/**
 * Constructs the Gemini prompt for pre-session speaker portal content generation.
 *
 * Unlike the brief prompt (which sanitizes away student questions), the portal
 * prompt deliberately includes actual student questions from `sessionOutput` so
 * that Gemini can surface lightly-edited real questions in the `sampleQuestions`
 * section. The speaker should see what students genuinely asked.
 *
 * The debrief history section is only included when 2+ completed debriefs exist;
 * below that threshold there isn't enough signal to generate reliable insights.
 *
 * @param params - Full session data including raw output and optional history
 * @returns A fully-formed prompt string ready for Gemini content generation
 * @remarks
 * The past debrief history section is gated behind a minimum of 2 completed
 * debriefs. Below that threshold the sample size is too small to surface reliable
 * patterns about what works with this audience.
 */
function buildPortalPrompt(params: {
  speakerName: string
  professorName: string
  sessionDate: string
  fileCount: number
  themes: string[]
  sessionOutput: string
  analysis: SanitizedAnalysis | null
  classInsights: SanitizedClassInsights | null
  debriefHistory: DebriefHistoryEntry[] | null
}): string {
  const { speakerName, professorName, sessionDate, fileCount, themes, sessionOutput, analysis, classInsights, debriefHistory } = params

  let dataSection = `Speaker: ${speakerName}
Professor: ${professorName}
Session Date: ${sessionDate}
Number of Student Submissions: ${fileCount}

Session Themes (${themes.length} total):
${themes.map((t, i) => `${i + 1}. ${t}`).join('\n')}

--- FULL QUESTION SHEET (contains actual student questions organized by theme) ---
${sessionOutput}
--- END QUESTION SHEET ---`

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

  if (classInsights) {
    dataSection += `

Class-Wide Context (across all sessions this semester):
${classInsights.narrative}

Quality Trend: ${classInsights.qualityTrend.direction} — ${classInsights.qualityTrend.description}

Recurring Themes Across the Semester:
${classInsights.topThemes.map(t => `- "${t.title}" (appeared in ${t.sessionCount} sessions)`).join('\n')}`
  }

  // Only include past debrief data when there are at least 2 completed sessions.
  // Below that threshold the sample is too small to draw reliable patterns,
  // so we omit the section rather than surface potentially misleading insights.
  let debriefSection = ''
  const completedDebriefs = debriefHistory?.filter(d => d.rating > 0) ?? []
  if (completedDebriefs.length >= 2) {
    debriefSection = `

Past Speaker Session Data (${completedDebriefs.length} completed sessions with feedback):
${completedDebriefs.map(d => `- ${d.speakerName}: rated ${d.rating}/5, ${d.homeRunCount} standout moments${d.speakerFeedback ? `, feedback: "${d.speakerFeedback}"` : ''}${d.surpriseMoments ? `, surprises: "${d.surpriseMoments}"` : ''}`).join('\n')}

Average rating across past sessions: ${(completedDebriefs.reduce((sum, d) => sum + d.rating, 0) / completedDebriefs.length).toFixed(1)}/5`
  }

  return `You are creating a preparation portal for a guest speaker visiting Professor ${professorName}'s MGMT 305 class at Hobart and William Smith Colleges.

This portal should be SKIMMABLE — busy speakers will scan it in 2 minutes. Use short, punchy sentences. Lead with the most important thing. Cut the fluff.

The tone is warm but efficient — like a thoughtful colleague who respects the speaker's time. NOT a report, NOT a data dump.

Here is the data:
---
${dataSection}${debriefSection}
---

Generate a JSON object with EXACTLY this structure:

{
  "welcome": {
    "speakerName": "${speakerName}",
    "professorName": "${professorName}",
    "courseLabel": "MGMT 305",
    "sessionDate": "${sessionDate}",
    "studentCount": ${fileCount},
    "greeting": "string — 2-3 sentences max. Welcome the speaker by name. Mention Professor ${professorName} and that ${fileCount} Hobart and William Smith students have submitted questions. Keep it warm but brief."
  },
  "studentInterests": {
    "narrative": "string — 2-3 sentences summarizing what the Hobart and William Smith students care about most. NEVER say 'your students' — say 'the students' or 'HWS students'. Be direct: 'The students are most curious about...'",
    "topThemes": [
      {
        "title": "string — short theme label, 2-5 words",
        "description": "string — 1 sentence max. What students want to know about this theme. Be specific."
      }
    ]
  },
  "sampleQuestions": {
    "narrative": "string — 1 sentence intro like 'Here are representative questions the students submitted, grouped by theme:'",
    "questions": [
      {
        "theme": "string — the theme this question falls under",
        "question": "string — a lightly edited version of an actual student question. Clean up grammar but preserve the student's voice and intent. Do NOT over-synthesize — the speaker should see what students actually asked."
      }
    ]
  },
  "talkingPoints": [
    {
      "point": "string — a specific area where the speaker might want to have a story or example ready",
      "rationale": "string — 1 sentence. Why this matters to these students. Start with: 'HWS students are especially interested in...'"
    }
  ],
  "audienceProfile": {
    "narrative": "string — 2-3 sentences giving the speaker a feel for the room. These are upper-division management students at Hobart and William Smith Colleges. What drives them, what kind of questions they ask. Help the speaker picture the audience.",
    "sentiment": {
      "aspirational": ${analysis?.sentiment.aspirational ?? 25},
      "curious": ${analysis?.sentiment.curious ?? 25},
      "personal": ${analysis?.sentiment.personal ?? 25},
      "critical": ${analysis?.sentiment.critical ?? 25}
    },
    "recurringInterests": ["string — 3-6 themes that have come up across multiple sessions this semester"]
  },
  "pastSpeakerInsights": {
    "available": ${completedDebriefs.length >= 2},
    "narrative": "string — ${completedDebriefs.length >= 2 ? '2-3 sentences about what has worked well with this class. Frame as helpful tips: \\"HWS students tend to respond best to...\\"' : 'Empty string — not enough data yet'}",
    "highlights": [${completedDebriefs.length >= 2 ? `
      {
        "insight": "string — a specific, actionable tip about what works with this audience",
        "context": "string — brief context drawn from past session data"
      }
    ` : ''}]
  }
}

Rules:
- topThemes: exactly 4-6 items
- sampleQuestions.questions: exactly 6-10 items, spread across themes. Use real questions from the data — lightly edited for clarity but preserving the student's voice. NEVER attribute to a student by name.
- talkingPoints: exactly 5-8 items
- recurringInterests: 3-6 items
- pastSpeakerInsights.highlights: ${completedDebriefs.length >= 2 ? '3-5 items' : '0 items (empty array)'}
- NEVER include student names anywhere
- NEVER say "your students" — always say "the students", "HWS students", or "Hobart and William Smith students"
- NEVER reference quality rankings, tier labels, or internal scoring
- Keep everything skimmable — short sentences, no padding
- Return ONLY valid JSON. No markdown fences, no explanation text.`
}

/**
 * Generates the pre-session content for a guest speaker's preparation portal.
 *
 * Calls Gemini with the full session context (including raw student questions)
 * and returns a structured SpeakerPortalContent JSON document containing:
 *  - welcome: speaker/course greeting and session metadata
 *  - studentInterests: top themes and a narrative summary
 *  - sampleQuestions: real (lightly-edited) student questions grouped by theme
 *  - talkingPoints: specific preparation areas with student-grounded rationale
 *  - audienceProfile: demographic/intellectual profile of the class
 *  - pastSpeakerInsights: optional section drawn from historical debrief data
 *
 * The Gemini system instruction forbids student names and enforces the HWS
 * student reference convention ("HWS students", not "your students").
 *
 * Caller is responsible for persisting the returned content to the
 * `speaker_portals` table via `upsertSpeakerPortal` in lib/db/speakerPortals.ts.
 *
 * @param params - Full session context including professor name and debrief history
 * @returns Parsed SpeakerPortalContent JSON object ready for storage and rendering
 *
 * Uses: lib/ai/geminiClient.ts
 * Called by: app/api/sessions/[id]/portal/route.ts (POST handler)
 * @remarks
 * Unlike `generateSpeakerBrief`, this function intentionally includes real (lightly-
 * edited) student questions in the `sampleQuestions` section of the output. The
 * portal is a web experience designed for the speaker — seeing actual student
 * questions helps them calibrate the conversation depth and vocabulary level.
 * The system instruction still forbids attributing questions to specific students.
 * @see app/api/sessions/[id]/portal/route.ts — POST handler that calls this function
 * @see lib/db/speakerPortals.ts — upsertSpeakerPortal persists the returned content
 * @see lib/ai/speakerPortalPostSession.ts — generates the post-session phase of the portal
 */
export async function generateSpeakerPortalContent(params: {
  speakerName: string
  professorName: string
  sessionDate: string
  fileCount: number
  themes: string[]
  sessionOutput: string
  analysis: SanitizedAnalysis | null
  classInsights: SanitizedClassInsights | null
  debriefHistory: DebriefHistoryEntry[] | null
}): Promise<SpeakerPortalContent> {
  // Uses: lib/ai/geminiClient.ts
  const ai = getGeminiClient()
  const model = getGeminiModel()

  const response = await ai.models.generateContent({
    model,
    contents: buildPortalPrompt(params),
    config: {
      systemInstruction:
        'You are an expert at creating warm, personalized preparation experiences for guest speakers. Always respond with valid JSON only. Never include student names or raw question text. Your output should feel like a trusted colleague helping the speaker prepare.',
      // Force JSON response to avoid markdown fences or prose wrapping the output
      responseMimeType: 'application/json',
    },
  })

  // response.text is the raw JSON string; trim and parse directly
  const raw = (response.text ?? '').trim()
  return JSON.parse(raw) as SpeakerPortalContent
}
