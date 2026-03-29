import { getGeminiClient, getGeminiModel } from '@/lib/ai/geminiClient'
import type { PostSessionFeedback, QuestionFeedback } from '@/types'
import { getSpeakerPortal, updatePostSessionFeedback } from '@/lib/db/speakerPortals'
import { getDebrief } from '@/lib/db/debriefs'
import { createAdminClient } from '@/lib/supabase/server'

function buildPostSessionPrompt(params: {
  speakerName: string
  overallRating: number
  questionsFeedback: QuestionFeedback[]
  speakerFeedback: string
  surpriseMoments: string
  themes: string[]
  studentReflectionThemes: string[]
  studentReflectionSummary: string | null
}): string {
  const {
    speakerName,
    overallRating,
    questionsFeedback,
    speakerFeedback,
    surpriseMoments,
    themes,
    studentReflectionThemes,
    studentReflectionSummary,
  } = params

  const homeRuns = questionsFeedback.filter(q => q.status === 'home_run')
  const homeRunTopics = homeRuns.map(q => q.questionText ?? q.themeTitle ?? 'Unknown topic')

  let dataSection = `Speaker: ${speakerName}
Overall Session Rating: ${overallRating}/5

Session Themes:
${themes.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Topics That Resonated Most (rated as "home run"):
${homeRunTopics.length > 0 ? homeRunTopics.map(t => `- ${t}`).join('\n') : '- No specific topics flagged'}

Professor Feedback: ${speakerFeedback || 'No specific feedback provided'}
Surprise Moments: ${surpriseMoments || 'None noted'}`

  if (studentReflectionThemes.length > 0 || studentReflectionSummary) {
    dataSection += `

Student Reflections (anonymized):
${studentReflectionThemes.length > 0 ? `Themes: ${studentReflectionThemes.join(', ')}` : ''}
${studentReflectionSummary ? `Summary: ${studentReflectionSummary}` : ''}`
  }

  return `You are writing a warm, appreciative post-session feedback section for a guest speaker's preparation portal.

The speaker has already visited the class and this feedback shows them the impact of their session. This should feel like a thank-you note with substance — NOT a performance review or report card.

Data:
---
${dataSection}
---

Generate a JSON object with EXACTLY this structure:

{
  "overallRating": ${overallRating},
  "topicsResonated": ["string — 3-5 specific topics or themes that landed particularly well with the class"],
  "studentHighlights": "string — A 2-3 sentence anonymized synthesis of how students responded to the session. What surprised them? What stuck with them? Frame positively and warmly. Never use student names.",
  "professorNotes": "string — A 1-2 sentence synthesis of the professor's observations about the session. If no feedback was provided, write a brief positive note about the session.",
  "narrative": "string — A warm 3-4 sentence wrap-up paragraph addressed to the speaker. Thank them, highlight the lasting impact, and express what made this session special. Write as: '${speakerName}, your session...'"
}

Rules:
- NEVER include student names or identifiable information
- The tone must be warm, grateful, and substantive — like a heartfelt thank-you note
- Ground everything in the data provided; do not fabricate details
- Return ONLY valid JSON. No markdown fences, no explanation text.`
}

export async function generatePostSessionFeedback(params: {
  speakerName: string
  overallRating: number
  questionsFeedback: QuestionFeedback[]
  speakerFeedback: string
  surpriseMoments: string
  themes: string[]
  studentReflectionThemes: string[]
  studentReflectionSummary: string | null
}): Promise<PostSessionFeedback> {
  const ai = getGeminiClient()
  const model = getGeminiModel()

  const response = await ai.models.generateContent({
    model,
    contents: buildPostSessionPrompt(params),
    config: {
      systemInstruction:
        'You are writing warm, appreciative post-session feedback for a guest speaker. Always respond with valid JSON only. Never include student names or identifiable information.',
      responseMimeType: 'application/json',
    },
  })

  const raw = (response.text ?? '').trim()
  return JSON.parse(raw) as PostSessionFeedback
}

/**
 * Fire-and-forget: generates post-session feedback and publishes it to the portal.
 * Called from debrief completion handler.
 */
export async function generateAndPublishPostSessionFeedback(
  sessionId: string
): Promise<void> {
  // Check if portal exists for this session
  const portal = await getSpeakerPortal(sessionId)
  if (!portal) return // no portal created, skip silently

  // Fetch debrief data
  const debrief = await getDebrief(sessionId)
  if (!debrief || debrief.status !== 'complete') return

  // Fetch session themes
  const supabase = createAdminClient()
  const { data: themeRows } = await supabase
    .from('session_themes')
    .select('theme_title')
    .eq('session_id', sessionId)
    .order('theme_number', { ascending: true })
  const themes = (themeRows ?? []).map(r => r.theme_title as string)

  // Fetch student debrief analysis (anonymized)
  const { data: studentDebriefRow } = await supabase
    .from('student_debrief_analyses')
    .select('analysis')
    .eq('session_id', sessionId)
    .maybeSingle()

  const studentAnalysis = studentDebriefRow?.analysis as {
    reflection_themes?: Array<{ name: string }>
    summary?: string
  } | null

  // Get speaker name from portal content
  const content = portal.editedContent ?? portal.content
  const speakerName = content.welcome.speakerName

  const feedback = await generatePostSessionFeedback({
    speakerName,
    overallRating: debrief.overallRating ?? 0,
    questionsFeedback: debrief.questionsFeedback ?? [],
    speakerFeedback: debrief.speakerFeedback ?? '',
    surpriseMoments: debrief.surpriseMoments ?? '',
    themes,
    studentReflectionThemes: (studentAnalysis?.reflection_themes ?? []).map(t => t.name),
    studentReflectionSummary: studentAnalysis?.summary ?? null,
  })

  await updatePostSessionFeedback(sessionId, feedback)
}
