import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { generateSemesterReport } from '@/lib/ai/reportAgent'
import type { ReportConfig } from '@/types'

/**
 * Specifies the rendering behavior for this Next.js route handler.
 *
 * What it does: It forces the route handler to be dynamically rendered at request time, meaning it will not be statically optimized or cached at build time or during revalidation.
 *
 * Why it is used: Report generation is inherently a dynamic process. It depends on the current user, real-time data, and external AI service calls, which makes static rendering unsuitable.
 *
 * Important implementation details: Setting this to 'force-dynamic' ensures that the handler function is executed on every incoming request, providing up-to-date and user-specific results.
 */
export const dynamic = 'force-dynamic'
/**
 * Sets the maximum allowed execution duration for this Next.js route handler.
 *
 * What it does: It configures the serverless function (or equivalent runtime) to permit an execution time of up to 60 seconds before timing out.
 *
 * Why it is used: AI-driven report generation can be a computationally intensive and time-consuming process. The default serverless function timeout (e.g., 10 seconds on Vercel Hobby plan) might not be sufficient, leading to premature termination of the report generation.
 *
 * Important implementation details: The value is specified in seconds. 60 seconds is chosen to provide ample time for the `generateSemesterReport` function, which involves external AI API calls, to complete its operation without hitting a timeout.
 */
export const maxDuration = 60

/**
 * Handles POST requests to generate a semester report.
 *
 * What it does: This is the primary API endpoint for initiating the AI-powered report generation process. It authenticates the user, validates the request payload, configures the report, and then calls an AI agent to produce the report content.
 *
 * Why it is used: It provides a secure and structured interface for client applications to request customized semester reports, leveraging AI capabilities to synthesize information.
 *
 * Important implementation details:
 * -   User authentication: It calls `getCurrentUser()` to ensure only authenticated users can generate reports, returning a 401 Unauthorized response if no user is found.
 * -   Input validation: The request body is strictly validated for `title` and `includedSections`, returning 400 Bad Request for missing or invalid parameters.
 * -   Report configuration: A `ReportConfig` object is constructed from the validated body, including optional `dateRange` and `customNotes`.
 * -   AI delegation: The core logic for report generation is delegated to `generateSemesterReport()` from the AI agent library, passing the user ID and the report configuration.
 * -   Response: Upon successful generation, it returns the `reportId` and the `content` of the report.
 * -   Error handling: A `try-catch` block is used to gracefully handle any errors during the process, logging them and returning a 500 Internal Server Error with a descriptive message.
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as {
      title?: string
      dateRange?: { start: string; end: string }
      includedSections?: string[]
      customNotes?: string
    }

    if (!body.title?.trim()) {
      return NextResponse.json({ error: 'Missing title' }, { status: 400 })
    }

    if (!Array.isArray(body.includedSections) || body.includedSections.length === 0) {
      return NextResponse.json(
        { error: 'includedSections must be a non-empty array' },
        { status: 400 }
      )
    }

    const config: ReportConfig = {
      title: body.title.trim(),
      dateRange: body.dateRange ?? null,
      includedSections: body.includedSections,
      customNotes: body.customNotes,
    }

    const { reportId, content } = await generateSemesterReport(user.id, config)

    return NextResponse.json({ reportId, content })

  } catch (err) {
    console.error('[/api/reports/generate]', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
