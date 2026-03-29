import { createAdminClient, createClient } from '@/lib/supabase/server'
import type { ComparativeAnalysis, SavedComparison, SavedComparisonRow } from '@/types'

function rowToComparison(row: SavedComparisonRow): SavedComparison {
  return {
    id: row.id,
    userId: row.user_id,
    sessionIdA: row.session_id_a,
    sessionIdB: row.session_id_b,
    aiComparison: row.ai_comparison,
    shareToken: row.share_token,
    createdAt: row.created_at,
  }
}

/** Normalize session IDs so a < b to match the CHECK constraint. */
function normalizeIds(idA: string, idB: string): [string, string] {
  return idA < idB ? [idA, idB] : [idB, idA]
}

export async function getComparison(
  userId: string,
  sessionIdA: string,
  sessionIdB: string
): Promise<SavedComparison | null> {
  const [a, b] = normalizeIds(sessionIdA, sessionIdB)
  const supabase = createClient()
  const { data, error } = await supabase
    .from('saved_comparisons')
    .select('*')
    .eq('user_id', userId)
    .eq('session_id_a', a)
    .eq('session_id_b', b)
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch comparison: ${error.message}`)
  return data ? rowToComparison(data as SavedComparisonRow) : null
}

export async function upsertComparison(
  userId: string,
  sessionIdA: string,
  sessionIdB: string,
  analysis: ComparativeAnalysis
): Promise<SavedComparison> {
  const [a, b] = normalizeIds(sessionIdA, sessionIdB)
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('saved_comparisons')
    .upsert(
      {
        user_id: userId,
        session_id_a: a,
        session_id_b: b,
        ai_comparison: analysis,
      },
      { onConflict: 'user_id,session_id_a,session_id_b' }
    )
    .select('*')
    .single()

  if (error) throw new Error(`Failed to upsert comparison: ${error.message}`)
  return rowToComparison(data as SavedComparisonRow)
}

export async function enableComparisonShare(
  comparisonId: string,
  userId: string
): Promise<string> {
  const supabase = createAdminClient()
  const token = crypto.randomUUID()
  const { error } = await supabase
    .from('saved_comparisons')
    .update({ share_token: token })
    .eq('id', comparisonId)
    .eq('user_id', userId)

  if (error) throw new Error(`Failed to enable comparison sharing: ${error.message}`)
  return token
}

export async function revokeComparisonShare(
  comparisonId: string,
  userId: string
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('saved_comparisons')
    .update({ share_token: null })
    .eq('id', comparisonId)
    .eq('user_id', userId)

  if (error) throw new Error(`Failed to revoke comparison sharing: ${error.message}`)
}

export async function getComparisonByShareToken(
  token: string
): Promise<SavedComparison | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('saved_comparisons')
    .select('*')
    .eq('share_token', token)
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch shared comparison: ${error.message}`)
  return data ? rowToComparison(data as SavedComparisonRow) : null
}
