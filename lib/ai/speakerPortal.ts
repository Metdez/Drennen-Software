import { getGeminiClient, getGeminiModel } from '@/lib/ai/geminiClient'
import type { SpeakerPortalContent } from '@/types'
import type { SanitizedAnalysis, SanitizedClassInsights } from '@/lib/ai/speakerBrief'

export interface DebriefHistoryEntry {
  speakerName: string
  rating: number
  speakerFeedback: string
  homeRunCount: number
  surpriseMoments: string
}

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
  const ai = getGeminiClient()
  const model = getGeminiModel()

  const response = await ai.models.generateContent({
    model,
    contents: buildPortalPrompt(params),
    config: {
      systemInstruction:
        'You are an expert at creating warm, personalized preparation experiences for guest speakers. Always respond with valid JSON only. Never include student names or raw question text. Your output should feel like a trusted colleague helping the speaker prepare.',
      responseMimeType: 'application/json',
    },
  })

  const raw = (response.text ?? '').trim()
  return JSON.parse(raw) as SpeakerPortalContent
}
