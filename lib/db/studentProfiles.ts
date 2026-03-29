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
  const growthSignal = analysis.growthIntelligence?.overallSignal ?? null
  const { error } = await supabase.from('student_profiles').upsert(
    {
      user_id: userId,
      student_name: studentName,
      analysis,
      session_count: sessionCount,
      growth_signal: growthSignal,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,student_name' }
  )
  if (error) throw new Error(error.message)
}

/**
 * Returns a map of student_name → growth_signal for the roster display.
 */
export async function getGrowthSignalsForUser(userId: string): Promise<Map<string, string>> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('student_profiles')
    .select('student_name, growth_signal')
    .eq('user_id', userId)
    .not('growth_signal', 'is', null)

  if (error) throw new Error(error.message)

  const map = new Map<string, string>()
  for (const row of data ?? []) {
    if (row.growth_signal) map.set(row.student_name, row.growth_signal)
  }
  return map
}
