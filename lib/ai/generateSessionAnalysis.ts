import { runSessionAnalysis } from '@/lib/ai/analysisAgent'
import { insertSessionAnalysis } from '@/lib/db/sessionAnalyses'

/**
 * Runs Gemini session analysis and persists the result to the DB.
 * Designed to be called fire-and-forget from /api/process so analysis
 * is pre-cached by the time the professor navigates to the Preview page.
 */
export async function generateAndCacheSessionAnalysis(
  sessionId: string,
  userId: string,
  speakerName: string,
  sessionOutput: string,
  submissions: Array<{ student_name: string; submission_text: string }>
): Promise<void> {
  const analysis = await runSessionAnalysis(speakerName, sessionOutput, submissions)
  await insertSessionAnalysis(sessionId, userId, analysis)
}
