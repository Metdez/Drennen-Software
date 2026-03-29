import { getGeminiClient, getGeminiModel } from '@/lib/ai/geminiClient'
import type {
  SessionAnalysis,
  StudentDebriefAnalysis,
  StudentSpeakerAnalysis,
  SessionSynthesis,
} from '@/types'

export interface SynthesisInput {
  speakerName: string
  sessionOutput: string
  questionsAnalysis: SessionAnalysis | null
  debriefAnalysis: StudentDebriefAnalysis | null
  speakerAnalysis: StudentSpeakerAnalysis | null
}

function buildSynthesisPrompt(input: SynthesisInput): string {
  const sections: string[] = []

  sections.push(`Speaker: ${input.speakerName}`)

  // Always include the session output (questions are always present)
  sections.push(`--- PRE-SESSION: AI Interview Sheet ---\n${input.sessionOutput}\n---`)

  if (input.questionsAnalysis) {
    const qa = input.questionsAnalysis
    const themes = qa.theme_clusters.map(t => `- ${t.name} (${t.question_count} questions)`).join('\n')
    const tensions = qa.tensions.map(t => `- ${t.label}: ${t.description}`).join('\n')
    const sentiment = qa.sentiment
      ? `Aspirational: ${qa.sentiment.aspirational}%, Curious: ${qa.sentiment.curious}%, Personal: ${qa.sentiment.personal}%, Critical: ${qa.sentiment.critical}%`
      : 'N/A'

    sections.push(`--- PRE-SESSION: Questions Analysis ---
Theme clusters:\n${themes}

Underlying tensions:\n${tensions}

Pre-session sentiment: ${sentiment}
---`)
  }

  if (input.debriefAnalysis) {
    const da = input.debriefAnalysis
    const themes = da.reflection_themes.map(t => `- ${t.name}: ${t.description} (${t.student_count} students)`).join('\n')
    const moments = da.key_moments.map(m => `- ${m.moment} (mentioned by ${m.mentioned_by}, sentiment: ${m.sentiment})`).join('\n')
    const surprises = da.surprises.map(s => `- ${s.student_name}: ${s.text}`).join('\n')
    const sentiment = da.sentiment
      ? `Inspired: ${da.sentiment.inspired}%, Reflective: ${da.sentiment.reflective}%, Challenged: ${da.sentiment.challenged}%, Indifferent: ${da.sentiment.indifferent}%`
      : 'N/A'

    sections.push(`--- POST-SESSION: Student Debrief Reflections ---
Reflection themes:\n${themes}

Key moments:\n${moments}

Surprises:\n${surprises}

Post-session sentiment: ${sentiment}

Summary: ${da.summary}
---`)
  }

  if (input.speakerAnalysis) {
    const sa = input.speakerAnalysis
    const themes = sa.evaluation_themes.map(t => `- ${t.name}: ${t.description} (${t.student_count} students)`).join('\n')
    const qualities = sa.leadership_qualities.map(q => `- ${q.quality}: ${q.description} (${q.mentioned_by} students)`).join('\n')
    const concepts = sa.course_concept_connections.map(c => `- ${c.concept} (${c.student_count} students)`).join('\n')
    const agreement = sa.areas_of_agreement.map(a => `- ${a.point} (${a.student_count} students, ${a.sentiment})`).join('\n')
    const disagreement = sa.areas_of_disagreement.map(d => `- ${d.point}`).join('\n')

    sections.push(`--- POST-SESSION: Speaker Analysis Evaluations ---
Evaluation themes:\n${themes}

Leadership qualities identified:\n${qualities}

Course concept connections:\n${concepts}

Areas of agreement:\n${agreement}

Areas of disagreement:\n${disagreement}

Analytical sophistication: High ${sa.analytical_sophistication.high}%, Moderate ${sa.analytical_sophistication.moderate}%, Surface ${sa.analytical_sophistication.surface}%

Summary: ${sa.summary}
---`)
  }

  const availableTypes: string[] = ['questions']
  if (input.debriefAnalysis) availableTypes.push('debriefs')
  if (input.speakerAnalysis) availableTypes.push('speaker_analyses')
  const missingTypes: string[] = []
  if (!input.debriefAnalysis) missingTypes.push('debriefs')
  if (!input.speakerAnalysis) missingTypes.push('speaker_analyses')

  sections.push(`Available data types: ${availableTypes.join(', ')}`)
  if (missingTypes.length > 0) {
    sections.push(`Missing data types: ${missingTypes.join(', ')} — do NOT hallucinate data for these. Mark them as unavailable in your analysis.`)
  }

  return sections.join('\n\n')
}

const SYSTEM_INSTRUCTION = `You are an educational intelligence analyst synthesizing student data across multiple phases of a university guest speaker session. Your job is to connect the dots between what students asked BEFORE the session and what they observed/reflected on AFTER the session.

Respond with valid JSON only. No markdown, no explanation text, no code fences.

Return a JSON object with EXACTLY this structure:
{
  "narrative": "string — 3-4 paragraph executive summary that weaves together all available data types into a coherent story of what happened intellectually and emotionally during this session. Reference specific themes and patterns. This should read like a session report card.",

  "curiosity_resolution": [
    {
      "question_theme": "string — theme from the pre-session questions",
      "addressed": boolean,
      "evidence": "string — specific evidence from debriefs/analyses showing whether and how the speaker addressed this topic. If no post-session data is available for this theme, say so."
    }
  ],

  "theme_evolution": [
    {
      "theme": "string — a theme that appeared in at least one data source",
      "pre_session": "string or null — how this theme manifested in pre-session questions (null if not present)",
      "post_session": "string or null — how this theme manifested in post-session debriefs or analyses (null if not present)",
      "evolution": "string — narrative of how understanding of this theme shifted from before to after the session"
    }
  ],

  "emergent_themes": [
    {
      "theme": "string — theme that appeared ONLY in post-session data, not in pre-session questions",
      "source": "debriefs" or "speaker_analyses",
      "description": "string — what this theme is about and why it emerged",
      "student_count": number
    }
  ],

  "tone_shift": {
    "pre": { "dominant": "string — dominant emotional tone before session", "description": "string — 1 sentence" },
    "post": { "dominant": "string — dominant emotional tone after session", "description": "string — 1 sentence" },
    "shift_narrative": "string — 2-3 sentences describing the emotional arc from pre to post session"
  },

  "gaps": [
    {
      "theme": "string — theme that appeared in one data source but was absent from others",
      "present_in": ["questions" or "debriefs" or "speaker_analyses"],
      "absent_from": ["questions" or "debriefs" or "speaker_analyses"],
      "significance": "string — why this gap matters (e.g., 'suggests the speaker didn't cover this' or 'suggests it didn't resonate long-term')"
    }
  ],

  "data_completeness": {
    "has_questions": boolean,
    "has_debriefs": boolean,
    "has_speaker_analyses": boolean,
    "missing_note": "string or null — if any data type is missing, a brief note about what additional insights would be possible with it"
  }
}

Rules:
- curiosity_resolution: one entry per major question theme (up to 10). Only mark "addressed": true if you have concrete evidence from post-session data.
- theme_evolution: include themes that appeared in at least 2 data sources, showing how they changed. 4-8 entries.
- emergent_themes: only themes that appeared AFTER the session that were NOT asked about beforehand. 0-5 entries.
- tone_shift: compare the pre-session sentiment (from questions analysis) with post-session sentiment (from debriefs). If debriefs are not available, use speaker analysis tone.
- gaps: 2-5 entries of the most significant gaps.
- If a data type is missing, do NOT fabricate data for it. Instead, note what's missing and focus your analysis on the available cross-references.
- The narrative should explicitly call out cross-references between data types (e.g., "Students were curious about X in their questions, and 80% praised the speaker's handling of X in their analyses, but only 30% mentioned it in debriefs — suggesting it didn't stick long-term").
- Be specific. Use actual theme names and patterns from the data. Avoid generic statements.`

export async function runSessionSynthesis(input: SynthesisInput): Promise<SessionSynthesis> {
  const ai = getGeminiClient()
  const model = getGeminiModel()

  const response = await ai.models.generateContent({
    model,
    contents: buildSynthesisPrompt(input),
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
    },
  })

  const raw = (response.text ?? '').trim()
  return JSON.parse(raw) as SessionSynthesis
}
