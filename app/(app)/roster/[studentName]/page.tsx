/**
 * Student detail page (`/roster/[studentName]`).
 *
 * Server component. Displays a per-student view with participation stats and
 * three tabs (rendered by `StudentDetailTabs`): Profile, Growth, and Submissions.
 *
 * Auth: getCurrentUser() — redirects to /login if not authenticated.
 * The student name is URL-encoded and decoded before lookup.
 *
 * Data:
 * - `getStudentDetail(decodedName)` — session submissions and participation counts
 * - Participation rate badge variant computed from session participation percentage:
 *   >= 80% → green (success), >= 50% → orange, < 50% → default (gray)
 *
 * Calls: lib/db/users — getCurrentUser()
 * Calls: lib/db/studentSubmissions — getStudentDetail()
 * Components: StudentDetailTabs, Badge
 */
import { getCurrentUser } from '@/lib/db/users'
import { getStudentDetail } from '@/lib/db/studentSubmissions'
import { StudentDetailTabs } from '@/components/student/StudentDetailTabs'
import { Badge } from '@/components/ui/Badge'
import { formatStudentName } from '@/lib/utils/format'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'

/**
 * What it does: Sets the Next.js page's rendering strategy.
 * Why it is used: This ensures that the page is always rendered dynamically on the server-side for every request. This is crucial for pages that display user-specific data or require up-to-the-minute information from the database, preventing stale data from being served from a cache.
 * Important implementation details: When `dynamic` is set to `force-dynamic`, Next.js will not statically optimize or cache this page. Every request will execute server-side data fetching functions, such as `getCurrentUser` and `getStudentDetail`, again.
 */
export const dynamic = 'force-dynamic'

/**
 * What it does: Determines the appropriate visual variant (color) for a Badge component based on a student's submission participation rate.
 * Why it is used: To provide a quick, visual indicator of a student's engagement level. Different colors help users immediately grasp whether a student's participation is excellent, moderate, or low.
 * Important implementation details: Takes `count` (number of sessions with submissions) and `total` (total number of sessions) as arguments.
 * - Returns 'success' if the participation rate is 80% or higher.
 * - Returns 'orange' if the participation rate is between 50% and 79% (inclusive).
 * - Returns 'default' for participation rates below 50%.
 * - Handles the edge case where `total` is 0 by returning 'default' to prevent division by zero.
 */
function participationVariant(count: number, total: number): 'success' | 'orange' | 'default' {
  if (total === 0) return 'default'
  const rate = count / total
  if (rate >= 0.8) return 'success'
  if (rate >= 0.5) return 'orange'
  return 'default'
}

/**
 * What it does: Renders the detailed page for a specific student, displaying their overall submission summary and providing a tabbed interface for session-specific details.
 * Why it is used: This page serves as a central hub for educators or administrators to view an individual student's progress, participation, and historical submissions within various teaching sessions.
 * Important implementation details:
 * - It is an asynchronous Next.js server component, enabling direct database access and efficient data fetching on the server.
 * - Authentication: It checks if a user is currently logged in using `getCurrentUser`. If not, it redirects the user to the `/login` page.
 * - Data Fetching & Error Handling: It decodes the `studentName` from the URL parameters. If decoding fails or if no student details are found in the database via `getStudentDetail`, it triggers the `notFound()` function, rendering a 404 page.
 * - Participation Calculation: It calculates the student's participation percentage and uses `participationVariant` to determine the visual styling for a participation badge.
 * - UI Structure: The page displays a link to return to the roster, the student's formatted name, a visual separator, their overall submission count, and a dynamically colored badge showing their participation percentage. It then renders the `StudentDetailTabs` component to present more granular data in a tabbed format.
 */
export default async function StudentDetailPage({
  params,
}: {
  params: { studentName: string }
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  let decodedName: string
  try {
    decodedName = decodeURIComponent(params.studentName)
  } catch {
    notFound()
  }

  const detail = await getStudentDetail(decodedName)
  if (!detail) notFound()

  const participationPct = detail.totalSessions > 0
    ? Math.round((detail.sessionCount / detail.totalSessions) * 100)
    : 0

  return (
    <div>
      <div className="mb-2 animate-fade-up">
        <Link
          href="/roster"
          className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors duration-200 font-[family-name:var(--font-dm-sans)]"
        >
          ← Roster
        </Link>
      </div>

      <div className="mb-6 animate-fade-up">
        <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-[var(--text-primary)] mb-2">
          {formatStudentName(detail.studentName)}
        </h1>
        <div className="h-0.5 w-12 bg-[#f36f21] mb-3" />
        <div className="flex items-center gap-3">
          <p className="text-[var(--text-secondary)] text-sm font-[family-name:var(--font-dm-sans)]">
            Submitted in {detail.sessionCount} of {detail.totalSessions} session{detail.totalSessions !== 1 ? 's' : ''}
          </p>
          <Badge variant={participationVariant(detail.sessionCount, detail.totalSessions)}>
            {participationPct}%
          </Badge>
        </div>
      </div>

      <StudentDetailTabs
        studentName={detail.studentName}
        sessions={detail.sessions}
      />
    </div>
  )
}
