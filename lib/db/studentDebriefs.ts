import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { ParsedSubmission } from '@/lib/parse/builder'
import type { StudentDebriefAnalysis } from '@/types'

export async function insertStudentDebriefSubmissions(
  sessionId: string,
  submissions: ParsedSubmission[]
): Promise<void> {
  if (submissions.length === 0) return
  const supabase = createAdminClient()
  const rows = submissions.map((s) => ({
    session_id: sessionId,
    student_name: s.studentName,
    filename: s.filename,
    submission_text: s.text,
  }))
  const { error } = await supabase.from('student_debrief_submissions').insert(rows)
  if (error) throw new Error(`Failed to insert student debrief submissions: ${error.message}`)
}

export async function deleteStudentDebriefSubmissions(sessionId: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('student_debrief_submissions')
    .delete()
    .eq('session_id', sessionId)
  if (error) throw new Error(`Failed to delete student debrief submissions: ${error.message}`)
}

export async function getStudentDebriefsBySession(
  sessionId: string
): Promise<Array<{ student_name: string; submission_text: string; filename: string }>> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('student_debrief_submissions')
    .select('student_name, submission_text, filename')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Failed to fetch student debrief submissions: ${error.message}`)
  return (data ?? []).map((row) => ({
    student_name: row.student_name ?? '',
    submission_text: row.submission_text ?? '',
    filename: row.filename ?? '',
  }))
}

export async function hasStudentDebriefs(sessionId: string): Promise<boolean> {
  const supabase = createClient()
  const { count, error } = await supabase
    .from('student_debrief_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', sessionId)

  if (error) return false
  return (count ?? 0) > 0
}

export async function upsertStudentDebriefAnalysis(
  sessionId: string,
  userId: string,
  analysis: StudentDebriefAnalysis,
  fileCount: number
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('student_debrief_analyses')
    .upsert(
      {
        session_id: sessionId,
        user_id: userId,
        analysis: analysis as unknown as Record<string, unknown>,
        file_count: fileCount,
      },
      { onConflict: 'session_id' }
    )
  if (error) throw new Error(`Failed to upsert student debrief analysis: ${error.message}`)
}

export async function getStudentDebriefAnalysis(
  sessionId: string
): Promise<{ analysis: StudentDebriefAnalysis; fileCount: number } | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('student_debrief_analyses')
    .select('analysis, file_count')
    .eq('session_id', sessionId)
    .single()

  if (error) return null
  return {
    analysis: data.analysis as StudentDebriefAnalysis,
    fileCount: data.file_count as number,
  }
}
