import { getGeminiClient, getGeminiModel } from '@/lib/ai/geminiClient'
import type { SessionAnalysis, ThemeAnalysis, CrossSessionThemeAnalysis } from '@/types'

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
  const ai = getGeminiClient()
  const model = getGeminiModel()

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
  const ai = getGeminiClient()
  const model = getGeminiModel()

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

// ---------------------------------------------------------------------------
// Cross-session Theme analysis
// ---------------------------------------------------------------------------

function buildCrossSessionThemeAnalysisPrompt(
  themeName: string,
  questions: Array<{ text: string; student_name: string; session_id: string; speaker_name: string }>
): string {
  const questionsText = questions
    .map((q) => `[${q.speaker_name}] [${q.student_name}]: ${q.text}`)
    .join('\n')

  return `You are doing a deep analysis of a core theme that has emerged across multiple university guest speaker sessions.

Theme: ${themeName}
All student questions potentially related to this theme (${questions.length} total):
---
${questionsText}
---

Your task:
1. Review all the provided questions. Some may be loosely related, some very directly related.
2. Select only the questions that are truly relevant to the core theme.
3. Write a compelling analysis.

Return a JSON object with EXACTLY this structure:
{
  "narrative": "string — 2 paragraphs analyzing what students are consistently asking about this theme across different speakers. What is the underlying curiosity or anxiety?",
  "patterns": [
    {
      "emoji": "string — a single emoji",
      "text": "string — one sentence describing a specific pattern or sub-theme"
    }
  ],
  "missed_angles": [
    "string — what aspects of this theme are students failing to ask about?"
  ],
  "relevant_questions": [
    {
      "student_name": "string",
      "text": "string",
      "speaker_name": "string"
    }
  ]
}

Rules:
- relevant_questions: Include ONLY the questions from the input list that strongly match the theme.
- patterns: exactly 2-3 items
- missed_angles: exactly 2 items
- Return ONLY valid JSON. No markdown fences, no explanation.`
}

export async function runCrossSessionThemeAnalysis(
  themeName: string,
  questions: Array<{ text: string; student_name: string; session_id: string; speaker_name: string }>
): Promise<CrossSessionThemeAnalysis> {
  const ai = getGeminiClient()
  const model = getGeminiModel()

  const response = await ai.models.generateContent({
    model,
    contents: buildCrossSessionThemeAnalysisPrompt(themeName, questions),
    config: {
      systemInstruction: 'You are an expert at analyzing student questions across multiple sessions. Always respond with valid JSON only.',
      responseMimeType: 'application/json',
    },
  })

  const raw = (response.text ?? '').trim()
  return JSON.parse(raw) as CrossSessionThemeAnalysis
}
