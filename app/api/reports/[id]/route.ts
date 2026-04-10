import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { getReportById } from '@/lib/db/reports'

/**
 * What it does: Forces the route to be dynamically rendered at request time, bypassing any caching mechanisms.
 * Why it is used: Ensures that every request to this API route is processed live and not cached. This is crucial for routes that depend on user sessions (authentication) or frequently changing data, guaranteeing that the user always gets up-to-date and personalized information.
 * Important implementation details: This is a Next.js App Router specific export. Setting it to 'force-dynamic' guarantees that the associated handler function (like GET) runs on every incoming request, rather than serving a potentially stale cached response.
 */
export const dynamic = 'force-dynamic'

/**
 * What it does: Handles HTTP GET requests for the `/api/reports/[id]` endpoint, responsible for retrieving a single report associated with the authenticated user.
 * Why it is used: This function provides a secure API endpoint that allows an authenticated user to fetch the details of a specific report they own, identified by its unique ID. It enforces authorization to ensure that users can only access their own reports.
 * Important implementation details:
 * 1.  **Authentication:** It first calls `getCurrentUser()` to verify if a user is authenticated. If not, it immediately returns a 401 Unauthorized response.
 * 2.  **Report Retrieval:** It attempts to fetch the report from the database using the provided `id` from the URL parameters via `getReportById(params.id)`.
 * 3.  **Authorization:** A critical authorization check is performed: `report.userId !== user.id`. This ensures that the retrieved report actually belongs to the currently authenticated user. If the report is not found or does not belong to the user, a 404 Not Found error is returned (to avoid leaking information about other users' reports).
 * 4.  **Success Response:** If authentication and authorization succeed, the report data is returned in a 200 OK JSON response.
 * 5.  **Error Handling:** A `try...catch` block is used to gracefully handle unexpected server-side errors, logging them and returning a 500 Internal Server Error to the client.
 * 6.  **Dynamic Route:** The `export const dynamic = 'force-dynamic'` declaration ensures this route is always executed dynamically, preventing potential caching issues with sensitive, user-specific data.
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

    const report = await getReportById(params.id)
    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    if (report.userId !== user.id) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    return NextResponse.json({ report })

  } catch (err) {
    console.error('[/api/reports/[id]]', err)
    return NextResponse.json({ error: 'Failed to fetch report' }, { status: 500 })
  }
}
