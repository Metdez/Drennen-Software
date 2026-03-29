import { getGeminiClient, getGeminiModel } from '@/lib/ai/geminiClient'
import { fetchInsightsInput, getClassInsights } from '@/lib/db/classInsights'
import { getThemeFrequency } from '@/lib/db/themes'
import { upsertStory } from '@/lib/db/stories'
import type { StorySection, SemesterStory } from '@/types'

function buildPrompt(
  semesterName: string,
  input: Awaited<ReturnType<typeof fetchInsightsInput>>,
  classNarrative: string | null,
  qualityTrend: { direction: string; description: string } | null,
  topThemes: Array<{ themeTitle: string; count: number }>,
): string {
  const sessionSummary = input.sessions.map(s => ({
    speaker: s.speakerName,
    date: new Date(s.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    studentCount: s.submissionCount,
    themes: s.themes,
    ...(s.debriefRating !== null ? {
      professorRating: s.debriefRating,
      homeRunQuestions: s.debriefHomeRunCount,
      flatQuestions: s.debriefFlatCount,
    } : {}),
    ...(s.debriefFollowups ? { followupTopics: s.debriefFollowups } : {}),
    ...(s.studentReflectionThemes.length > 0 ? {
      studentReflectionThemes: s.studentReflectionThemes,
      studentReflectionSummary: s.studentReflectionSummary,
    } : {}),
  }))

  return `Write a compelling, magazine-style narrative about this university semester. The semester is called "${semesterName}".

SEMESTER DATA (${input.sessions.length} sessions, chronological order):
${JSON.stringify(sessionSummary, null, 2)}

TOP THEMES ACROSS THE SEMESTER (ranked by frequency):
${topThemes.slice(0, 15).map((t, i) => `${i + 1}. "${t.themeTitle}" — appeared in ${t.count} session${t.count !== 1 ? 's' : ''}`).join('\n')}

STUDENT ENGAGEMENT:
- Top contributors: ${input.leaderboard.slice(0, 5).map(s => `${s.studentName} (${s.submissionCount} submissions)`).join(', ') || 'Not enough data'}
- Students who dropped off: ${input.dropoff.slice(0, 5).map(s => `${s.studentName} (last seen: ${s.lastSeenSpeaker})`).join(', ') || 'None detected'}
${classNarrative ? `\nCLASS ANALYSIS (previously generated):\n${classNarrative}` : ''}
${qualityTrend ? `\nQUALITY TREND: ${qualityTrend.direction} — ${qualityTrend.description}` : ''}

Return a JSON object with this structure:
{
  "title": "An evocative title for this semester's story (e.g., 'The Semester the Questions Got Harder')",
  "sections": [
    {
      "key": "opening",
      "title": "An evocative section title (NOT 'Introduction' or 'The Semester Begins')",
      "body": "400-600 words of flowing narrative prose"
    },
    {
      "key": "speakers_and_themes",
      "title": "An evocative section title about the speakers and themes",
      "body": "400-600 words"
    },
    {
      "key": "student_journey",
      "title": "An evocative section title about student growth",
      "body": "400-600 words"
    },
    {
      "key": "discoveries",
      "title": "An evocative section title about unexpected discoveries",
      "body": "400-600 words"
    },
    {
      "key": "closing",
      "title": "An evocative section title for looking ahead",
      "body": "400-600 words"
    }
  ]
}

CRITICAL WRITING INSTRUCTIONS:
- Total word count: 2,000-3,000 words across all 5 sections
- Write in a warm, engaging, third-person narrative voice ("The semester opened with...")
- Use SPECIFIC names — speaker names, theme names, student names from the data
- This is a STORY, not a report. No bullet points. No numbered lists. No data tables. No metrics headers.
- Each section body should be flowing paragraphs separated by double newlines
- The opening should set the scene narratively — paint a picture, don't start with "This semester had X sessions"
- The speakers section should narrate the arc: how themes evolved, which speakers shifted the conversation, what built on what
- The student journey section should tell the collective growth story — how question quality deepened, what the leaderboard reveals about engagement
- The discoveries section should highlight surprising patterns, unexpected connections between speakers, themes the professor didn't anticipate
- The closing should synthesize what this semester meant and offer concrete recommendations for next time — what types of speakers to prioritize, what topics to revisit
- Section titles should be literary and specific to this semester (e.g., "When Leadership Became Personal" not "The Students' Journey")
- Do NOT use phrases like "In conclusion" or "To summarize" or "Overall"
- Write like a skilled journalist crafting a feature article, not an AI summarizing data`
}

export async function generateSemesterStory(
  userId: string,
  semesterId: string,
  semesterName: string,
): Promise<{ storyId: string; title: string; sections: StorySection[] }> {
  // Aggregate data in parallel
  const [input, insights, themes] = await Promise.all([
    fetchInsightsInput(userId, semesterId),
    getClassInsights(userId, semesterId),
    getThemeFrequency(userId, semesterId),
  ])

  if (input.sessions.length === 0) {
    throw new Error('No sessions found for this semester')
  }

  const ai = getGeminiClient()
  const model = getGeminiModel()

  const prompt = buildPrompt(
    semesterName,
    input,
    insights?.narrative ?? null,
    insights?.qualityTrend ?? null,
    themes,
  )

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      systemInstruction:
        'You are a skilled narrative writer creating polished magazine-style articles about university semesters. You write with warmth, specificity, and literary flair. You never use bullet points, numbered lists, or data tables. Always respond with valid JSON matching the requested schema exactly.',
    },
  })

  const raw = (response.text ?? '').trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()

  const parsed = JSON.parse(raw) as {
    title?: string
    sections?: StorySection[]
  }

  const title = parsed.title || `The Story of ${semesterName}`
  const sections: StorySection[] = parsed.sections ?? []

  // Validate we got all 5 sections
  const expectedKeys = ['opening', 'speakers_and_themes', 'student_journey', 'discoveries', 'closing'] as const
  const validSections = expectedKeys.map(key => {
    const found = sections.find(s => s.key === key)
    return found ?? { key, title: key.replace(/_/g, ' '), body: '' }
  })

  const sessionIds = input.sessions.map(s => s.sessionId)
  const story = await upsertStory(userId, semesterId, title, validSections, sessionIds)

  return { storyId: story.id, title: story.title, sections: story.sections }
}
