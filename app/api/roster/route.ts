import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getStudentsWithParticipation } from '@/lib/db/studentSubmissions'
import { getGrowthSignalsForUser } from '@/lib/db/studentProfiles'
import { getStudentsWithFollowupFlags } from '@/lib/db/professorNotes'

export const dynamic = 'force-dynamic'

/**
 * GET /api/roster
 *
 * Returns all students who have submitted questions for the authenticated professor,
 * enriched with AI-generated growth signals and professor follow-up flags.
 *
 * @param request - Incoming request. Accepts optional `?semester=<semesterId>` query
 *   parameter to filter students to those who participated in a specific semester.
 *   Omit the parameter to fetch students across all semesters.
 * @returns `{ students: EnrichedStudent[] }` — an array of student participation
 *   records, each extended with:
 *   - `growthSignal` (optional string) — AI-generated growth signal from the student
 *     profile, keyed by student name.
 *   - `flaggedForFollowup` (optional true) — present when the professor has flagged
 *     the student for follow-up via a professor note.
 * @remarks
 *   - **Auth**: Requires a valid session cookie. Returns 401 if unauthenticated.
 *   - All three data sources (`getStudentsWithParticipation`, `getGrowthSignalsForUser`,
 *     `getStudentsWithFollowupFlags`) are fetched in parallel via `Promise.all`.
 *   - Growth signals come from the `student_profiles` table (JSONB, denormalized
 *     `growth_signal` column). They may be absent if the AI profile has not been
 *     generated yet for a given student.
 *   - Follow-up flags come from the `professor_student_notes` table.
 * @see {@link lib/db/studentSubmissions.ts} — `getStudentsWithParticipation()`
 * @see {@link lib/db/studentProfiles.ts} — `getGrowthSignalsForUser()`
 * @see {@link lib/db/professorNotes.ts} — `getStudentsWithFollowupFlags()`
 */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Optional semester filter — undefined means "all semesters"
    const { searchParams } = new URL(request.url)
    const semesterId = searchParams.get('semester') ?? undefined

    // Fetch student list, growth signals, and follow-up flags concurrently
    const [students, growthSignals, flaggedStudents] = await Promise.all([
      getStudentsWithParticipation(semesterId),
      getGrowthSignalsForUser(user.id),
      getStudentsWithFollowupFlags(user.id),
    ])

    // Merge growth signals and follow-up flags into each student record.
    // `flaggedForFollowup` is omitted (undefined) rather than set to false
    // to keep the payload lean — consumers treat absence as "not flagged".
    const enriched = students.map((s) => ({
      ...s,
      growthSignal: growthSignals.get(s.studentName) ?? undefined,
      flaggedForFollowup: flaggedStudents.has(s.studentName) || undefined,
    }))

    return NextResponse.json({ students: enriched })

  } catch (err) {
    console.error('[/api/roster] GET', err)
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 })
  }
}
