import { createClient } from '@/lib/supabase/server'
import type { StudentSummary, StudentDetail, SessionWithSubmission } from '@/types'

export async function getStudentsWithParticipation(): Promise<StudentSummary[]> {
  const supabase = createClient()

  const [submissionsResult, sessionsResult] = await Promise.all([
    supabase.from('student_submissions').select('student_name, session_id'),
    supabase.from('sessions').select('id', { count: 'exact', head: true }),
  ])

  if (submissionsResult.error) throw new Error(`Failed to fetch submissions: ${submissionsResult.error.message}`)

  const totalSessions = sessionsResult.count ?? 0

  const map = new Map<string, Set<string>>()
  for (const row of submissionsResult.data ?? []) {
    if (!map.has(row.student_name)) map.set(row.student_name, new Set())
    map.get(row.student_name)!.add(row.session_id)
  }

  return Array.from(map.entries())
    .map(([studentName, sessionSet]) => ({
      studentName,
      sessionCount: sessionSet.size,
      totalSessions,
    }))
    .sort((a, b) => a.studentName.localeCompare(b.studentName))
}

export async function getStudentDetail(studentName: string): Promise<StudentDetail | null> {
  const supabase = createClient()

  const [submissionsResult, sessionsResult] = await Promise.all([
    supabase
      .from('student_submissions')
      .select('session_id, submission_text, filename, sessions(speaker_name, created_at)')
      .eq('student_name', studentName),
    supabase.from('sessions').select('id', { count: 'exact', head: true }),
  ])

  if (submissionsResult.error) throw new Error(`Failed to fetch student detail: ${submissionsResult.error.message}`)
  if (!submissionsResult.data?.length) return null

  const sessions: SessionWithSubmission[] = submissionsResult.data.map((row) => {
    const session = (Array.isArray(row.sessions) ? row.sessions[0] : row.sessions) as { speaker_name: string; created_at: string } | null
    return {
      sessionId: row.session_id,
      speakerName: session?.speaker_name ?? '',
      createdAt: session?.created_at ?? '',
      submissionText: row.submission_text,
      filename: row.filename ?? '',
    }
  })

  return {
    studentName,
    sessions,
    sessionCount: sessions.length,
    totalSessions: sessionsResult.count ?? 0,
  }
}
