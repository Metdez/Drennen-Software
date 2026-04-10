/**
 * @file app/api/roster/[studentName]/profile/route.ts
 *
 * Route: GET /api/roster/[studentName]/profile
 *
 * Returns the AI-generated growth intelligence profile for a specific student.
 * Profiles are stored in `student_profiles` (one row per professor+student pair)
 * and are normally generated fire-and-forget after each session upload via
 * `generateStudentProfiles()`.
 *
 * On-demand regeneration: if the profile is missing or stale (missing the
 * `growthIntelligence` field added in a later schema version), it is regenerated
 * synchronously before returning. Regeneration failures are swallowed — the
 * caller receives `{ profile: null }` rather than a 500.
 *
 * The student name comes URL-encoded from the route param and must be decoded
 * via `decodeURIComponent()` before DB lookups.
 *
 * Auth:     Required — 401 if not logged in.
 * DB calls: getCurrentUser(), getStudentProfile() from lib/db/studentProfiles.ts
 * AI calls: generateStudentProfile() from lib/ai/studentProfile.ts (Gemini,
 *           synchronous fallback only — normally runs fire-and-forget)
 *
 * Response: `{ profile: StudentProfile | null }`
 */
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getStudentProfile } from '@/lib/db/studentProfiles'
import { generateStudentProfile } from '@/lib/ai/studentProfile'

export const dynamic = 'force-dynamic'

/**
 * GET /api/roster/[studentName]/profile
 *
 * Returns the AI-generated growth intelligence profile for a specific student.
 * If the profile is absent or stale (pre-dates the `growthIntelligence` schema),
 * it is regenerated on-the-fly before responding.
 *
 * @param _request - Not used; student name comes from the route segment.
 * @param params.studentName - URL-encoded student name (e.g. `"Jane%20S."`).
 * @returns `{ profile: StudentProfile | null }` — the full profile object from the
 *   `student_profiles` table, or `null` if generation also failed (e.g. insufficient
 *   submission history to generate a meaningful profile).
 * @remarks
 *   - **Auth**: Requires a valid session cookie. Returns 401 if unauthenticated.
 *   - Profiles are stored one row per `(professor_id, student_name)` pair in the
 *     `student_profiles` table. The JSONB `profile` column includes `growthIntelligence`.
 *   - **On-demand regeneration**: Normally profiles are generated fire-and-forget
 *     after each session upload via `generateStudentProfiles()`. This route fills the
 *     gap for missing/stale profiles by regenerating synchronously. Failures are
 *     swallowed — the caller receives `{ profile: null }` rather than a 500.
 *   - The `growthIntelligence` field was added in a later schema version; its absence
 *     is the staleness signal used to trigger regeneration.
 * @see {@link lib/db/studentProfiles.ts} — `getStudentProfile()`
 * @see {@link lib/ai/studentProfile.ts} — `generateStudentProfile()`
 */
export async function GET(
  _request: Request,
  { params }: { params: { studentName: string } }
) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Decode percent-encoded name — malformed encoding returns 400
  let decodedName: string
  try {
    decodedName = decodeURIComponent(params.studentName)
  } catch {
    return NextResponse.json({ error: 'Invalid student name' }, { status: 400 })
  }

  let profile = await getStudentProfile(user.id, decodedName)

  // Regenerate if missing or stale (old format without growthIntelligence)
  const needsRegeneration = !profile || !profile.growthIntelligence

  if (needsRegeneration) {
    try {
      // Synchronous regeneration as a fallback — normally this runs fire-and-forget
      // after session upload. If it fails, we still respond with null rather than 500.
      await generateStudentProfile(user.id, decodedName)
      profile = await getStudentProfile(user.id, decodedName)
    } catch (e) {
      console.error('[/api/roster/profile] fallback generation failed:', e)
    }
  }

  return NextResponse.json({ profile })
}
