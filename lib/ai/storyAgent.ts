/**
 * lib/ai/storyAgent.ts
 *
 * Generates a magazine-style narrative story for an entire semester.
 *
 * Unlike the semester report (which is data-driven with metrics and tables),
 * the story is a literary artifact — flowing prose written in third person that
 * narrates the arc of the semester for a human audience (administrators,
 * accreditation reviewers, or the professor themselves).
 *
 * Structure: exactly 5 sections in a fixed order:
 *  - "opening"           — scene-setting introduction to the semester
 *  - "speakers_and_themes" — how themes evolved across guest speakers
 *  - "student_journey"   — the class's collective intellectual development
 *  - "discoveries"       — unexpected patterns and surprising connections
 *  - "closing"           — synthesis and forward-looking recommendations
 *
 * Each section key and title is validated after parsing; missing sections are
 * replaced with empty stubs so the story structure is always complete even if
 * Gemini omits a section. The result is upserted (not inserted) so re-generating
 * a story for the same semester safely overwrites the previous version.
 *
 * AI Provider: Google Gemini (via lib/ai/geminiClient.ts)
 * Called by:   app/api/stories/generate/route.ts (POST handler)
 * Persists to: semester_stories table via lib/db/stories.ts (upsertStory)
 */

import { getGeminiClient, getGeminiModel } from '@/lib/ai/geminiClient'
import { fetchInsightsInput, getClassInsights } from '@/lib/db/classInsights'
import { getThemeFrequency } from '@/lib/db/themes'
import { upsertStory } from '@/lib/db/stories'
import type { StorySection, SemesterStory } from '@/types'

/**
 * Constructs the Gemini prompt for semester story generation.
 *
 * Builds a rich data section from session metadata, theme frequency, leaderboard,
 * drop-off patterns, and (optionally) the previously generated class narrative and
 * quality trend. The prompt contains explicit writing instructions — including a
 * word count range (2,000-3,000 words), prohibition on bullet points, and a
 * requirement to use specific names — to push Gemini toward literary output rather
 * than a summary report.
 *
 * Conditional fields (debrief rating, home run questions, student reflections) are
 * spread into the session summary only when present, so sessions without post-session
 * data are represented accurately rather than showing null/0 values.
 *
 * @param semesterName - The semester's display name (e.g., "Spring 2026")
 * @param input - Aggregated session and engagement data from `fetchInsightsInput`
 * @param classNarrative - Previously generated class insights narrative, or null
 * @param qualityTrend - Previously detected quality trend direction/description, or null
 * @param topThemes - Theme frequency list from `getThemeFrequency`
 * @returns Fully-formed prompt string ready for Gemini content generation
 */
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

/**
 * Generates a magazine-style narrative story for a semester and persists it.
 *
 * Pipeline:
 *  1. Fetches session data, class insights, and theme frequency in parallel
 *  2. Guards against empty semesters (throws if no sessions found)
 *  3. Builds the prompt via `buildPrompt` and calls Gemini with JSON mode
 *  4. Strips markdown fences and parses the response
 *  5. Validates that all 5 expected section keys are present, filling in empty
 *     stubs for any sections Gemini omitted
 *  6. Upserts the story to `semester_stories` via `upsertStory`
 *
 * The `SemesterStory` type is imported but not used as the return type here —
 * the function returns only the fields needed by the route handler.
 *
 * @param userId - The professor's user ID (scopes all DB reads)
 * @param semesterId - The semester UUID to generate the story for
 * @param semesterName - The semester's display name (used in the prompt and as a title fallback)
 * @returns `{ storyId, title, sections }` — the persisted story's ID, title, and section array
 * @throws Error if no sessions are found for the semester
 * @remarks
 * The story uses `upsertStory` (not insert) so that re-generating a semester story
 * safely overwrites the previous version rather than creating duplicate rows.
 * The 5-section structure is validated post-parse and filled with empty stubs for
 * any missing keys, ensuring downstream renderers always receive a complete array.
 * @see app/api/stories/generate/route.ts — POST handler that triggers generation
 * @see lib/db/stories.ts — upsertStory persists the result
 * @see lib/export/storyPdf.ts — exports the story sections as a PDF document
 * @see lib/export/storyDocx.ts — exports the story sections as a DOCX document
 */
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

  // Validate we got all 5 sections. Map over expected keys in order so the
  // section array always has a stable structure regardless of what Gemini returned.
  // Missing sections get an empty body stub rather than crashing downstream renderers.
  const expectedKeys = ['opening', 'speakers_and_themes', 'student_journey', 'discoveries', 'closing'] as const
  const validSections = expectedKeys.map(key => {
    const found = sections.find(s => s.key === key)
    // Fall back to a stub with a humanised title if the section is absent
    return found ?? { key, title: key.replace(/_/g, ' '), body: '' }
  })

  const sessionIds = input.sessions.map(s => s.sessionId)
  const story = await upsertStory(userId, semesterId, title, validSections, sessionIds)

  return { storyId: story.id, title: story.title, sections: story.sections }
}
