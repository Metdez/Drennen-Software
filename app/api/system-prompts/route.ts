import { NextResponse } from 'next/server'
import { DEFAULT_SYSTEM_PROMPT, validateCustomPrompt } from '@/lib/ai/prompt'
import { getCurrentUser } from '@/lib/db/users'
import { createPromptVersion, getActivePrompt, getPromptVersions } from '@/lib/db/systemPrompts'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [versions, activeVersion] = await Promise.all([
      getPromptVersions(user.id),
      getActivePrompt(user.id),
    ])

    return NextResponse.json({
      versions,
      activeVersion,
      defaultPrompt: DEFAULT_SYSTEM_PROMPT,
    })
  } catch (err) {
    console.error('[/api/system-prompts GET]', err)
    return NextResponse.json({ error: 'Failed to fetch system prompts' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as { promptText?: string; label?: string | null }
    const promptText = body.promptText?.trim() ?? ''
    const label = body.label?.trim() || null
    const validation = validateCustomPrompt(promptText)

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.warnings[0] ?? 'Prompt must be between 50 and 10,000 characters.' },
        { status: 422 }
      )
    }

    const version = await createPromptVersion({
      userId: user.id,
      promptText,
      label,
    })

    return NextResponse.json({ version })
  } catch (err) {
    console.error('[/api/system-prompts POST]', err)
    const message = err instanceof Error ? err.message : 'Failed to create system prompt version'
    const status = message.includes('limit reached') ? 422 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
