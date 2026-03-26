import { createAdminClient, createClient } from '@/lib/supabase/server'
import type { Session, SessionShareRow, SessionShare, SessionRow, SessionAnalysis } from '@/types'
import { rowToSession } from '@/lib/utils/transforms'

function rowToSessionShare(row: SessionShareRow): SessionShare {
  return {
    id: row.id,
    sessionId: row.session_id,
    shareToken: row.share_token,
    createdAt: row.created_at,
  }
}

/** Get share info for a session (authenticated context — uses RLS) */
export async function getSessionShare(sessionId: string): Promise<SessionShare | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('session_shares')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle()

  if (error) return null
  return data ? rowToSessionShare(data as SessionShareRow) : null
}

/** Enable sharing — inserts a new row with auto-generated token */
export async function enableSessionShare(sessionId: string, userId: string): Promise<SessionShare> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('session_shares')
    .insert({ session_id: sessionId, user_id: userId })
    .select()
    .single()

  if (error) throw new Error(`Failed to enable sharing: ${error.message}`)
  return rowToSessionShare(data as SessionShareRow)
}

/** Revoke sharing — deletes the row, immediately invalidating the token */
export async function revokeSessionShare(sessionId: string, userId: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('session_shares')
    .delete()
    .eq('session_id', sessionId)
    .eq('user_id', userId)

  if (error) throw new Error(`Failed to revoke sharing: ${error.message}`)
}

/** Get session data by share token (public context — bypasses RLS) */
export async function getSessionByShareToken(token: string): Promise<Session | null> {
  const supabase = createAdminClient()

  // First verify the share token exists
  const { data: share, error: shareError } = await supabase
    .from('session_shares')
    .select('session_id')
    .eq('share_token', token)
    .maybeSingle()

  if (shareError || !share) return null

  // Fetch the full session
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', share.session_id)
    .single()

  if (sessionError || !session) return null
  return rowToSession(session as SessionRow)
}

/** Get session analysis by share token (public context — only returns cached analysis) */
export async function getSessionAnalysisByShareToken(token: string): Promise<SessionAnalysis | null> {
  const supabase = createAdminClient()

  // Verify the share token exists
  const { data: share, error: shareError } = await supabase
    .from('session_shares')
    .select('session_id')
    .eq('share_token', token)
    .maybeSingle()

  if (shareError || !share) return null

  // Fetch cached analysis
  const { data, error } = await supabase
    .from('session_analyses')
    .select('analysis')
    .eq('session_id', share.session_id)
    .maybeSingle()

  if (error || !data) return null
  return data.analysis as SessionAnalysis
}
