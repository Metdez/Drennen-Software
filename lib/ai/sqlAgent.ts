import { GoogleGenAI } from '@google/genai'
import { createAdminClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Read-only SQL guard (client-side; DB fn also validates)
// ---------------------------------------------------------------------------

const WRITE_KEYWORDS = /\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|GRANT|REVOKE|COPY)\b/i

function assertReadOnly(sql: string): void {
  if (WRITE_KEYWORDS.test(sql)) {
    throw new Error('Only SELECT queries are permitted in analytics.')
  }
}

// ---------------------------------------------------------------------------
// Schema context
// ---------------------------------------------------------------------------

const SCHEMA_CONTEXT = `
You have read-only access to a PostgreSQL database for a university professor tool called MGMT 305.
Professors upload student question submissions for guest speaker sessions; the AI synthesizes them.

Tables available to you:

  sessions (
    id           UUID PRIMARY KEY,
    user_id      UUID,           -- professor's user ID
    speaker_name TEXT,           -- name of the guest speaker
    created_at   TIMESTAMPTZ,
    output       TEXT,           -- full AI-generated markdown output
    file_count   INTEGER         -- number of student files processed
  )

  student_submissions (
    id              UUID PRIMARY KEY,
    session_id      UUID REFERENCES sessions(id),
    student_name    TEXT,         -- "FirstName L." format, e.g. "Jake M."
    submission_text TEXT,         -- raw text of what the student submitted
    created_at      TIMESTAMPTZ
  )

  session_themes (
    id           UUID PRIMARY KEY,
    session_id   UUID REFERENCES sessions(id),
    theme_number INTEGER,          -- 1-based rank
    theme_title  TEXT,             -- e.g. "Leadership Under Pressure"
    created_at   TIMESTAMPTZ
  )

Rules:
- Only generate SELECT queries. Never INSERT, UPDATE, DELETE, or DROP anything.
- Always qualify table names (e.g. sessions.id, not just id) when joining.
- Return concise, readable column aliases in result sets.
- student_name is stored as "FirstName L." — use ILIKE '%Jake%' for partial first-name matching.
- session_themes.theme_number is 1-based ordering within a session.
`.trim()

function buildSqlPrompt(question: string): string {
  return `${SCHEMA_CONTEXT}

Generate a single, read-only SQL SELECT query that answers this question:
"${question}"

Respond with ONLY the raw SQL query — no markdown fences, no explanation, no trailing semicolon.`
}

function buildAnswerPrompt(question: string, sql: string, rows: unknown[]): string {
  return `A professor asked: "${question}"

The following SQL was run:
${sql}

The query returned ${rows.length} row(s):
${JSON.stringify(rows, null, 2)}

Write a clear, concise plain-English answer for the professor. Use bullet points if there are multiple items. Do not repeat the SQL or mention internal table names.`
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface AnalyticsResult {
  answer: string
  sql: string
}

export async function runAnalyticsQuery(question: string): Promise<AnalyticsResult> {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY env var is not set')

  const ai = new GoogleGenAI({ apiKey })
  const model = process.env.GEMINI_MODEL ?? 'gemini-3-flash-preview'

  // Step 1: generate SQL
  const sqlResponse = await ai.models.generateContent({
    model,
    contents: buildSqlPrompt(question),
    config: { systemInstruction: 'You are an expert PostgreSQL query writer. Output only raw SQL.' },
  })

  const sql = (sqlResponse.text ?? '').trim()
    .replace(/^```(?:sql)?\s*/i, '')
    .replace(/\s*```$/, '')
    .replace(/;$/, '')
    .trim()

  // Step 2: validate read-only
  assertReadOnly(sql)

  // Step 3: execute via Supabase RPC (SECURITY DEFINER, DB also validates)
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('execute_analytics_query', { query_text: sql })
  if (error) throw new Error(`Query failed: ${error.message}`)

  const rows: unknown[] = Array.isArray(data) ? data : (data ? [data] : [])

  // Step 4: format natural language answer
  const answerResponse = await ai.models.generateContent({
    model,
    contents: buildAnswerPrompt(question, sql, rows),
    config: { systemInstruction: 'You are a helpful assistant summarising database query results for a professor.' },
  })

  const answer = (answerResponse.text ?? '').trim()

  return { answer, sql }
}
