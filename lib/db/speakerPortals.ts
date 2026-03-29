import { createAdminClient } from '@/lib/supabase/server'
import type { SpeakerPortal, SpeakerPortalContent, SpeakerPortalRow, PostSessionFeedback } from '@/types'

function rowToPortal(row: SpeakerPortalRow): SpeakerPortal {
  return {
    id: row.id,
    sessionId: row.session_id,
    userId: row.user_id,
    content: row.content,
    editedContent: row.edited_content,
    postSession: row.post_session,
    shareToken: row.share_token,
    isPublished: row.is_published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getSpeakerPortal(sessionId: string): Promise<SpeakerPortal | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('speaker_portals')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? rowToPortal(data as SpeakerPortalRow) : null
}

export async function insertSpeakerPortal(
  sessionId: string,
  userId: string,
  content: SpeakerPortalContent
): Promise<SpeakerPortal> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('speaker_portals')
    .upsert(
      { session_id: sessionId, user_id: userId, content, updated_at: new Date().toISOString() },
      { onConflict: 'session_id' }
    )
    .select()
    .single()
  if (error) throw new Error(error.message)
  return rowToPortal(data as SpeakerPortalRow)
}

export async function updateSpeakerPortalEdits(
  sessionId: string,
  editedContent: SpeakerPortalContent | null
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('speaker_portals')
    .update({ edited_content: editedContent, updated_at: new Date().toISOString() })
    .eq('session_id', sessionId)
  if (error) throw new Error(error.message)
}

export async function publishSpeakerPortal(sessionId: string): Promise<string> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('speaker_portals')
    .update({ is_published: true, updated_at: new Date().toISOString() })
    .eq('session_id', sessionId)
    .select('share_token')
    .single()
  if (error) throw new Error(error.message)
  return data.share_token as string
}

export async function unpublishSpeakerPortal(sessionId: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('speaker_portals')
    .update({ is_published: false, updated_at: new Date().toISOString() })
    .eq('session_id', sessionId)
  if (error) throw new Error(error.message)
}

export async function updatePostSessionFeedback(
  sessionId: string,
  feedback: PostSessionFeedback
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('speaker_portals')
    .update({ post_session: feedback, updated_at: new Date().toISOString() })
    .eq('session_id', sessionId)
  if (error) throw new Error(error.message)
}

export async function getPortalByShareToken(
  token: string
): Promise<{ portal: SpeakerPortal; speakerName: string } | null> {
  const supabase = createAdminClient()

  const { data: portalRow, error: portalErr } = await supabase
    .from('speaker_portals')
    .select('*')
    .eq('share_token', token)
    .eq('is_published', true)
    .maybeSingle()

  if (portalErr || !portalRow) return null

  const { data: session, error: sessErr } = await supabase
    .from('sessions')
    .select('speaker_name')
    .eq('id', portalRow.session_id)
    .single()

  if (sessErr || !session) return null

  return {
    portal: rowToPortal(portalRow as SpeakerPortalRow),
    speakerName: session.speaker_name as string,
  }
}
