import { createAdminClient } from '@/lib/supabase/server'
import type { SpeakerBrief, SpeakerBriefContent, SpeakerBriefRow } from '@/types'

function rowToBrief(row: SpeakerBriefRow): SpeakerBrief {
  return {
    id: row.id,
    sessionId: row.session_id,
    userId: row.user_id,
    content: row.content,
    editedContent: row.edited_content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getSpeakerBrief(sessionId: string): Promise<SpeakerBrief | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('speaker_briefs')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? rowToBrief(data as SpeakerBriefRow) : null
}

export async function insertSpeakerBrief(
  sessionId: string,
  userId: string,
  content: SpeakerBriefContent
): Promise<SpeakerBrief> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('speaker_briefs')
    .upsert(
      { session_id: sessionId, user_id: userId, content, updated_at: new Date().toISOString() },
      { onConflict: 'session_id' }
    )
    .select()
    .single()
  if (error) throw new Error(error.message)
  return rowToBrief(data as SpeakerBriefRow)
}

export async function updateSpeakerBriefEdits(
  sessionId: string,
  editedContent: SpeakerBriefContent | null
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('speaker_briefs')
    .update({ edited_content: editedContent, updated_at: new Date().toISOString() })
    .eq('session_id', sessionId)
  if (error) throw new Error(error.message)
}
