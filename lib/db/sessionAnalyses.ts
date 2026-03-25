import { createAdminClient } from '@/lib/supabase/server'
import type { SessionAnalysis } from '@/types'

export async function getSessionAnalysis(sessionId: string): Promise<SessionAnalysis | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('session_analyses')
    .select('analysis')
    .eq('session_id', sessionId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? (data.analysis as SessionAnalysis) : null
}

export async function insertSessionAnalysis(
  sessionId: string,
  userId: string,
  analysis: SessionAnalysis
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('session_analyses')
    .upsert(
      { session_id: sessionId, user_id: userId, analysis },
      { onConflict: 'session_id', ignoreDuplicates: true }
    )
  if (error) throw new Error(error.message)
}
