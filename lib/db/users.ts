import { createClient } from '@/lib/supabase/server'
import type { AuthUser } from '@/types'

export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return {
    id: user.id,
    email: user.email ?? '',
  }
}
