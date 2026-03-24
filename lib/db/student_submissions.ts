import { createAdminClient } from '@/lib/supabase/server'
import type { CreateStudentSubmissionsInput } from '@/types'

export async function insertStudentSubmissions(
  input: CreateStudentSubmissionsInput
): Promise<void> {
  if (input.students.length === 0) return

  const supabase = createAdminClient()
  const rows = input.students.map(s => ({
    session_id: input.sessionId,
    student_name: s.name,
    raw_text: s.rawText,
  }))

  const { error } = await supabase.from('student_submissions').insert(rows)
  if (error) throw new Error(`Failed to insert student submissions: ${error.message}`)
}
