import { createAdminClient } from '@/lib/supabase/server'
import type { StudentProfile } from '@/types'

export async function getStudentProfile(userId: string, studentName: string): Promise<StudentProfile | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('student_profiles')
    .select('analysis')
    .eq('user_id', userId)
    .eq('student_name', studentName)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? (data.analysis as StudentProfile) : null
}

export async function upsertStudentProfile(
  userId: string,
  studentName: string,
  analysis: StudentProfile,
  sessionCount: number
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('student_profiles').upsert(
    {
      user_id: userId,
      student_name: studentName,
      analysis,
      session_count: sessionCount,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,student_name' }
  )
  if (error) throw new Error(error.message)
}
