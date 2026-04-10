/**
 * @file app/api/analytics/query/route.ts
 *
 * Route: POST /api/analytics/query
 *
 * Natural-language analytics query endpoint. Accepts a plain-English question
 * about the professor's session data, translates it to SQL via the Gemini-powered
 * SQL agent, executes the query, and returns a synthesized answer.
 *
 * The SQL agent uses the `execute_analytics_query` SECURITY DEFINER SQL function
 * to run read-only SELECT queries safely, bypassing RLS for aggregate reads while
 * still scoping results to the authenticated professor's data.
 *
 * Semester scoping: when a `semester` UUID is provided in the request body, a
 * plain-English constraint is prepended to the question so the agent restricts all
 * generated SQL to that semester — no SQL parameterization needed.
 *
 * Auth:         Required — 401 if not logged in.
 * DB calls:     getCurrentUser()
 * AI calls:     runAnalyticsQuery() from lib/ai/sqlAgent.ts (Gemini, blocking)
 *               sqlAgent internally calls execute_analytics_query (Supabase RPC)
 *
 * Request body: { question: string; semester?: string }
 * Response (200): { answer: string; sql: string }
 *   - answer: human-readable synthesized response
 *   - sql: the generated SELECT statement (for transparency/debugging)
 */
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/db/users'
import { runAnalyticsQuery } from '@/lib/ai/sqlAgent'

// force-dynamic ensures auth cookies are read fresh on every request
export const dynamic = 'force-dynamic'

/**
 * POST /api/analytics/query
 *
 * Accepts a natural-language question about the professor's session data and
 * returns an AI-generated answer along with the SQL that produced it.
 *
 * The underlying agent (`lib/ai/sqlAgent.ts`) translates the question into a
 * SELECT query, executes it via the `execute_analytics_query` SECURITY DEFINER
 * SQL function (bypasses RLS safely for read-only queries), then synthesizes
 * the row results back into a plain-English answer using Gemini.
 *
 * @param request - POST request with JSON body:
 *   - `question` (string, required) — natural-language question, e.g.
 *     "Which student submitted the most questions this semester?"
 *   - `semester` (string UUID, optional) — when provided, the question is
 *     automatically prefixed to scope all SQL to that semester only.
 * @returns 200 `{ answer: string; sql: string }` — the human-readable answer
 *   and the generated SQL for transparency / debugging.
 * @remarks
 * - Auth: cookie-based Supabase session via `getCurrentUser()`. Returns 401 if
 *   no valid session is present.
 * - The semester scoping is done by prepending a plain-English constraint to the
 *   question before passing it to the SQL agent, not by parameterizing SQL.
 * - `execute_analytics_query` is a SECURITY DEFINER function that validates the
 *   query is read-only (SELECT) before execution.
 * @see {@link lib/ai/sqlAgent.ts} runAnalyticsQuery
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json() as { question?: string; semester?: string }
    let question = body.question?.trim()
    const semesterId = body.semester || undefined

    if (!question) {
      return NextResponse.json({ error: 'Missing question' }, { status: 400 })
    }

    // Prepend a plain-English scoping clause so the SQL agent restricts all
    // generated queries to the selected semester without needing to understand
    // the semester filtering logic itself.
    if (semesterId) {
      question = `Only consider sessions where semester_id = '${semesterId}'. ${question}`
    }

    const { answer, sql } = await runAnalyticsQuery(question)
    return NextResponse.json({ answer, sql })

  } catch (err) {
    console.error('[/api/analytics/query]', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
