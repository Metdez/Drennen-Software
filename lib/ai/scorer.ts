import { GoogleGenerativeAI } from '@google/generative-ai'
import { getSubmissionsForScoring, updateSubmissionScore } from '@/lib/db/submissions'

// Lazy initialization — avoids crash at build time when env vars are absent
let _genAI: GoogleGenerativeAI | null = null

function getGenAI(): GoogleGenerativeAI {
  if (!_genAI) _genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)
  return _genAI
}

const SYSTEM_INSTRUCTION = `You are evaluating a student's question(s) for an upcoming guest speaker session.
Score the question(s) from 0 to 100 as a weighted average of:
- Specificity (40%): Is the question grounded in specific details about the speaker's work, company, or background?
- Research depth (35%): Does it demonstrate prior research beyond surface-level knowledge?
- Open-endedness (25%): Does it invite reflection or narrative rather than a yes/no answer?

Respond ONLY with valid JSON (no markdown, no code fences): {"score": <integer 0-100>, "explanation": "<one sentence describing the strongest or weakest aspect>"}`

export async function scoreSubmission(
  rawText: string
): Promise<{ score: number; explanation: string }> {
  try {
    const model = getGenAI().getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: SYSTEM_INSTRUCTION,
    })
    const result = await model.generateContent(rawText)
    const text = result.response.text()
    const parsed = JSON.parse(text)
    return { score: parsed.score as number, explanation: parsed.explanation as string }
  } catch {
    return { score: 0, explanation: 'Scoring unavailable' }
  }
}

export async function scoreAllSubmissions(sessionId: string): Promise<void> {
  const rows = await getSubmissionsForScoring(sessionId)

  for (const row of rows) {
    try {
      const { score, explanation } = await scoreSubmission(row.submissionText)
      await updateSubmissionScore(row.id, score, explanation)
    } catch (err) {
      console.error(`Failed to score submission ${row.id}:`, err)
    }
  }
}
