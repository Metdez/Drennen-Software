import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { SessionSynthesis } from '@/types'

export async function getSessionSynthesis(
  sessionId: string
): Promise<{ synthesis: SessionSynthesis; dataTypes: string[] } | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('session_syntheses')
    .select('synthesis, data_types')
    .eq('session_id', sessionId)
    .single()

  if (error) return null
  return {
    synthesis: data.synthesis as SessionSynthesis,
    dataTypes: (data.data_types as string[]) ?? [],
  }
}

export async function upsertSessionSynthesis(
  sessionId: string,
  userId: string,
  synthesis: SessionSynthesis,
  dataTypes: string[]
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('session_syntheses')
    .upsert(
      {
        session_id: sessionId,
        user_id: userId,
        synthesis: synthesis as unknown as Record<string, unknown>,
        data_types: dataTypes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'session_id' }
    )
  if (error) throw new Error(`Failed to upsert session synthesis: ${error.message}`)
}

export async function getSessionSynthesisDataTypes(
  sessionId: string
): Promise<string[] | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('session_syntheses')
    .select('data_types')
    .eq('session_id', sessionId)
    .single()

  if (error) return null
  return (data.data_types as string[]) ?? []
}
