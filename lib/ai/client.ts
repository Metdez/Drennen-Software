import OpenAI from 'openai'
import { buildSystemPrompt, buildUserMessage } from './prompt'

// Lazy initialization — avoids crash at build time when env vars are absent
let xai: OpenAI | null = null

function getClient(): OpenAI {
  if (!xai) {
    xai = new OpenAI({
      apiKey: process.env.XAI_API_KEY,
      baseURL: process.env.XAI_BASE_URL ?? 'https://api.x.ai/v1',
    })
  }
  return xai
}

export interface GenerationResult {
  output: string
}

export async function generateQuestionSheet(
  speakerName: string,
  studentSubmissionsText: string
): Promise<GenerationResult> {
  const systemPrompt = buildSystemPrompt(speakerName)
  const userMessage = buildUserMessage(studentSubmissionsText)

  try {
    const completion = await getClient().chat.completions.create({
      model: process.env.XAI_MODEL ?? 'grok-4-1-fast-reasoning',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 4000,
      temperature: 0.3,
    })

    const output = completion.choices[0]?.message?.content
    if (!output) throw new Error('AI returned empty response')

    return { output }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown AI error'
    throw new Error(`AI generation failed: ${message}`)
  }
}
