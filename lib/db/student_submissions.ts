import { createClient } from '@/lib/supabase/server'
import type { StudentSummary, StudentDetail, SessionWithSubmission } from '@/types'

export async function getStudentsWithParticipation(): Promise<StudentSummary[]> {
  const supabase = createClient()

  // Total sessions owned by the current user (RLS-scoped)
  const { count: totalSessions, error: countError } = await supabase
    .from('sessions')
    .select('*', { count: 'exact', head: true })

  if (countError) throw new Error(`Failed to count sessions: ${countError.message}`)

  // All submissions visible to this user (RLS policy joins through sessions.user_id)
  const { data, error } = await supabase
    .from('student_submissions')
    .select('student_name, session_id')

  if (error) throw new Error(`Failed to fetch student submissions: ${error.message}`)

  // Aggregate: group by student_name, count unique session_ids
  const studentMap = new Map<string, Set<string>>()
  for (const row of data ?? []) {
    if (!studentMap.has(row.student_name)) {
      studentMap.set(row.student_name, new Set())
    }
    studentMap.get(row.student_name)!.add(row.session_id)
  }

  return Array.from(studentMap.entries())
    .map(([studentName, sessionIds]) => ({
      studentName,
      sessionCount: sessionIds.size,
      totalSessions: totalSessions ?? 0,
    }))
    .sort((a, b) => a.studentName.localeCompare(b.studentName))
}

export async function getStudentDetail(studentName: string): Promise<StudentDetail | null> {
  const supabase = createClient()

  // Total sessions for this professor (RLS-scoped)
  const { count: totalSessions, error: countError } = await supabase
    .from('sessions')
    .select('*', { count: 'exact', head: true })

  if (countError) throw new Error(`Failed to count sessions: ${countError.message}`)

  // All submissions for this student (RLS policy scopes to current user's sessions)
  const { data, error } = await supabase
    .from('student_submissions')
    .select('session_id, filename, submission_text, sessions!inner(id, speaker_name, created_at)')
    .eq('student_name', studentName)

  if (error) throw new Error(`Failed to fetch student detail: ${error.message}`)

  if (!data || data.length === 0) return null

  const sessions: SessionWithSubmission[] = (data as unknown as Array<{
    session_id: string
    filename: string
    submission_text: string
    sessions: { id: string; speaker_name: string; created_at: string }
  }>)
    .map((row) => ({
      sessionId: row.session_id,
      speakerName: row.sessions.speaker_name,
      createdAt: row.sessions.created_at,
      submissionText: row.submission_text,
      filename: row.filename,
    }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return {
    studentName,
    sessions,
    sessionCount: sessions.length,
    totalSessions: totalSessions ?? 0,
  }
}
