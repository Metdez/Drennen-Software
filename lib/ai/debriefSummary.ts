import { GoogleGenAI } from '@google/genai'
import type { SessionDebrief, QuestionFeedback } from '@/types'

function groupByStatus(feedback: QuestionFeedback[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {
    home_run: [],
    solid: [],
    flat: [],
    unused: [],
  }
  for (const q of feedback) {
    groups[q.status]?.push(`"${q.questionText}" (${q.attribution})`)
  }
  return groups
}

function buildPrompt(speakerName: string, debrief: SessionDebrief): string {
  const groups = groupByStatus(debrief.questionsFeedback)

  const ratingLabel = ['', 'Disappointing', 'Below Expectations', 'Solid', 'Strong', 'Exceptional'][
    debrief.overallRating ?? 0
  ] ?? 'Not rated'

  return `You are helping a university professor capture learnings from a guest speaker session.

Speaker: ${speakerName}
Overall Rating: ${debrief.overallRating ?? 'Not rated'}/5 (${ratingLabel})

Questions That Landed:
- HOME RUN (${groups.home_run.length}): ${groups.home_run.join('; ') || 'None'}
- SOLID (${groups.solid.length}): ${groups.solid.join('; ') || 'None'}
- FELL FLAT (${groups.flat.length}): ${groups.flat.join('; ') || 'None'}
- UNUSED (${groups.unused.length}): ${groups.unused.join('; ') || 'None'}

${debrief.surpriseMoments ? `Surprise Moments: ${debrief.surpriseMoments}` : ''}
${debrief.speakerFeedback ? `Speaker Feedback: ${debrief.speakerFeedback}` : ''}
${debrief.studentObservations.length > 0 ? `Student Observations:\n${debrief.studentObservations.map(o => `- ${o.studentName}: ${o.note}`).join('\n')}` : ''}
${debrief.followupTopics ? `Follow-up Topics: ${debrief.followupTopics}` : ''}

Write a concise 3-5 sentence executive debrief summary. Cover: (1) overall session quality, (2) what resonated most with the room, (3) any surprises or unexpected moments, (4) actionable takeaways for future sessions. Write in third person, professional tone. Do not use bullet points — write flowing prose.`
}

export async function generateDebriefSummary(
  speakerName: string,
  debrief: SessionDebrief,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY env var is not set')

  const ai = new GoogleGenAI({ apiKey })
  const model = process.env.GEMINI_MODEL ?? 'gemini-3.1-flash-lite-preview'

  const response = await ai.models.generateContent({
    model,
    contents: buildPrompt(speakerName, debrief),
    config: {
      systemInstruction:
        'You are an expert educational analyst writing concise session debrief summaries. Respond with plain text only — no JSON, no markdown formatting, no bullet points.',
    },
  })

  return (response.text ?? '').trim()
}
