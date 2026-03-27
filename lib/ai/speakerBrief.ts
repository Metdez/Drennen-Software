import { GoogleGenAI } from '@google/genai'
import type { SpeakerBriefContent } from '@/types'

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY env var is not set')
  return {
    ai: new GoogleGenAI({ apiKey }),
    model: process.env.GEMINI_MODEL ?? 'gemini-3.1-flash-lite-preview',
  }
}

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

export interface SanitizedClassInsights {
  narrative: string
  qualityTrend: { direction: string; description: string }
  topThemes: Array<{ title: string; sessionCount: number }>
}

function buildBriefPrompt(params: {
  speakerName: string
  sessionDate: string
  fileCount: number
  themes: string[]
  analysis: SanitizedAnalysis | null
  classInsights: SanitizedClassInsights | null
}): string {
  const { speakerName, sessionDate, fileCount, themes, analysis, classInsights } = params

  let dataSection = `Speaker: ${speakerName}
Session Date: ${sessionDate}
Number of Student Submissions: ${fileCount}

Session Themes (${themes.length} total):
${themes.map((t, i) => `${i + 1}. ${t}`).join('\n')}`

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

export async function generateSpeakerBrief(params: {
  speakerName: string
  sessionDate: string
  fileCount: number
  themes: string[]
  analysis: SanitizedAnalysis | null
  classInsights: SanitizedClassInsights | null
}): Promise<SpeakerBriefContent> {
  const { ai, model } = getGeminiClient()

  const response = await ai.models.generateContent({
    model,
    contents: buildBriefPrompt(params),
    config: {
      systemInstruction:
        'You are an expert at writing polished, professional documents for senior executives. Always respond with valid JSON only. Never include student names or raw question text.',
      responseMimeType: 'application/json',
    },
  })

  const raw = (response.text ?? '').trim()
  return JSON.parse(raw) as SpeakerBriefContent
}
