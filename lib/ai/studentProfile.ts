import { getGeminiClient, getGeminiModel } from '@/lib/ai/geminiClient'
import { createAdminClient } from '@/lib/supabase/server'
import { upsertStudentProfile } from '@/lib/db/studentProfiles'
import type { StudentProfile, GrowthIntelligence } from '@/types'

interface StudentSessionData {
  sessionId: string
  speakerName: string
  date: string
  questions: string
  reflection: string | null
  speakerAnalysis: string | null
}

async function fetchAllStudentData(
  userId: string,
  studentName: string
): Promise<{ sessions: StudentSessionData[]; totalSessionCount: number }> {
  const supabase = createAdminClient()

  const [submissionsResult, sessionsResult, debriefResult, speakerAnalysisResult] = await Promise.all([
    supabase
      .from('student_submissions')
      .select('session_id, submission_text, sessions!inner(id, speaker_name, created_at, user_id)')
      .eq('student_name', studentName)
      .eq('sessions.user_id', userId)
      .order('created_at', { referencedTable: 'sessions', ascending: true }),
    supabase
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('student_debrief_submissions')
      .select('session_id, submission_text')
      .eq('student_name', studentName),
    supabase
      .from('student_speaker_analysis_submissions')
      .select('session_id, submission_text')
      .eq('student_name', studentName),
  ])

  if (submissionsResult.error) throw new Error(submissionsResult.error.message)

  const debriefMap = new Map<string, string>()
  for (const row of debriefResult.data ?? []) {
    debriefMap.set(row.session_id, row.submission_text)
  }

  const analysisMap = new Map<string, string>()
  for (const row of speakerAnalysisResult.data ?? []) {
    analysisMap.set(row.session_id, row.submission_text)
  }

  const sessions: StudentSessionData[] = (submissionsResult.data ?? []).map((row) => {
    const session = (Array.isArray(row.sessions) ? row.sessions[0] : row.sessions) as {
      id: string
      speaker_name: string
      created_at: string
    } | null
    const sessionId = session?.id ?? row.session_id
    return {
      sessionId,
      speakerName: session?.speaker_name ?? '',
      date: session?.created_at ?? '',
      questions: row.submission_text ?? '',
      reflection: debriefMap.get(sessionId) ?? null,
      speakerAnalysis: analysisMap.get(sessionId) ?? null,
    }
  })

  return { sessions, totalSessionCount: sessionsResult.count ?? 0 }
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

function buildPrompt(studentName: string, sessions: StudentSessionData[]): string {
  const FULL_SESSIONS = 5
  const TRUNCATE_LENGTH = 300

  const submissionList = sessions
    .map((s, i) => {
      const date = new Date(s.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
      const isRecent = i >= sessions.length - FULL_SESSIONS
      const questionText = isRecent ? s.questions : truncateText(s.questions, TRUNCATE_LENGTH)

      let entry = `Session ${i + 1}: ${s.speakerName} (${date}) [id: ${s.sessionId}]\n`
      entry += `  Pre-Session Questions: "${questionText}"`

      if (s.reflection) {
        const reflectionText = isRecent ? s.reflection : truncateText(s.reflection, TRUNCATE_LENGTH)
        entry += `\n  Post-Session Reflection: "${reflectionText}"`
      }

      if (s.speakerAnalysis) {
        const analysisText = isRecent ? s.speakerAnalysis : truncateText(s.speakerAnalysis, TRUNCATE_LENGTH)
        entry += `\n  Speaker Analysis: "${analysisText}"`
      }

      return entry
    })
    .join('\n\n')

  const hasReflections = sessions.some((s) => s.reflection)
  const hasAnalyses = sessions.some((s) => s.speakerAnalysis)
  const dataNote = !hasReflections && !hasAnalyses
    ? '\nNote: Only pre-session questions are available. Reflections and speaker analyses have not been submitted yet. Base your growth analysis on questions only, and note where additional data would enrich the analysis.'
    : ''

  return `You are an expert educational psychologist helping a university professor understand their students' intellectual growth. This is NOT a grading tool — it is a development and engagement tool. Your analysis should be narrative, qualitative, and focused on understanding, not judging.

Analyze ALL of this student's submissions across ${sessions.length} session${sessions.length !== 1 ? 's' : ''} to build a comprehensive profile with deep growth intelligence.

Student: "${studentName}"
Submissions (oldest first):
${submissionList}
${dataNote}

Return a JSON object with exactly this structure:
{
  "interests": {
    "tags": ["topic1", "topic2", ...],
    "observations": ["Short, punchy observation about their topics.", "Another brief observation."]
  },
  "careerDirection": {
    "fields": ["field1", "field2", ...],
    "observations": ["Short point about their career leanings."]
  },
  "growthTrajectory": {
    "direction": "improving" | "declining" | "stable" | "insufficient_data",
    "observations": ["Detail about current growth trajectory."]
  },
  "personality": {
    "traits": ["trait1", "trait2", ...],
    "observations": ["Short observation on intellectual style."]
  },
  "professorNotes": ["Recommendation 1", "Recommendation 2", "Recommendation 3"],
  "growthIntelligence": {
    "overallSignal": "Accelerating" | "Deepening" | "Emerging" | "Consistent" | "Plateauing" | "New",
    "thinkingArc": {
      "currentPhase": "Brief label of where they are now, e.g. 'Developing analytical depth'",
      "observations": ["Short specific detail on how thinking has evolved.", "Another detail."],
      "evidenceHighlights": ["Direct quote or paraphrase from an early session", "Direct quote or paraphrase from a recent session", "Optional: a pivotal moment"]
    },
    "themeEvolution": {
      "coherenceLabel": "focused" | "broadening" | "scattered" | "converging",
      "recurringThreads": ["thread1", "thread2", ...],
      "observations": ["Detail about thread coherence or scattering."]
    },
    "criticalThinking": {
      "currentLevel": "Brief label, e.g. 'Evaluative with emerging integration'",
      "observations": ["Point about analytical quality changes."],
      "strongestArea": "The dimension of critical thinking where this student excels",
      "growthEdge": "Where they could push further with the right encouragement"
    },
    "engagementPattern": {
      "consistencyLabel": "steady" | "improving" | "declining" | "sporadic",
      "depthTrend": "deepening" | "stable" | "thinning",
      "observations": ["Point about participation/sentiment changes."]
    },
    "snapshots": [
      {
        "sessionId": "the session id",
        "speakerName": "speaker name",
        "date": "the date string",
        "phase": "surface" | "emerging" | "developing" | "sophisticated",
        "thinkingLabel": "e.g. Descriptive, Analytical, Evaluative, Integrative",
        "engagementLabel": "e.g. Brief, Engaged, Deep, Exceptional",
        "themes": ["theme1", "theme2"],
        "narrative": "One sentence describing this session's contribution to the student's growth story."
      }
    ],
    "aiRecommendations": [
      "Specific, actionable recommendation for the professor about this student",
      "Another recommendation",
      "Another recommendation"
    ],
    "semesterHighlight": "1-2 sentences summarizing the most notable aspect of this student's development, suitable for inclusion in a semester report."
  },
  "generatedAt": "${new Date().toISOString()}",
  "sessionCount": ${sessions.length}
}

Rules:
- interests.tags: 3-5 specific topic tags
- careerDirection.fields: 2-3 career fields
- growthTrajectory.direction: "insufficient_data" if only 1 session
- personality.traits: 3-5 adjective traits
- professorNotes: 2-4 actionable recommendations
- overallSignal: Use "New" if only 1 session. Use "Accelerating" for rapid improvement, "Deepening" for steady deepening, "Emerging" for early-stage growth, "Consistent" for stable engagement, "Plateauing" for stalled growth.
- snapshots: One per session, in chronological order. Use the actual session IDs, speaker names, and dates from the data.
- thinkingArc.evidenceHighlights: 2-3 items, use actual quotes or close paraphrases from submissions
- aiRecommendations: 3-4 specific recommendations
- Observations should be formatted as 1-2 punchy, highly specific bullet points rather than paragraphs.
- Be specific and evidence-based — reference actual patterns, not generic statements
- This is about understanding engagement and development, not assigning grades`
}

export async function generateStudentProfile(userId: string, studentName: string): Promise<void> {
  const { sessions, totalSessionCount } = await fetchAllStudentData(userId, studentName)
  if (sessions.length === 0) return

  const ai = getGeminiClient()

  const response = await ai.models.generateContent({
    model: getGeminiModel(),
    contents: buildPrompt(studentName, sessions),
    config: {
      responseMimeType: 'application/json',
      systemInstruction:
        'You are an expert educational psychologist. Always respond with valid JSON matching the requested schema exactly.',
    },
  })

  const raw = (response.text ?? '').trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()

  const parsed = JSON.parse(raw) as Partial<StudentProfile>

  const defaultGrowthIntelligence: GrowthIntelligence = {
    overallSignal: 'New',
    thinkingArc: { currentPhase: '', observations: [], evidenceHighlights: [] },
    themeEvolution: { coherenceLabel: 'scattered', recurringThreads: [], observations: [] },
    criticalThinking: { currentLevel: '', observations: [], strongestArea: '', growthEdge: '' },
    engagementPattern: { consistencyLabel: 'steady', depthTrend: 'stable', observations: [] },
    snapshots: [],
    aiRecommendations: [],
    semesterHighlight: '',
  }

  // Handle legacy schema by checking for "narrative" or "progression" mapped to "observations"
  const getObs = (obj: any, keys: string[]) => {
    if (!obj) return []
    if (obj.observations) return obj.observations
    for (const k of keys) {
      if (obj[k]) return [obj[k]]
    }
    return []
  }

  const analysis: StudentProfile = {
    interests: {
      tags: parsed.interests?.tags || [],
      observations: getObs(parsed.interests, ['narrative'])
    },
    careerDirection: {
      fields: parsed.careerDirection?.fields || [],
      observations: getObs(parsed.careerDirection, ['narrative'])
    },
    growthTrajectory: {
      direction: parsed.growthTrajectory?.direction || 'insufficient_data',
      observations: getObs(parsed.growthTrajectory, ['narrative'])
    },
    personality: {
      traits: parsed.personality?.traits || [],
      observations: getObs(parsed.personality, ['narrative'])
    },
    professorNotes: parsed.professorNotes ?? [],
    growthIntelligence: parsed.growthIntelligence
      ? {
          overallSignal: parsed.growthIntelligence.overallSignal ?? defaultGrowthIntelligence.overallSignal,
          thinkingArc: {
            currentPhase: parsed.growthIntelligence.thinkingArc?.currentPhase ?? '',
            observations: getObs(parsed.growthIntelligence.thinkingArc, ['progression']),
            evidenceHighlights: parsed.growthIntelligence.thinkingArc?.evidenceHighlights ?? []
          },
          themeEvolution: {
            coherenceLabel: parsed.growthIntelligence.themeEvolution?.coherenceLabel ?? 'scattered',
            recurringThreads: parsed.growthIntelligence.themeEvolution?.recurringThreads ?? [],
            observations: getObs(parsed.growthIntelligence.themeEvolution, ['narrative'])
          },
          criticalThinking: {
            currentLevel: parsed.growthIntelligence.criticalThinking?.currentLevel ?? '',
            observations: getObs(parsed.growthIntelligence.criticalThinking, ['progression']),
            strongestArea: parsed.growthIntelligence.criticalThinking?.strongestArea ?? '',
            growthEdge: parsed.growthIntelligence.criticalThinking?.growthEdge ?? ''
          },
          engagementPattern: {
            consistencyLabel: parsed.growthIntelligence.engagementPattern?.consistencyLabel ?? 'steady',
            depthTrend: parsed.growthIntelligence.engagementPattern?.depthTrend ?? 'stable',
            observations: getObs(parsed.growthIntelligence.engagementPattern, ['narrative'])
          },
          snapshots: parsed.growthIntelligence.snapshots ?? [],
          aiRecommendations: parsed.growthIntelligence.aiRecommendations ?? [],
          semesterHighlight: parsed.growthIntelligence.semesterHighlight ?? ''
        }
      : defaultGrowthIntelligence,
    generatedAt: new Date().toISOString(),
    sessionCount: sessions.length,
  }

  await upsertStudentProfile(userId, studentName, analysis, totalSessionCount)
}

export async function generateStudentProfiles(
  userId: string,
  affectedStudentNames: string[]
): Promise<void> {
  const CHUNK_SIZE = 5

  for (let i = 0; i < affectedStudentNames.length; i += CHUNK_SIZE) {
    const chunk = affectedStudentNames.slice(i, i + CHUNK_SIZE)
    const results = await Promise.allSettled(
      chunk.map((name) => generateStudentProfile(userId, name))
    )

    for (const result of results) {
      if (result.status === 'rejected') {
        console.error('[studentProfile] individual generation failed:', result.reason)
      }
    }
  }
}
