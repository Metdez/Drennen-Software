import { GoogleGenAI } from '@google/genai'
import { createAdminClient } from '@/lib/supabase/server'
import { upsertStudentProfile } from '@/lib/db/studentProfiles'
import type { StudentProfile } from '@/types'

interface StudentSubmissionRow {
  speakerName: string
  date: string
  text: string
}

async function fetchStudentSubmissions(
  userId: string,
  studentName: string
): Promise<{ submissions: StudentSubmissionRow[]; sessionCount: number }> {
  const supabase = createAdminClient()

  const [submissionsResult, sessionsResult] = await Promise.all([
    supabase
      .from('student_submissions')
      .select('submission_text, sessions!inner(speaker_name, created_at, user_id)')
      .eq('student_name', studentName)
      .eq('sessions.user_id', userId)
      .order('created_at', { referencedTable: 'sessions', ascending: true }),
    supabase
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
  ])

  if (submissionsResult.error) throw new Error(submissionsResult.error.message)

  const submissions: StudentSubmissionRow[] = (submissionsResult.data ?? []).map((row) => {
    const session = (Array.isArray(row.sessions) ? row.sessions[0] : row.sessions) as {
      speaker_name: string
      created_at: string
    } | null
    return {
      speakerName: session?.speaker_name ?? '',
      date: session?.created_at ?? '',
      text: row.submission_text ?? '',
    }
  })

  return { submissions, sessionCount: sessionsResult.count ?? 0 }
}

function buildPrompt(studentName: string, submissions: StudentSubmissionRow[]): string {
  const submissionList = submissions
    .map((s, i) => {
      const date = new Date(s.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
      return `${i + 1}. Speaker: ${s.speakerName} (${date})\n   "${s.text}"`
    })
    .join('\n\n')

  return `You are an expert educational psychologist helping a university professor understand their students through the questions students submit before guest speaker visits.

Analyze ALL of this student's questions across ${submissions.length} session${submissions.length !== 1 ? 's' : ''} to build a comprehensive profile.

Student: "${studentName}"
Submissions (oldest first):
${submissionList}

Return a JSON object with exactly this structure:
{
  "interests": {
    "tags": ["topic1", "topic2", ...],
    "narrative": "2-3 sentences about what topics and subjects this student consistently gravitates toward based on their questions."
  },
  "careerDirection": {
    "fields": ["field1", "field2", ...],
    "narrative": "2-3 sentences about what career paths or industries this student seems drawn to, inferred from the themes and angles of their questions."
  },
  "growthTrajectory": {
    "direction": "improving" | "declining" | "stable" | "insufficient_data",
    "narrative": "2-3 sentences about how the depth, sophistication, or critical thinking in this student's questions has evolved from early to recent sessions."
  },
  "personality": {
    "traits": ["trait1", "trait2", ...],
    "narrative": "2-3 sentences about this student's intellectual style, curiosity patterns, and how they approach questioning."
  },
  "professorNotes": [
    "Actionable recommendation 1 for the professor about this student",
    "Actionable recommendation 2",
    "Actionable recommendation 3"
  ],
  "generatedAt": "${new Date().toISOString()}",
  "sessionCount": ${submissions.length}
}

Rules:
- interests.tags: 3-5 specific topic tags inferred from recurring themes across all questions
- careerDirection.fields: 2-3 career fields or industries the student's questions suggest interest in
- growthTrajectory.direction: "insufficient_data" if only 1 session; otherwise compare early vs recent question sophistication
- personality.traits: 3-5 adjective traits (e.g. "Curious", "Analytical", "Practical", "Strategic", "Empathetic")
- professorNotes: exactly 2-4 specific, actionable bullet points the professor can use (e.g. mentorship pairings, topics to explore, engagement suggestions)
- Be specific and evidence-based — reference actual patterns from the questions, not generic statements
- All narratives should be written in third person`
}

export async function generateStudentProfile(userId: string, studentName: string): Promise<void> {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY env var is not set')

  const { submissions, sessionCount } = await fetchStudentSubmissions(userId, studentName)
  if (submissions.length === 0) return

  const ai = new GoogleGenAI({ apiKey })
  const model = process.env.GEMINI_MODEL ?? 'gemini-3.1-flash-lite-preview'

  const response = await ai.models.generateContent({
    model,
    contents: buildPrompt(studentName, submissions),
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

  const analysis: StudentProfile = {
    interests: parsed.interests ?? { tags: [], narrative: '' },
    careerDirection: parsed.careerDirection ?? { fields: [], narrative: '' },
    growthTrajectory: parsed.growthTrajectory ?? { direction: 'insufficient_data', narrative: '' },
    personality: parsed.personality ?? { traits: [], narrative: '' },
    professorNotes: parsed.professorNotes ?? [],
    generatedAt: new Date().toISOString(),
    sessionCount: submissions.length,
  }

  await upsertStudentProfile(userId, studentName, analysis, sessionCount)
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
