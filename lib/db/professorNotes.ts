import { createAdminClient } from '@/lib/supabase/server'
import type { ProfessorNote } from '@/types'

export async function getProfessorNotes(userId: string, studentName: string): Promise<ProfessorNote[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('professor_student_notes')
    .select('id, student_name, note_text, flagged_for_followup, created_at')
    .eq('user_id', userId)
    .eq('student_name', studentName)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => ({
    id: row.id,
    studentName: row.student_name,
    noteText: row.note_text,
    flaggedForFollowup: row.flagged_for_followup,
    createdAt: row.created_at,
  }))
}

export async function addProfessorNote(
  userId: string,
  studentName: string,
  text: string
): Promise<ProfessorNote> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('professor_student_notes')
    .insert({ user_id: userId, student_name: studentName, note_text: text })
    .select('id, student_name, note_text, flagged_for_followup, created_at')
    .single()

  if (error) throw new Error(error.message)

  return {
    id: data.id,
    studentName: data.student_name,
    noteText: data.note_text,
    flaggedForFollowup: data.flagged_for_followup,
    createdAt: data.created_at,
  }
}

export async function deleteProfessorNote(noteId: string, userId: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('professor_student_notes')
    .delete()
    .eq('id', noteId)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)
}

export async function toggleFollowupFlag(noteId: string, userId: string): Promise<boolean> {
  const supabase = createAdminClient()

  // Read current value
  const { data: current, error: readErr } = await supabase
    .from('professor_student_notes')
    .select('flagged_for_followup')
    .eq('id', noteId)
    .eq('user_id', userId)
    .single()

  if (readErr) throw new Error(readErr.message)

  const newValue = !current.flagged_for_followup

  const { error: updateErr } = await supabase
    .from('professor_student_notes')
    .update({ flagged_for_followup: newValue })
    .eq('id', noteId)
    .eq('user_id', userId)

  if (updateErr) throw new Error(updateErr.message)

  return newValue
}

/**
 * Returns student names that have at least one note flagged for follow-up.
 */
export async function getStudentsWithFollowupFlags(userId: string): Promise<Set<string>> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('professor_student_notes')
    .select('student_name')
    .eq('user_id', userId)
    .eq('flagged_for_followup', true)

  if (error) throw new Error(error.message)

  return new Set((data ?? []).map((row) => row.student_name))
}
