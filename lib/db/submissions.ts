import { createAdminClient, createClient } from '@/lib/supabase/server'
import type { StudentSubmission, StudentSubmissionRow } from '@/types'

function rowToStudentSubmission(row: StudentSubmissionRow): StudentSubmission {
  return {
    id: row.id,
    sessionId: row.session_id,
    studentName: row.student_name,
    submissionText: row.submission_text,
    score: row.score,
    explanation: row.explanation,
    scoredAt: row.scored_at,
    createdAt: row.created_at,
  }
}

export async function getSubmissionsForScoring(
  sessionId: string
): Promise<Array<{ id: string; submissionText: string }>> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('student_submissions')
    .select('id, submission_text')
    .eq('session_id', sessionId)
    .is('score', null)

  if (error) throw new Error(`Failed to fetch submissions for scoring: ${error.message}`)
  return (data as { id: string; submission_text: string }[]).map((row) => ({
    id: row.id,
    submissionText: row.submission_text,
  }))
}

export async function updateSubmissionScore(
  id: string,
  score: number,
  explanation: string
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('student_submissions')
    .update({ score, explanation, scored_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(`Failed to update submission score: ${error.message}`)
}

export async function getSubmissionsBySession(sessionId: string): Promise<StudentSubmission[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('student_submissions')
    .select('id, session_id, student_name, submission_text, score, explanation, scored_at, created_at')
    .eq('session_id', sessionId)
    .order('score', { ascending: false, nullsFirst: false })
    .order('student_name', { ascending: true })

  if (error) throw new Error(`Failed to fetch submissions: ${error.message}`)
  return (data as StudentSubmissionRow[]).map(rowToStudentSubmission)
}
