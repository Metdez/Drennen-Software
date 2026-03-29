import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { StudentSummary, StudentDetail, SessionWithSubmission } from '@/types'

export async function getSubmissionsBySession(
  sessionId: string
): Promise<Array<{ student_name: string; submission_text: string; filename: string }>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('student_submissions')
    .select('student_name, submission_text, filename')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Failed to fetch submissions for session: ${error.message}`)
  return (data ?? []).map((row) => ({
    student_name: row.student_name ?? '',
    submission_text: row.submission_text ?? '',
    filename: row.filename ?? '',
  }))
}

/**
 * Returns distinct student names for a session (lighter than getSubmissionsBySession).
 */
export async function getStudentNamesBySession(sessionId: string): Promise<string[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('student_submissions')
    .select('student_name')
    .eq('session_id', sessionId)

  if (error) throw new Error(`Failed to fetch student names: ${error.message}`)
  const names = new Set((data ?? []).map(r => r.student_name as string))
  return [...names].sort()
}

export async function getStudentsWithParticipation(semesterId?: string): Promise<StudentSummary[]> {
  const supabase = createClient()

  if (semesterId) {
    // Semester-scoped: first get session IDs for this semester, then filter submissions
    const { data: semSessions, error: semErr } = await supabase
      .from('sessions')
      .select('id')
      .eq('semester_id', semesterId)
    if (semErr) throw new Error(`Failed to fetch semester sessions: ${semErr.message}`)

    const sessionIds = (semSessions ?? []).map(s => s.id)
    if (sessionIds.length === 0) return []

    const { data: subs, error: subErr } = await supabase
      .from('student_submissions')
      .select('student_name, session_id')
      .in('session_id', sessionIds)
    if (subErr) throw new Error(`Failed to fetch submissions: ${subErr.message}`)

    const map = new Map<string, Set<string>>()
    for (const row of subs ?? []) {
      if (!map.has(row.student_name)) map.set(row.student_name, new Set())
      map.get(row.student_name)!.add(row.session_id)
    }

    return Array.from(map.entries())
      .map(([studentName, sessionSet]) => ({
        studentName,
        sessionCount: sessionSet.size,
        totalSessions: sessionIds.length,
      }))
      .sort((a, b) => a.studentName.localeCompare(b.studentName))
  }

  // Unscoped: original behavior
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

export async function getStudentDetail(studentName: string, semesterId?: string): Promise<StudentDetail | null> {
  const supabase = createClient()

  let submissionsQuery = supabase
    .from('student_submissions')
    .select('session_id, submission_text, filename, sessions(speaker_name, created_at, semester_id)')
    .eq('student_name', studentName)
  if (semesterId) {
    submissionsQuery = submissionsQuery.eq('sessions.semester_id', semesterId)
  }

  let sessionsCountQuery = supabase.from('sessions').select('id', { count: 'exact', head: true })
  if (semesterId) sessionsCountQuery = sessionsCountQuery.eq('semester_id', semesterId)

  // Fetch debrief and speaker analysis submissions for this student in parallel
  const debriefQuery = supabase
    .from('student_debrief_submissions')
    .select('session_id, submission_text')
    .eq('student_name', studentName)

  const speakerAnalysisQuery = supabase
    .from('student_speaker_analysis_submissions')
    .select('session_id, submission_text')
    .eq('student_name', studentName)

  const [submissionsResult, sessionsResult, debriefResult, speakerAnalysisResult] = await Promise.all([
    submissionsQuery,
    sessionsCountQuery,
    debriefQuery,
    speakerAnalysisQuery,
  ])

  if (submissionsResult.error) throw new Error(`Failed to fetch student detail: ${submissionsResult.error.message}`)
  if (!submissionsResult.data?.length) return null

  // Build a map of session_id → debrief text for quick lookup
  const debriefMap = new Map<string, string>()
  for (const row of debriefResult.data ?? []) {
    debriefMap.set(row.session_id, row.submission_text)
  }

  // Build a map of session_id → speaker analysis text for quick lookup
  const speakerAnalysisMap = new Map<string, string>()
  for (const row of speakerAnalysisResult.data ?? []) {
    speakerAnalysisMap.set(row.session_id, row.submission_text)
  }

  const sessions: SessionWithSubmission[] = submissionsResult.data.map((row) => {
    const session = (Array.isArray(row.sessions) ? row.sessions[0] : row.sessions) as { speaker_name: string; created_at: string } | null
    return {
      sessionId: row.session_id,
      speakerName: session?.speaker_name ?? '',
      createdAt: session?.created_at ?? '',
      submissionText: row.submission_text,
      filename: row.filename ?? '',
      debriefText: debriefMap.get(row.session_id),
      speakerAnalysisText: speakerAnalysisMap.get(row.session_id),
    }
  })

  return {
    studentName,
    sessions,
    sessionCount: sessions.length,
    totalSessions: sessionsResult.count ?? 0,
  }
}
