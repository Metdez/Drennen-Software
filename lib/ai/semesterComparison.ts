import { getGeminiClient, getGeminiModel } from '@/lib/ai/geminiClient'
import type { CohortComparisonData } from '@/types/comparison'

function buildPrompt(data: CohortComparisonData): string {
  const semesterSummaries = data.semesters.map(s => ({
    name: s.name,
    sessionCount: s.sessionCount,
    studentCount: s.studentCount,
    avgSubmissions: s.avgSubmissions,
    topThemes: s.topThemes,
  }))

  const persistentThemes = data.themePersistence
    .filter(t => t.semesterIds.length > 1)
    .slice(0, 15)
    .map(t => ({
      theme: t.theme,
      appearsInSemesters: t.semesterIds.length,
      totalOccurrences: t.totalOccurrences,
    }))

  const uniquePerSemester = data.semesters.map(s => {
    const onlyHere = data.themePersistence
      .filter(t => t.semesterIds.length === 1 && t.semesterIds[0] === s.id)
      .map(t => t.theme)
      .slice(0, 5)
    return { semester: s.name, uniqueThemes: onlyHere }
  })

  return `You are an expert curriculum analyst helping a university professor compare student engagement across multiple semesters/cohorts.

Given the following semester data, write a concise narrative (3-5 sentences) comparing these cohorts. Focus on:
- How student engagement (session counts, submission rates) differs across semesters
- Which themes persist across cohorts vs. which are unique to specific semesters
- What these patterns suggest about evolving student interests or course improvements
- Any notable trends (growing participation, shifting topic focus, etc.)

Semester data:
${JSON.stringify(semesterSummaries, null, 2)}

Themes that persist across multiple semesters:
${JSON.stringify(persistentThemes, null, 2)}

Themes unique to specific semesters:
${JSON.stringify(uniquePerSemester, null, 2)}

Write a clear, actionable narrative for the professor. Be specific — name actual themes and semesters. Do not use bullet points; write flowing prose.`
}

export async function generateCohortComparison(data: CohortComparisonData): Promise<string> {
  try {
    const ai = getGeminiClient()

    const response = await ai.models.generateContent({
      model: getGeminiModel(),
      contents: buildPrompt(data),
      config: {
        systemInstruction:
          'You are an expert educational data analyst. Respond with a concise narrative paragraph comparing the given semesters. Plain text only, no markdown formatting.',
      },
    })

    const text = (response.text ?? '').trim()
    if (!text) {
      return 'AI narrative could not be generated. The model returned an empty response.'
    }

    return text
  } catch (err) {
    console.error('[semesterComparison] Gemini generation failed:', err)
    return 'AI narrative could not be generated at this time. Please try again later.'
  }
}
