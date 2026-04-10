/**
 * @file lib/ai/studentProfile.ts
 *
 * Generates AI-powered "growth intelligence" profiles for individual students
 * by analyzing all of their submissions across every session they've participated in.
 *
 * This module is the holistic student-facing complement to the per-session analysis
 * pipeline. Where session analysis asks "what did the class think about this speaker?",
 * this module asks "how is this particular student developing over time?".
 *
 * ## Where it fits
 * - Called by: app/api/process/route.ts (fire-and-forget after session upload)
 * - Called by: app/api/sessions/[id]/debrief/complete/route.ts (fire-and-forget after debrief)
 * - Called by: app/api/sessions/[id]/student-debriefs/route.ts (fire-and-forget after reflection save)
 * - Called by: app/api/sessions/[id]/speaker-analyses/route.ts (fire-and-forget after analysis save)
 * - Persists to: `student_profiles` via lib/db/studentProfiles.ts
 * - Reads from: `student_submissions`, `student_debrief_submissions`,
 *               `student_speaker_analysis_submissions`, `sessions` (via Supabase admin client)
 *
 * ## Fire-and-forget pattern
 * Callers do NOT await these functions. Profile generation happens in the background
 * after the main request has already responded to the client. If generation fails,
 * an error is logged but the caller is not affected.
 *
 * ## Data sources per student
 * 1. Pre-session questions (from ZIP upload → `student_submissions`)
 * 2. Post-session reflections (from `student_debrief_submissions`)
 * 3. Speaker analysis essays (from `student_speaker_analysis_submissions`)
 *
 * All three feed into a single Gemini prompt so the profile represents
 * the student's full intellectual arc, not just their question submissions.
 *
 * Uses: lib/ai/geminiClient.ts, lib/db/studentProfiles.ts, lib/supabase/server.ts
 */

import { getGeminiClient, getGeminiModel } from '@/lib/ai/geminiClient'
import { createAdminClient } from '@/lib/supabase/server'
import { upsertStudentProfile } from '@/lib/db/studentProfiles'
import type { StudentProfile, GrowthIntelligence } from '@/types'

/**
 * Internal shape used to pass one session's worth of data into the prompt builder.
 * Combines the student's questions with their optional post-session reflection and
 * speaker analysis for that same session.
 */
/**
 * Internal shape used to pass one session's worth of data into the prompt builder.
 * Combines the student's questions with their optional post-session reflection and
 * speaker analysis for that same session.
 *
 * What it does: Defines a consolidated structure for a single student's data pertaining to one academic session.
 * Why it is used: Simplifies the process of collecting and passing all relevant data (questions, reflections, speaker analysis) for a given session to functions that construct AI prompts.
 * Important implementation details: It's an in-memory representation, not directly mapped to a single database table, but rather a combination of data fetched from multiple tables.
 */
interface StudentSessionData {
  sessionId: string
  speakerName: string
  date: string
  questions: string
  reflection: string | null
  speakerAnalysis: string | null
}

/**
 * Fetches all submission data for a single student across the professor's entire
 * session history, then joins debrief reflections and speaker analyses by session ID.
 *
 * Uses `createAdminClient()` (service role) because student debrief and speaker
 * analysis tables are not RLS-scoped per-user — the admin client is required to
 * read those cross-session rows without adding per-user FKs to every table.
 *
 * The four queries run in parallel via Promise.all to minimize wall-clock time:
 * 1. student_submissions (joined to sessions for metadata + user scoping)
 * 2. sessions count (for totalSessionCount — used by the profile display layer)
 * 3. student_debrief_submissions (keyed by session_id for joining)
 * 4. student_speaker_analysis_submissions (keyed by session_id for joining)
 *
 * @param userId - The professor's user ID (used to scope sessions to this professor)
 * @param studentName - The student's name in "FirstName L." format
 * @returns All per-session submission data merged into StudentSessionData[], plus
 *          the professor's total session count for participation rate calculations
 */
/**
 * Fetches all submission data for a single student across the professor's entire
 * session history, then joins debrief reflections and speaker analyses by session ID.
 *
 * What it does: Retrieves all historical pre-session questions, post-session reflections, and speaker analyses for a specified student, scoped to a particular professor's sessions.
 * Why it is used: To gather a comprehensive dataset of a student's interactions and submissions over time, which is crucial for generating a holistic AI-driven growth profile.
 * Important implementation details:
 * - Uses `createAdminClient()` (Supabase service role) to bypass Row Level Security (RLS) policies, allowing access to tables like `student_debrief_submissions` and `student_speaker_analysis_submissions` which might not be RLS-scoped per-user.
 * - Executes four database queries in parallel using `Promise.all` to minimize execution time: `student_submissions`, `sessions` (for total count), `student_debrief_submissions`, and `student_speaker_analysis_submissions`.
 * - Uses `Map` objects (`debriefMap`, `analysisMap`) to efficiently join optional debrief reflections and speaker analyses with the main student submissions by `session_id` in O(1) time per session.
 * - Normalizes the data format from Supabase's potentially array-like joined row structure to a consistent object.
 */
async function fetchAllStudentData(
  userId: string,
  studentName: string
): Promise<{ sessions: StudentSessionData[]; totalSessionCount: number }> {
  const supabase = createAdminClient()

  const [submissionsResult, sessionsResult, debriefResult, speakerAnalysisResult] = await Promise.all([
    supabase
      .from('student_submissions')
      .select('session_id, submission_text, sessions!inner(id, speaker_name, created_at, user_id)')
      .eq('student_name', studentName)
      .eq('sessions.user_id', userId)
      .order('created_at', { referencedTable: 'sessions', ascending: true }),
    supabase
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    supabase
      .from('student_debrief_submissions')
      .select('session_id, submission_text')
      .eq('student_name', studentName),
    supabase
      .from('student_speaker_analysis_submissions')
      .select('session_id, submission_text')
      .eq('student_name', studentName),
  ])

  if (submissionsResult.error) throw new Error(submissionsResult.error.message)

  // Build lookup maps so we can join optional reflections and analyses in O(1) per session
  const debriefMap = new Map<string, string>()
  for (const row of debriefResult.data ?? []) {
    debriefMap.set(row.session_id, row.submission_text)
  }

  const analysisMap = new Map<string, string>()
  for (const row of speakerAnalysisResult.data ?? []) {
    analysisMap.set(row.session_id, row.submission_text)
  }

  const sessions: StudentSessionData[] = (submissionsResult.data ?? []).map((row) => {
    // Supabase returns joined rows as arrays when using !inner — normalise to a single object
    const session = (Array.isArray(row.sessions) ? row.sessions[0] : row.sessions) as {
      id: string
      speaker_name: string
      created_at: string
    } | null
    const sessionId = session?.id ?? row.session_id
    return {
      sessionId,
      speakerName: session?.speaker_name ?? '',
      date: session?.created_at ?? '',
      questions: row.submission_text ?? '',
      // null if the student hasn't submitted a reflection for this session yet
      reflection: debriefMap.get(sessionId) ?? null,
      // null if the student hasn't submitted a speaker analysis for this session yet
      speakerAnalysis: analysisMap.get(sessionId) ?? null,
    }
  })

  return { sessions, totalSessionCount: sessionsResult.count ?? 0 }
}

/**
 * Truncates a text string to `maxLength` characters, appending "..." when cut.
 * Used when building the Gemini prompt to keep older sessions from consuming
 * too many tokens — only the most recent FULL_SESSIONS are sent at full length.
 */
/**
 * Truncates a text string to `maxLength` characters, appending "..." when cut.
 * Used when building the Gemini prompt to keep older sessions from consuming
 * too many tokens — only the most recent FULL_SESSIONS are sent at full length.
 *
 * What it does: Shortens a given string if its length exceeds a specified maximum, adding an ellipsis at the end to indicate truncation.
 * Why it is used: To manage token consumption when constructing AI prompts. Older, less critical session data can be shortened to stay within the AI model's token limits while still providing context.
 * Important implementation details: A straightforward utility function that performs basic string slicing and concatenation. It returns the original text if it's already within the `maxLength`.
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

/**
 * Builds the Gemini prompt for student profile generation.
 *
 * Token budget strategy: only the 5 most recent sessions are included at full length;
 * older sessions are truncated to 300 characters each. This keeps the prompt within
 * model limits while still surfacing the full longitudinal arc via the earlier sessions.
 *
 * The prompt requests a rich JSON structure (`StudentProfile`) covering:
 * - Interests, career direction, growth trajectory, personality traits
 * - Deep `growthIntelligence` block: thinking arc, theme evolution, critical thinking
 *   progression, engagement pattern, per-session snapshots, and AI recommendations
 *
 * @param studentName - The student's display name
 * @param sessions - All sessions this student participated in (chronological)
 * @returns The full prompt string to send to Gemini
 */
/**
 * Builds the Gemini prompt for student profile generation.
 *
 * What it does: Constructs the complete textual prompt string that will be sent to the Gemini AI model to request a student growth profile.
 * Why it is used: To provide the AI with all the necessary historical student submission data and specific instructions, including the desired output schema and qualitative analysis requirements.
 * Important implementation details:
 * - Implements a token budgeting strategy: only the `FULL_SESSIONS` (e.g., 5) most recent sessions are included at their full length, while older sessions are truncated using `truncateText` to conserve tokens.
 * - Formats the student's submission data chronologically, detailing pre-session questions, and optionally post-session reflections and speaker analyses for each session.
 * - Includes explicit instructions for the AI to return a JSON object strictly adhering to the `StudentProfile` schema, detailing various facets like interests, career direction, growth trajectory, personality, and a deep `growthIntelligence` block.
 * - Contains specific qualitative rules and guidelines within the prompt to ensure the AI's analysis is narrative, qualitative, focused on understanding, and evidence-based.
 */
function buildPrompt(studentName: string, sessions: StudentSessionData[]): string {
  const FULL_SESSIONS = 5
  const TRUNCATE_LENGTH = 300

  const submissionList = sessions
    .map((s, i) => {
      const date = new Date(s.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
      const isRecent = i >= sessions.length - FULL_SESSIONS
      const questionText = isRecent ? s.questions : truncateText(s.questions, TRUNCATE_LENGTH)

      let entry = `Session ${i + 1}: ${s.speakerName} (${date}) [id: ${s.sessionId}]\n`
      entry += `  Pre-Session Questions: "${questionText}"`

      if (s.reflection) {
        const reflectionText = isRecent ? s.reflection : truncateText(s.reflection, TRUNCATE_LENGTH)
        entry += `\n  Post-Session Reflection: "${reflectionText}"`
      }

      if (s.speakerAnalysis) {
        const analysisText = isRecent ? s.speakerAnalysis : truncateText(s.speakerAnalysis, TRUNCATE_LENGTH)
        entry += `\n  Speaker Analysis: "${analysisText}"`
      }

      return entry
    })
    .join('\n\n')

  const hasReflections = sessions.some((s) => s.reflection)
  const hasAnalyses = sessions.some((s) => s.speakerAnalysis)
  const dataNote = !hasReflections && !hasAnalyses
    ? '\nNote: Only pre-session questions are available. Reflections and speaker analyses have not been submitted yet. Base your growth analysis on questions only, and note where additional data would enrich the analysis.'
    : ''

  return `You are an expert educational psychologist helping a university professor understand their students' intellectual growth. This is NOT a grading tool — it is a development and engagement tool. Your analysis should be narrative, qualitative, and focused on understanding, not judging.

Analyze ALL of this student's submissions across ${sessions.length} session${sessions.length !== 1 ? 's' : ''} to build a comprehensive profile with deep growth intelligence.

Student: "${studentName}"
Submissions (oldest first):
${submissionList}
${dataNote}

Return a JSON object with exactly this structure:
{
  "interests": {
    "tags": ["topic1", "topic2", ...],
    "observations": ["Short, punchy observation about their topics.", "Another brief observation."]
  },
  "careerDirection": {
    "fields": ["field1", "field2", ...],
    "observations": ["Short point about their career leanings."]
  },
  "growthTrajectory": {
    "direction": "improving" | "declining" | "stable" | "insufficient_data",
    "observations": ["Detail about current growth trajectory."]
  },
  "personality": {
    "traits": ["trait1", "trait2", ...],
    "observations": ["Short observation on intellectual style."]
  },
  "professorNotes": ["Recommendation 1", "Recommendation 2", "Recommendation 3"],
  "growthIntelligence": {
    "overallSignal": "Accelerating" | "Deepening" | "Emerging" | "Consistent" | "Plateauing" | "New",
    "thinkingArc": {
      "currentPhase": "Brief label of where they are now, e.g. 'Developing analytical depth'",
      "observations": ["Short specific detail on how thinking has evolved.", "Another detail."],
      "evidenceHighlights": ["Direct quote or paraphrase from an early session", "Direct quote or paraphrase from a recent session", "Optional: a pivotal moment"]
    },
    "themeEvolution": {
      "coherenceLabel": "focused" | "broadening" | "scattered" | "converging",
      "recurringThreads": ["thread1", "thread2", ...],
      "observations": ["Detail about thread coherence or scattering."]
    },
    "criticalThinking": {
      "currentLevel": "Brief label, e.g. 'Evaluative with emerging integration'",
      "observations": ["Point about analytical quality changes."],
      "strongestArea": "The dimension of critical thinking where this student excels",
      "growthEdge": "Where they could push further with the right encouragement"
    },
    "engagementPattern": {
      "consistencyLabel": "steady" | "improving" | "declining" | "sporadic",
      "depthTrend": "deepening" | "stable" | "thinning",
      "observations": ["Point about participation/sentiment changes."]
    },
    "snapshots": [
      {
        "sessionId": "the session id",
        "speakerName": "speaker name",
        "date": "the date string",
        "phase": "surface" | "emerging" | "developing" | "sophisticated",
        "thinkingLabel": "e.g. Descriptive, Analytical, Evaluative, Integrative",
        "engagementLabel": "e.g. Brief, Engaged, Deep, Exceptional",
        "themes": ["theme1", "theme2"],
        "narrative": "One sentence describing this session's contribution to the student's growth story."
      }
    ],
    "aiRecommendations": [
      "Specific, actionable recommendation for the professor about this student",
      "Another recommendation",
      "Another recommendation"
    ],
    "semesterHighlight": "1-2 sentences summarizing the most notable aspect of this student's development, suitable for inclusion in a semester report."
  },
  "generatedAt": "${new Date().toISOString()}",
  "sessionCount": ${sessions.length}
}

Rules:
- interests.tags: 3-5 specific topic tags
- careerDirection.fields: 2-3 career fields
- growthTrajectory.direction: "insufficient_data" if only 1 session
- personality.traits: 3-5 adjective traits
- professorNotes: 2-4 actionable recommendations
- overallSignal: Use "New" if only 1 session. Use "Accelerating" for rapid improvement, "Deepening" for steady deepening, "Emerging" for early-stage growth, "Consistent" for stable engagement, "Plateauing" for stalled growth.
- snapshots: One per session, in chronological order. Use the actual session IDs, speaker names, and dates from the data.
- thinkingArc.evidenceHighlights: 2-3 items, use actual quotes or close paraphrases from submissions
- aiRecommendations: 3-4 specific recommendations
- Observations should be formatted as 1-2 punchy, highly specific bullet points rather than paragraphs.
- Be specific and evidence-based — reference actual patterns, not generic statements
- This is about understanding engagement and development, not assigning grades`
}

/**
 * Generates (or regenerates) the AI growth intelligence profile for a single student.
 *
 * Flow:
 * 1. Fetch all submission data for the student via `fetchAllStudentData()`
 * 2. Build and send the Gemini prompt
 * 3. Strip any markdown fences from the response (Gemini occasionally wraps JSON in ```)
 * 4. Parse and normalise the response, filling in safe defaults for any missing fields
 * 5. Persist to `student_profiles` via `upsertStudentProfile()`
 *
 * Early-exits (no profile written) if the student has no submissions at all.
 *
 * Fire-and-forget: does not block the caller.
 * Persists to: `student_profiles` via lib/db/studentProfiles.ts
 * Uses: lib/ai/geminiClient.ts, lib/supabase/server.ts (admin client)
 *
 * @param userId - The professor's user ID
 * @param studentName - The student's name in "FirstName L." format
 */
/**
 * Generates (or regenerates) the AI growth intelligence profile for a single student.
 *
 * What it does: Orchestrates the entire process of generating a comprehensive AI-powered growth intelligence profile for a specific student.
 * Why it is used: To provide professors with in-depth, AI-driven insights into an individual student's intellectual growth, engagement, and evolving interests based on their historical submissions.
 * Important implementation details:
 * - **Flow:**
 *   1.  Calls `fetchAllStudentData()` to retrieve all relevant historical submission data for the student.
 *   2.  If no submissions are found, it early-exits without generating a profile.
 *   3.  Constructs the AI prompt using `buildPrompt()`.
 *   4.  Sends the prompt to the Gemini API using `getGeminiClient()` and `getGeminiModel()`.
 *   5.  Strips any markdown code fences (e.g., ```json) that Gemini might occasionally wrap around its JSON response.
 *   6.  Parses the raw JSON response from Gemini into a `Partial<StudentProfile>`.
 *   7.  Normalizes the parsed data, applying safe default values for any fields that might be missing from the AI's response (e.g., if the AI fails to generate a complete structure).
 *   8.  Includes backward compatibility logic to handle older schema versions by mapping legacy keys like `narrative` or `progression` to the current `observations` array.
 *   9.  Persists the fully formed `StudentProfile` object to the `student_profiles` database table via `upsertStudentProfile()`.
 * - **Behavior:** Designed as a fire-and-forget operation; it does not block the caller and handles its own asynchronous execution and persistence.
 */
export async function generateStudentProfile(userId: string, studentName: string): Promise<void> {
  const { sessions, totalSessionCount } = await fetchAllStudentData(userId, studentName)
  if (sessions.length === 0) return

  const ai = getGeminiClient()

  const response = await ai.models.generateContent({
    model: getGeminiModel(),
    contents: buildPrompt(studentName, sessions),
    config: {
      responseMimeType: 'application/json',
      systemInstruction:
        'You are an expert educational psychologist. Always respond with valid JSON matching the requested schema exactly.',
    },
  })

  // Strip markdown code fences — Gemini sometimes wraps JSON responses in ```json blocks
  const raw = (response.text ?? '').trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()

  const parsed = JSON.parse(raw) as Partial<StudentProfile>

  // Safe defaults used when growthIntelligence is entirely missing from the response
  const defaultGrowthIntelligence: GrowthIntelligence = {
    overallSignal: 'New',
    thinkingArc: { currentPhase: '', observations: [], evidenceHighlights: [] },
    themeEvolution: { coherenceLabel: 'scattered', recurringThreads: [], observations: [] },
    criticalThinking: { currentLevel: '', observations: [], strongestArea: '', growthEdge: '' },
    engagementPattern: { consistencyLabel: 'steady', depthTrend: 'stable', observations: [] },
    snapshots: [],
    aiRecommendations: [],
    semesterHighlight: '',
  }

  // Handle legacy schema by checking for "narrative" or "progression" mapped to "observations"
  // Earlier prompt versions used different key names; this ensures backwards compatibility
  // when re-generating profiles for sessions that were generated under the old schema.
  const getObs = (obj: any, keys: string[]) => {
    if (!obj) return []
    if (obj.observations) return obj.observations
    for (const k of keys) {
      if (obj[k]) return [obj[k]]
    }
    return []
  }

  const analysis: StudentProfile = {
    interests: {
      tags: parsed.interests?.tags || [],
      observations: getObs(parsed.interests, ['narrative'])
    },
    careerDirection: {
      fields: parsed.careerDirection?.fields || [],
      observations: getObs(parsed.careerDirection, ['narrative'])
    },
    growthTrajectory: {
      direction: parsed.growthTrajectory?.direction || 'insufficient_data',
      observations: getObs(parsed.growthTrajectory, ['narrative'])
    },
    personality: {
      traits: parsed.personality?.traits || [],
      observations: getObs(parsed.personality, ['narrative'])
    },
    professorNotes: parsed.professorNotes ?? [],
    growthIntelligence: parsed.growthIntelligence
      ? {
          overallSignal: parsed.growthIntelligence.overallSignal ?? defaultGrowthIntelligence.overallSignal,
          thinkingArc: {
            currentPhase: parsed.growthIntelligence.thinkingArc?.currentPhase ?? '',
            observations: getObs(parsed.growthIntelligence.thinkingArc, ['progression']),
            evidenceHighlights: parsed.growthIntelligence.thinkingArc?.evidenceHighlights ?? []
          },
          themeEvolution: {
            coherenceLabel: parsed.growthIntelligence.themeEvolution?.coherenceLabel ?? 'scattered',
            recurringThreads: parsed.growthIntelligence.themeEvolution?.recurringThreads ?? [],
            observations: getObs(parsed.growthIntelligence.themeEvolution, ['narrative'])
          },
          criticalThinking: {
            currentLevel: parsed.growthIntelligence.criticalThinking?.currentLevel ?? '',
            observations: getObs(parsed.growthIntelligence.criticalThinking, ['progression']),
            strongestArea: parsed.growthIntelligence.criticalThinking?.strongestArea ?? '',
            growthEdge: parsed.growthIntelligence.criticalThinking?.growthEdge ?? ''
          },
          engagementPattern: {
            consistencyLabel: parsed.growthIntelligence.engagementPattern?.consistencyLabel ?? 'steady',
            depthTrend: parsed.growthIntelligence.engagementPattern?.depthTrend ?? 'stable',
            observations: getObs(parsed.growthIntelligence.engagementPattern, ['narrative'])
          },
          snapshots: parsed.growthIntelligence.snapshots ?? [],
          aiRecommendations: parsed.growthIntelligence.aiRecommendations ?? [],
          semesterHighlight: parsed.growthIntelligence.semesterHighlight ?? ''
        }
      : defaultGrowthIntelligence,
    generatedAt: new Date().toISOString(),
    sessionCount: sessions.length,
  }

  await upsertStudentProfile(userId, studentName, analysis, totalSessionCount)
}

/**
 * Generates (or regenerates) AI growth intelligence profiles for a batch of students,
 * processing them in chunks of 5 to avoid overwhelming the Gemini API with concurrent
 * requests after a large ZIP upload.
 *
 * Individual failures are caught and logged per-student — one student's failure does
 * not prevent the rest of the batch from completing. This is important because a
 * malformed submission from one student should never block the whole class from
 * getting profiles.
 *
 * Called by: app/api/process/route.ts (after session upload, with the list of
 *            student names extracted from the uploaded ZIP)
 * Fire-and-forget: does not block the caller.
 * Persists to: `student_profiles` (one row per student) via lib/db/studentProfiles.ts
 *
 * @param userId - The professor's user ID
 * @param affectedStudentNames - Names of students whose profiles need regenerating,
 *                               typically parsed from the uploaded ZIP filenames
 */
/**
 * Generates (or regenerates) AI growth intelligence profiles for a batch of students,
 * processing them in chunks of 5 to avoid overwhelming the Gemini API with concurrent
 * requests after a large ZIP upload.
 *
 * What it does: Processes a list of student names, triggering the `generateStudentProfile` function for each, but doing so in controlled batches to manage API load.
 * Why it is used: To efficiently update or create profiles for multiple students simultaneously, particularly after bulk data operations (e.g., a professor uploading a ZIP file containing submissions for an entire class). This prevents single failures from stopping the entire batch.
 * Important implementation details:
 * - **Chunking:** Processes students in defined `CHUNK_SIZE` (currently 5) batches to prevent overwhelming the AI API with too many concurrent requests.
 * - **Resilience:** Uses `Promise.allSettled()` to execute the `generateStudentProfile` calls within each chunk. This ensures that if one student's profile generation fails (e.g., due to malformed data or an API error), it will not prevent the other students in the chunk from having their profiles generated.
 * - **Error Handling:** Logs any rejected promises (failed profile generations) to the console, providing visibility into individual student issues without halting the overall process.
 * - **Behavior:** Designed as a fire-and-forget operation, similar to `generateStudentProfile`, allowing the calling process to continue without waiting for all profiles to complete.
 */
export async function generateStudentProfiles(
  userId: string,
  affectedStudentNames: string[]
): Promise<void> {
  const CHUNK_SIZE = 5

  for (let i = 0; i < affectedStudentNames.length; i += CHUNK_SIZE) {
    const chunk = affectedStudentNames.slice(i, i + CHUNK_SIZE)
    // Run the chunk concurrently; allSettled ensures a rejection in one profile
    // doesn't prevent the remaining students' profiles from generating
    const results = await Promise.allSettled(
      chunk.map((name) => generateStudentProfile(userId, name))
    )

    for (const result of results) {
      if (result.status === 'rejected') {
        console.error('[studentProfile] individual generation failed:', result.reason)
      }
    }
  }
}
