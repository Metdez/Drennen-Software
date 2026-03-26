import { createAdminClient, createClient } from '@/lib/supabase/server'

export interface ThemeFrequency {
  themeTitle: string
  count: number
  lastSeen: string
}

/**
 * Returns theme frequency aggregated across all sessions for a user,
 * sorted by count descending (then by most-recent occurrence for stability).
 */
export async function getThemeFrequency(userId: string): Promise<ThemeFrequency[]> {
  const supabase = createClient()

  // Join through sessions to filter by user_id (session_themes has no user_id column)
  const { data, error } = await supabase
    .from('session_themes')
    .select('theme_title, created_at, sessions!inner(user_id)')
    .eq('sessions.user_id', userId)

  if (error) throw new Error(`Failed to fetch theme frequency: ${error.message}`)

  // Aggregate in application layer (avoids raw SQL / RPC while keeping it simple at this scale)
  const map = new Map<string, { count: number; lastSeen: string }>()
  for (const row of (data ?? [])) {
    const title = (row as any).theme_title as string
    const createdAt = (row as any).created_at as string
    const existing = map.get(title)
    if (!existing) {
      map.set(title, { count: 1, lastSeen: createdAt })
    } else {
      existing.count++
      if (createdAt > existing.lastSeen) existing.lastSeen = createdAt
    }
  }

  return Array.from(map.entries())
    .map(([themeTitle, { count, lastSeen }]) => ({ themeTitle, count, lastSeen }))
    .sort((a, b) => b.count - a.count || b.lastSeen.localeCompare(a.lastSeen))
}

/**
 * Returns a flat list of theme titles from the N most-recent sessions
 * for a user, excluding the given session (used to detect overlap after save).
 */
export async function getRecentThemeTitles(
  userId: string,
  excludeSessionId: string,
  limit = 5
): Promise<string[]> {
  const supabase = createAdminClient()

  // Fetch the N most-recent session IDs for this user (excluding current)
  const { data: sessions, error: sessionsError } = await supabase
    .from('sessions')
    .select('id')
    .eq('user_id', userId)
    .neq('id', excludeSessionId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (sessionsError) throw new Error(`Failed to fetch recent sessions: ${sessionsError.message}`)
  if (!sessions || sessions.length === 0) return []

  const sessionIds = sessions.map(s => s.id)

  const { data: themes, error: themesError } = await supabase
    .from('session_themes')
    .select('theme_title')
    .in('session_id', sessionIds)

  if (themesError) throw new Error(`Failed to fetch recent themes: ${themesError.message}`)

  return (themes ?? []).map(t => (t as any).theme_title as string)
}
