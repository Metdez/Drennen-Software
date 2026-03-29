import { GoogleGenAI } from '@google/genai'

// Lazy singleton — matches the existing xAI pattern in client.ts
let gemini: GoogleGenAI | null = null

export function getGeminiClient(): GoogleGenAI {
  if (!gemini) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
    if (!apiKey) throw new Error('Missing GEMINI_API_KEY or GOOGLE_API_KEY')
    gemini = new GoogleGenAI({ apiKey })
  }
  return gemini
}

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL ?? 'gemini-3.1-flash-lite-preview'
}
