import { getGeminiClient, getGeminiModel } from '@/lib/ai/geminiClient'
import type { StudentDebriefAnalysis } from '@/types'

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

export async function runDebriefReflectionAnalysis(
  speakerName: string,
  submissions: Array<{ student_name: string; submission_text: string }>
): Promise<StudentDebriefAnalysis> {
  const ai = getGeminiClient()
  const model = getGeminiModel()

  const response = await ai.models.generateContent({
    model,
    contents: buildDebriefReflectionPrompt(speakerName, submissions),
    config: {
      systemInstruction: 'You are an expert at analyzing student reflections for university professors. Always respond with valid JSON only.',
      responseMimeType: 'application/json',
    },
  })

  const raw = (response.text ?? '').trim()
  return JSON.parse(raw) as StudentDebriefAnalysis
}
