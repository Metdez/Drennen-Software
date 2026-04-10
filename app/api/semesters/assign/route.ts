import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { assignSessionsToSemester, getSemesterById } from '@/lib/db/semesters'

export const dynamic = 'force-dynamic'

/**
 * POST /api/semesters/assign
 *
 * Bulk-assigns one or more sessions to a semester by setting their
 * `semester_id` foreign key. Used from the `/semesters` page to group
 * previously unassigned sessions into a semester.
 *
 * @param request - JSON body:
 *   ```json
 *   {
 *     "sessionIds": ["uuid-1", "uuid-2"],
 *     "semesterId": "uuid-semester"
 *   }
 *   ```
 *   Both fields are required. `sessionIds` must be a non-empty array.
 * @returns `{ success: true }` on success.
 * @remarks
 *   - **Auth**: Requires a valid session cookie. Returns 401 if unauthenticated.
 *   - Semester ownership is verified via `getSemesterById` + `userId` comparison
 *     before any writes occur. Returns 404 if not found or not owned.
 *   - Sessions themselves are not validated for ownership here — the DB RLS
 *     policies enforce that professors can only update their own sessions.
 *   - Sessions can only be assigned; to unassign, set `semester_id = NULL` via
 *     a direct DB operation (no API endpoint exists for unassignment).
 * @see {@link lib/db/semesters.ts} — `assignSessionsToSemester()`, `getSemesterById()`
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { sessionIds, semesterId } = body

    if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
      return NextResponse.json(
        { error: 'sessionIds must be a non-empty array' },
        { status: 400 }
      )
    }

    if (!semesterId) {
      return NextResponse.json(
        { error: 'semesterId is required' },
        { status: 400 }
      )
    }

    // Verify the target semester exists and belongs to the requesting professor
    const semester = await getSemesterById(semesterId)
    if (!semester || semester.userId !== user.id) {
      return NextResponse.json({ error: 'Semester not found' }, { status: 404 })
    }

    await assignSessionsToSemester(sessionIds, semesterId)

    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('[/api/semesters/assign] POST', err)
    return NextResponse.json({ error: 'Failed to assign sessions' }, { status: 500 })
  }
}
