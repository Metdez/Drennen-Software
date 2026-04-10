/**
 * @file app/api/semesters/route.ts
 *
 * Routes: GET | POST /api/semesters
 *
 * Manages semester records for the authenticated professor.
 *
 * GET  — lists all semesters and the count of unassigned sessions. Both are
 *         fetched in parallel. Unassigned sessions are those with
 *         `semester_id = NULL` and can be bulk-assigned from `/semesters`.
 *         Response: `{ semesters: Semester[], unassignedCount: number }`
 *
 * POST — creates a new semester. The `archiveCurrent` flag (optional, default
 *         false) atomically archives the currently active semester and makes the
 *         new one active in a single DB operation via `archiveAndCreateSemester()`.
 *         Without `archiveCurrent`, new semesters are inserted without touching
 *         the existing active semester.
 *         Required fields: name, startDate, endDate.
 *         Response: `{ semester: Semester }` with status 201.
 *
 * Auth:     Required on both methods — 401 if not logged in.
 * DB calls: getCurrentUser(), getSemestersByUser(), getUnassignedSessions(),
 *           insertSemester(), archiveAndCreateSemester()
 * AI calls: None
 */
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import {
  getSemestersByUser,
  getUnassignedSessions,
  insertSemester,
  archiveAndCreateSemester,
} from '@/lib/db/semesters'

export const dynamic = 'force-dynamic'

/**
 * GET /api/semesters
 *
 * Lists all semesters belonging to the authenticated professor along with a count
 * of sessions that have not yet been assigned to any semester.
 *
 * @returns `{ semesters: Semester[], unassignedCount: number }` — all semesters
 *   ordered by start date, plus the number of unassigned sessions the professor
 *   can still group into a semester.
 * @remarks
 *   - **Auth**: Requires a valid session cookie. Returns 401 if unauthenticated.
 *   - Semesters and unassigned session counts are fetched in parallel.
 *   - Each professor can have at most one semester with `status = 'active'` at a
 *     time; all others are `'archived'`.
 * @see {@link lib/db/semesters.ts} — `getSemestersByUser()`, `getUnassignedSessions()`
 */
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch semester list and unassigned session count concurrently
    const [semesters, unassigned] = await Promise.all([
      getSemestersByUser(user.id),
      getUnassignedSessions(user.id),
    ])

    return NextResponse.json({
      semesters,
      unassignedCount: unassigned.length,
    })

  } catch (err) {
    console.error('[/api/semesters] GET', err)
    return NextResponse.json({ error: 'Failed to fetch semesters' }, { status: 500 })
  }
}

/**
 * POST /api/semesters
 *
 * Creates a new semester for the authenticated professor. Optionally archives the
 * currently active semester in the same atomic operation.
 *
 * @param request - JSON body:
 *   ```json
 *   {
 *     "name": "Spring 2026",
 *     "startDate": "2026-01-15",
 *     "endDate": "2026-05-10",
 *     "archiveCurrent": true
 *   }
 *   ```
 *   - `name`, `startDate`, and `endDate` are required.
 *   - `archiveCurrent` (optional boolean, default `false`) — when `true`, the
 *     currently active semester is archived and the new one becomes active in
 *     a single transaction via `archiveAndCreateSemester()`.
 * @returns `{ semester: Semester }` with status 201 on success.
 * @remarks
 *   - **Auth**: Requires a valid session cookie. Returns 401 if unauthenticated.
 *   - When `archiveCurrent` is `false`, any existing active semester remains active
 *     and the new semester is created with whatever status the DB default assigns.
 *   - Missing required fields return 400.
 * @see {@link lib/db/semesters.ts} — `insertSemester()`, `archiveAndCreateSemester()`
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, startDate, endDate, archiveCurrent } = body

    if (!name || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'name, startDate, and endDate are required' },
        { status: 400 }
      )
    }

    const input = { userId: user.id, name, startDate, endDate }

    // archiveCurrent=true atomically archives the active semester and creates the new one
    const semester = archiveCurrent
      ? await archiveAndCreateSemester(user.id, input)
      : await insertSemester(input)

    return NextResponse.json({ semester }, { status: 201 })

  } catch (err) {
    console.error('[/api/semesters] POST', err)
    return NextResponse.json({ error: 'Failed to create semester' }, { status: 500 })
  }
}
