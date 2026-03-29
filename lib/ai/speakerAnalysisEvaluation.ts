import { getGeminiClient, getGeminiModel } from '@/lib/ai/geminiClient'
import type { StudentSpeakerAnalysis } from '@/types'

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

export async function runSpeakerAnalysisEvaluation(
  speakerName: string,
  submissions: Array<{ student_name: string; submission_text: string }>
): Promise<StudentSpeakerAnalysis> {
  const ai = getGeminiClient()
  const model = getGeminiModel()

  const response = await ai.models.generateContent({
    model,
    contents: buildSpeakerAnalysisPrompt(speakerName, submissions),
    config: {
      systemInstruction: 'You are an expert at analyzing student analytical evaluations of guest speakers for university professors. Always respond with valid JSON only.',
      responseMimeType: 'application/json',
    },
  })

  const raw = (response.text ?? '').trim()
  return JSON.parse(raw) as StudentSpeakerAnalysis
}
