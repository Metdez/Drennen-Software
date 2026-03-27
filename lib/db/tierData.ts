import { createAdminClient, createClient } from '@/lib/supabase/server'
import type { TierData, SessionTierData, SessionTierDataRow } from '@/types'

function rowToTierData(row: SessionTierDataRow): SessionTierData {
  return {
    id: row.id,
    sessionId: row.session_id,
    tierCounts: row.tier_counts,
    tierAssignments: row.tier_assignments,
    createdAt: row.created_at,
  }
}

/** Upsert tier data for a session (admin context) */
export async function upsertTierData(sessionId: string, tierData: TierData): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('session_tier_data')
    .upsert(
      {
        session_id: sessionId,
        tier_counts: tierData.tierCounts,
        tier_assignments: tierData.tierAssignments,
      },
      { onConflict: 'session_id' }
    )

  if (error) throw new Error(`Failed to upsert tier data: ${error.message}`)
}

/** Get tier data for a single session */
export async function getTierData(sessionId: string): Promise<SessionTierData | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('session_tier_data')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle()

  if (error || !data) return null
  return rowToTierData(data as SessionTierDataRow)
}

/** Get tier data for multiple sessions (admin context) */
export async function getTierDataBySessionIds(
  sessionIds: string[]
): Promise<Map<string, SessionTierData>> {
  if (sessionIds.length === 0) return new Map()

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('session_tier_data')
    .select('*')
    .in('session_id', sessionIds)

  if (error || !data) return new Map()

  const map = new Map<string, SessionTierData>()
  for (const row of data) {
    const td = rowToTierData(row as SessionTierDataRow)
    map.set(td.sessionId, td)
  }
  return map
}
