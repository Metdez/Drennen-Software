import { GoogleGenAI } from '@google/genai'
import type { SessionAnalysis, ThemeAnalysis } from '@/types'

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY env var is not set')
  return {
    ai: new GoogleGenAI({ apiKey }),
    model: process.env.GEMINI_MODEL ?? 'gemini-2.0-flash',
  }
}

// ---------------------------------------------------------------------------
// Session-level analysis
// ---------------------------------------------------------------------------

function buildSessionAnalysisPrompt(
  speakerName: string,
  sessionOutput: string,
  submissions: Array<{ student_name: string; submission_text: string }>
): string {
  const submissionsText = submissions
    .map((s) => `[${s.student_name}]: ${s.submission_text}`)
    .join('\n\n')

  return `You are analyzing student questions submitted before a guest speaker session for a university management class.

Speaker: ${speakerName}

The AI-generated interview sheet (which already grouped questions into themes) is below:
---
${sessionOutput}
---

Raw student submissions (${submissions.length} total):
---
${submissionsText}
---

Analyze the student submissions and return a JSON object with EXACTLY this structure:
{
  "theme_clusters": [
    {
      "name": "string — theme title from the interview sheet",
      "question_count": number,
      "top_question": "string — the single best/most representative raw question text",
      "questions": [
        { "text": "string — raw question text", "student_name": "string" }
      ]
    }
  ],
  "tensions": [
    {
      "label": "string — 2-4 words naming the tension, e.g. 'Passion vs Pragmatism'",
      "description": "string — one sentence describing what this tension reveals about student thinking"
    }
  ],
  "suggestions": [
    {
      "text": "string — specific interview angle or follow-up to suggest",
      "reason": "string — short reason why (e.g. '→ 9 questions in Career Pivots cluster')"
    }
  ],
  "blind_spots": [
    {
      "title": "string — short topic name",
      "description": "string — one sentence explaining why it matters for this speaker"
    }
  ],
  "sentiment": {
    "aspirational": number,
    "curious": number,
    "personal": number,
    "critical": number
  }
}

Rules:
- theme_clusters: include ALL themes from the interview sheet, map each student submission to its closest theme. question_count is the number of submissions in that cluster.
- tensions: identify 2–3 underlying contradictions across ALL submissions (not per theme).
- suggestions: exactly 3 suggestions, each grounded in the data.
- blind_spots: 2–3 topics the speaker is known for that NO students asked about.
- sentiment: percentages of submissions that are primarily aspirational / curious-analytical / personal-life-advice / critical-challenging. Must sum to 100.
- Return ONLY valid JSON. No markdown fences, no explanation text.`
}

export async function runSessionAnalysis(
  speakerName: string,
  sessionOutput: string,
  submissions: Array<{ student_name: string; submission_text: string }>
): Promise<SessionAnalysis> {
  const { ai, model } = getGeminiClient()

  const response = await ai.models.generateContent({
    model,
    contents: buildSessionAnalysisPrompt(speakerName, sessionOutput, submissions),
    config: {
      systemInstruction: 'You are an expert at analyzing student questions for university professors. Always respond with valid JSON only.',
      responseMimeType: 'application/json',
    },
  })

  const raw = (response.text ?? '').trim()
  return JSON.parse(raw) as SessionAnalysis
}

// ---------------------------------------------------------------------------
// Theme deep-dive analysis
// ---------------------------------------------------------------------------

function buildThemeAnalysisPrompt(
  themeName: string,
  speakerName: string,
  questions: Array<{ text: string; student_name: string }>
): string {
  const questionsText = questions
    .map((q) => `[${q.student_name}]: ${q.text}`)
    .join('\n')

  return `You are doing a deep analysis of one specific theme cluster from a university guest speaker session.

Speaker: ${speakerName}
Theme: ${themeName}
Student questions in this theme (${questions.length} total):
---
${questionsText}
---

Return a JSON object with EXACTLY this structure:
{
  "narrative": "string — 2 paragraphs. First: what students are REALLY asking beneath the surface. Second: a key pattern or insight the professor should know.",
  "probe_questions": [
    {
      "question": "string — a follow-up question the professor could ask to go deeper",
      "why": "string — short reason why this probe matters (start with →)"
    }
  ],
  "missed_angles": [
    "string — an angle or sub-topic within this theme that students didn't ask about"
  ],
  "patterns": [
    {
      "emoji": "string — a single emoji that represents this pattern",
      "text": "string — one sentence describing a behavioral or linguistic pattern across these questions"
    }
  ]
}

Rules:
- probe_questions: exactly 3
- missed_angles: 2–3 items
- patterns: exactly 2–3 items
- emoji: must be a single emoji character, no text
- Return ONLY valid JSON. No markdown fences, no explanation.`
}

export async function runThemeAnalysis(
  themeName: string,
  speakerName: string,
  questions: Array<{ text: string; student_name: string }>
): Promise<ThemeAnalysis> {
  const { ai, model } = getGeminiClient()

  const response = await ai.models.generateContent({
    model,
    contents: buildThemeAnalysisPrompt(themeName, speakerName, questions),
    config: {
      systemInstruction: 'You are an expert at analyzing student questions for university professors. Always respond with valid JSON only.',
      responseMimeType: 'application/json',
    },
  })

  const raw = (response.text ?? '').trim()
  return JSON.parse(raw) as ThemeAnalysis
}
