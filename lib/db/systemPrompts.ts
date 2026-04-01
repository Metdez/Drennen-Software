import { createAdminClient, createClient } from '@/lib/supabase/server'
import type { CreateSystemPromptInput, SystemPrompt, SystemPromptRow } from '@/types'

function rowToSystemPrompt(row: SystemPromptRow): SystemPrompt {
  return {
    id: row.id,
    userId: row.user_id,
    version: row.version,
    label: row.label,
    promptText: row.prompt_text,
    isActive: row.is_active,
    createdAt: row.created_at,
  }
}

export async function getActivePrompt(userId: string): Promise<SystemPrompt | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('custom_system_prompts')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch active system prompt: ${error.message}`)
  return data ? rowToSystemPrompt(data as SystemPromptRow) : null
}

export async function getPromptVersions(userId: string): Promise<SystemPrompt[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('custom_system_prompts')
    .select('*')
    .eq('user_id', userId)
    .order('version', { ascending: false })

  if (error) throw new Error(`Failed to fetch system prompt versions: ${error.message}`)
  return (data ?? []).map((row) => rowToSystemPrompt(row as SystemPromptRow))
}

export async function getPromptById(id: string): Promise<SystemPrompt | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('custom_system_prompts')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch system prompt version: ${error.message}`)
  return data ? rowToSystemPrompt(data as SystemPromptRow) : null
}

export async function createPromptVersion(input: CreateSystemPromptInput): Promise<SystemPrompt> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('create_custom_system_prompt_version', {
    p_user_id: input.userId,
    p_prompt_text: input.promptText,
    p_label: input.label ?? null,
  })

  if (error) throw new Error(`Failed to create system prompt version: ${error.message}`)
  return rowToSystemPrompt(data as SystemPromptRow)
}

export async function activatePromptVersion(userId: string, promptId: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.rpc('activate_custom_system_prompt_version', {
    p_user_id: userId,
    p_prompt_id: promptId,
  })

  if (error) throw new Error(`Failed to activate system prompt version: ${error.message}`)
}

export async function resetToDefault(userId: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.rpc('reset_custom_system_prompts_to_default', {
    p_user_id: userId,
  })

  if (error) throw new Error(`Failed to reset system prompt to default: ${error.message}`)
}
