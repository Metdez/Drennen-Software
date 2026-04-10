/**
 * @file lib/db/studentSubmissions.ts
 *
 * Queries the `student_submissions` table to power the roster page, student
 * detail profiles, and the debrief/speaker-analysis submission views.
 *
 * Each row in `student_submissions` represents one student's question
 * submission for one session. Student names are derived from ZIP filenames
 * at upload time (`FirstName_LastName...` format).
 *
 * Also reads from `student_debrief_submissions` and
 * `student_speaker_analysis_submissions` (both stored in separate tables) to
 * build the full per-student detail view that spans all three submission types.
 *
 * Table(s):
 *   - `student_submissions` (primary)
 *   - `sessions` (FK join for semester scoping and speaker names)
 *   - `student_debrief_submissions` (in getStudentDetail)
 *   - `student_speaker_analysis_submissions` (in getStudentDetail)
 *
 * Client:
 *   - getSubmissionsBySession: createClient() — RLS enforced
 *   - getStudentNamesBySession: createAdminClient() — called from background
 *     AI jobs that do not have a cookie context
 *   - getStudentsWithParticipation / getStudentDetail: createClient() — RLS
 *     enforced (professor sees only their own sessions' students)
 */

import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { StudentSummary, StudentDetail, SessionWithSubmission } from '@/types'

/**
 * Returns all raw submissions (text + filename) for a session, ordered by
 * submission time. Used when the AI or export layer needs the full text of
 * each student's questions.
 *
 * @param sessionId - The session UUID to fetch submissions for.
 * @returns Array of `{ student_name, submission_text, filename }` rows.
 * @throws Error if the query fails.
 *
 * Called by: app/api/sessions/[id]/speaker-analyses/route.ts,
 *            app/api/sessions/[id]/student-debriefs/route.ts
 * Table: student_submissions
 * Client: createClient() — RLS enforced
 */
/**
 * Returns all raw submissions (text + filename) for a session, ordered by
 * submission time. Used when the AI or export layer needs the full text of
 * each student's questions.
 *
 * @param sessionId - The session UUID to fetch submissions for.
 * @returns Array of `{ student_name, submission_text, filename }` rows.
 * @throws Error if the query fails.
 *
 * Called by: app/api/sessions/[id]/speaker-analyses/route.ts,
 *             app/api/sessions/[id]/student-debriefs/route.ts
 * Table: student_submissions
 * Client: createClient() — RLS enforced
 */
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
 * Returns a sorted, deduplicated list of student names for a session.
 *
 * Intentionally fetches only `student_name` (no submission text) so this is
 * cheap to call from background jobs that only need to know which students
 * participated. Deduplication is done in-memory via a Set rather than SQL
 * DISTINCT because PostgREST doesn't support SELECT DISTINCT.
 *
 * @param sessionId - The session UUID.
 * @returns Sorted array of unique student name strings.
 * @throws Error if the query fails.
 *
 * Called by: lib/ai/studentProfile.ts (enumerates students before profile generation)
 * Table: student_submissions
 * Client: createAdminClient() — bypasses RLS (background job, no request cookie)
 */
/**
 * Returns a sorted, deduplicated list of student names for a session.
 *
 * Intentionally fetches only `student_name` (no submission text) so this is
 * cheap to call from background jobs that only need to know which students
 * participated. Deduplication is done in-memory via a Set rather than SQL
 * DISTINCT because PostgREST doesn't support SELECT DISTINCT.
 *
 * @param sessionId - The session UUID.
 * @returns Sorted array of unique student name strings.
 * @throws Error if the query fails.
 *
 * Called by: lib/ai/studentProfile.ts (enumerates students before profile generation)
 * Table: student_submissions
 * Client: createAdminClient() — bypasses RLS (background job, no request cookie)
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

/**
 * Builds the roster list: all students who have ever submitted at least one
 * question, with their participation counts relative to total sessions.
 *
 * When `semesterId` is provided, participation is scoped to that semester only:
 * a two-step query fetches the semester's session IDs first, then filters
 * submissions. This two-step approach is necessary because PostgREST cannot
 * filter a many-to-many join on a related table's column directly when doing
 * a count on the parent side.
 *
 * When unscoped, both queries run in parallel via `Promise.all` for efficiency.
 *
 * @param semesterId - Optional semester UUID. When omitted, all sessions for
 *   the professor (as determined by RLS) are included.
 * @returns Array of `StudentSummary` objects sorted alphabetically by name,
 *   each with `sessionCount` (sessions participated in) and `totalSessions`
 *   (denominator for the participation rate display).
 * @throws Error if any query fails.
 *
 * Called by: app/api/roster/route.ts (GET)
 * Table: student_submissions, sessions
 * Client: createClient() — RLS enforced (professor sees only their own data)
 */
/**
 * Builds the roster list: all students who have ever submitted at least one
 * question, with their participation counts relative to total sessions.
 *
 * When `semesterId` is provided, participation is scoped to that semester only:
 * a two-step query fetches the semester's session IDs first, then filters
 * submissions. This two-step approach is necessary because PostgREST cannot
 * filter a many-to-many join on a related table's column directly when doing
 * a count on the parent side.
 *
 * When unscoped, both queries run in parallel via `Promise.all` for efficiency.
 *
 * @param semesterId - Optional semester UUID. When omitted, all sessions for
 *   the professor (as determined by RLS) are included.
 * @returns Array of `StudentSummary` objects sorted alphabetically by name,
 *   each with `sessionCount` (sessions participated in) and `totalSessions`
 *   (denominator for the participation rate display).
 * @throws Error if any query fails.
 *
 * Called by: app/api/roster/route.ts (GET)
 * Table: student_submissions, sessions
 * Client: createClient() — RLS enforced (professor sees only their own data)
 */
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

/**
 * Fetches the full per-student detail view, joining all three submission types
 * (questions, debrief reflections, and speaker analyses) for a single student.
 *
 * Four queries run in parallel via `Promise.all`:
 *   1. Question submissions (with joined session metadata)
 *   2. Total session count (for participation rate denominator)
 *   3. Student debrief reflection submissions
 *   4. Student speaker analysis submissions
 *
 * Returns `null` (rather than throwing) when the student has no question
 * submissions — this signals a 404 to the API route without an exception.
 *
 * Note on the PostgREST join syntax: `.eq('sessions.semester_id', semesterId)`
 * filters the joined `sessions` row by semester, which means submissions whose
 * parent session belongs to a different semester are excluded from the result
 * set even though the student row itself is not scoped to a semester.
 *
 * @param studentName - The canonical student name (matches
 *   `student_submissions.student_name`).
 * @param semesterId - Optional semester UUID to scope the view.
 * @returns `StudentDetail` with a `sessions` array containing all submission
 *   types per session, or `null` if the student has no question submissions.
 * @throws Error if the primary submissions query fails.
 *
 * Called by: app/api/roster/[studentName]/route.ts (GET)
 * Table: student_submissions, sessions, student_debrief_submissions,
 *        student_speaker_analysis_submissions
 * Client: createClient() — RLS enforced
 */
/**
 * Fetches the full per-student detail view, joining all three submission types
 * (questions, debrief reflections, and speaker analyses) for a single student.
 *
 * Four queries run in parallel via `Promise.all`:
 *   1. Question submissions (with joined session metadata)
 *   2. Total session count (for participation rate denominator)
 *   3. Student debrief reflection submissions
 *   4. Student speaker analysis submissions
 *
 * Returns `null` (rather than throwing) when the student has no question
 * submissions — this signals a 404 to the API route without an exception.
 *
 * Note on the PostgREST join syntax: `.eq('sessions.semester_id', semesterId)`
 * filters the joined `sessions` row by semester, which means submissions whose
 * parent session belongs to a different semester are excluded from the result
 * set even though the student row itself is not scoped to a semester.
 *
 * @param studentName - The canonical student name (matches
 *   `student_submissions.student_name`).
 * @param semesterId - Optional semester UUID to scope the view.
 * @returns `StudentDetail` with a `sessions` array containing all submission
 *   types per session, or `null` if the student has no question submissions.
 * @throws Error if the primary submissions query fails.
 *
 * Called by: app/api/roster/[studentName]/route.ts (GET)
 * Table: student_submissions, sessions, student_debrief_submissions,
 *         student_speaker_analysis_submissions
 * Client: createClient() — RLS enforced
 */
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
