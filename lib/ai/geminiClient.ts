/**
 * @file lib/ai/geminiClient.ts
 *
 * Shared OpenRouter client for every non-session-generation AI feature.
 *
 * Historically this wrapped Google Gemini; all agents still call
 * `getGeminiClient().models.generateContent({ model, contents, config })` and read `.text`.
 * That surface is kept (names unchanged) but is now backed by OpenRouter's OpenAI-compatible
 * chat API, so no agent file had to change. Do NOT instantiate an SDK client anywhere else.
 *
 * Env vars:
 *   - OPENROUTER_API_KEY — required
 *   - OPENROUTER_MODEL   — optional; defaults to DeepSeek V4 Flash (GA)
 */

import OpenAI from 'openai'

export const DEFAULT_MODEL = 'deepseek/deepseek-v4-flash-0731'

let openrouter: OpenAI | null = null

/** Lazy singleton OpenRouter client (OpenAI SDK with baseURL override). Used by session generation too. */
export function getOpenRouter(): OpenAI {
  if (!openrouter) {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) throw new Error('Missing OPENROUTER_API_KEY')
    openrouter = new OpenAI({ apiKey, baseURL: 'https://openrouter.ai/api/v1' })
  }
  return openrouter
}

interface GenerateParams {
  model: string
  contents: string
  config?: { systemInstruction?: string; responseMimeType?: string }
}

/** Gemini-SDK-shaped facade over OpenRouter chat completions. */
export function getGeminiClient() {
  return {
    models: {
      async generateContent({ model, contents, config }: GenerateParams): Promise<{ text: string }> {
        const messages: OpenAI.Chat.ChatCompletionMessageParam[] = []
        if (config?.systemInstruction) messages.push({ role: 'system', content: config.systemInstruction })
        messages.push({ role: 'user', content: contents })

        const completion = await getOpenRouter().chat.completions.create({
          model,
          messages,
          ...(config?.responseMimeType === 'application/json' && { response_format: { type: 'json_object' as const } }),
          // OpenRouter-specific: skip chain-of-thought for speed; these tasks are extraction/summaries
          reasoning: { enabled: false },
        } as OpenAI.Chat.ChatCompletionCreateParamsNonStreaming)

        return { text: completion.choices[0]?.message?.content ?? '' }
      },
    },
  }
}

/** Model id used by all agents; one env var switches them all. */
export function getGeminiModel(): string {
  return process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL
}
