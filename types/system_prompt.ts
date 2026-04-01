export interface SystemPromptRow {
  id: string
  user_id: string
  version: number
  label: string | null
  prompt_text: string
  is_active: boolean
  created_at: string
}

export interface SystemPrompt {
  id: string
  userId: string
  version: number
  label: string | null
  promptText: string
  isActive: boolean
  createdAt: string
}

export interface CreateSystemPromptInput {
  userId: string
  promptText: string
  label?: string | null
}
