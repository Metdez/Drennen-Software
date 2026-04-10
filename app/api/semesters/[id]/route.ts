import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getSemesterById, updateSemester } from '@/lib/db/semesters'

export const dynamic = 'force-dynamic'

/**
 * GET /api/semesters/[id]
 *
 * Fetches a single semester by ID, enforcing ownership — professors can only
 * retrieve their own semesters.
 *
 * @param _request - Not used; semester ID comes from the route segment.
 * @param params.id - UUID of the semester to fetch.
 * @returns `{ semester: Semester }` on success.
 * @remarks
 *   - **Auth**: Requires a valid session cookie. Returns 401 if unauthenticated.
 *   - Ownership mismatch returns 404 (not 403) to avoid leaking the existence of
 *     another professor's semester.
 * @see {@link lib/db/semesters.ts} — `getSemesterById()`
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const semester = await getSemesterById(params.id)
    if (!semester) {
      return NextResponse.json({ error: 'Semester not found' }, { status: 404 })
    }

    // Return 404 (not 403) so callers cannot probe for the existence of other professors' semesters
    if (semester.userId !== user.id) {
      return NextResponse.json({ error: 'Semester not found' }, { status: 404 })
    }

    return NextResponse.json({ semester })

  } catch (err) {
    console.error('[/api/semesters/[id]] GET', err)
    return NextResponse.json({ error: 'Failed to fetch semester' }, { status: 500 })
  }
}

/**
 * PATCH /api/semesters/[id]
 *
 * Updates one or more fields on an existing semester. Ownership is verified
 * before applying any changes.
 *
 * @param request - JSON body (all fields optional; only provided fields are applied):
 *   ```json
 *   {
 *     "name": "Fall 2026",
 *     "startDate": "2026-08-25",
 *     "endDate": "2026-12-15",
 *     "status": "archived"
 *   }
 *   ```
 *   `status` must be `"active"` or `"archived"`.
 * @param params.id - UUID of the semester to update.
 * @returns `{ semester: Semester }` — the updated semester record.
 * @remarks
 *   - **Auth**: Requires a valid session cookie. Returns 401 if unauthenticated.
 *   - Ownership is checked before updating; a mismatch returns 404.
 *   - Callers can use `status: "archived"` here to manually archive a semester
 *     without immediately creating a new one (contrast with the atomic
 *     `archiveCurrent` flag in `POST /api/semesters`).
 * @see {@link lib/db/semesters.ts} — `getSemesterById()`, `updateSemester()`
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership before updating
    const existing = await getSemesterById(params.id)
    if (!existing) {
      return NextResponse.json({ error: 'Semester not found' }, { status: 404 })
    }

    if (existing.userId !== user.id) {
      return NextResponse.json({ error: 'Semester not found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, startDate, endDate, status } = body

    const semester = await updateSemester(params.id, {
      name,
      startDate,
      endDate,
      status,
    })

    return NextResponse.json({ semester })

  } catch (err) {
    console.error('[/api/semesters/[id]] PATCH', err)
    return NextResponse.json({ error: 'Failed to update semester' }, { status: 500 })
  }
}
