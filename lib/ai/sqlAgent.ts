import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { Pool } from 'pg'

// ---------------------------------------------------------------------------
// Database connection pool (singleton)
// ---------------------------------------------------------------------------

let pool: Pool | null = null

function getPool(): Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL env var is not set')
    pool = new Pool({
      connectionString: url,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 5,
    })
  }
  return pool
}

// ---------------------------------------------------------------------------
// Read-only SQL guard
// ---------------------------------------------------------------------------

const WRITE_KEYWORDS = /\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|GRANT|REVOKE|COPY)\b/i

function assertReadOnly(sql: string): void {
  if (WRITE_KEYWORDS.test(sql)) {
    throw new Error('Only SELECT queries are permitted in analytics.')
  }
}

// ---------------------------------------------------------------------------
// Schema context injected into every prompt
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

// ---------------------------------------------------------------------------
// SQL generation prompt
// ---------------------------------------------------------------------------

function buildSqlPrompt(question: string): string {
  return `${SCHEMA_CONTEXT}

Generate a single, read-only SQL SELECT query that answers this question:
"${question}"

Respond with ONLY the raw SQL query — no markdown fences, no explanation, no trailing semicolon.`
}

// ---------------------------------------------------------------------------
// Answer formatting prompt
// ---------------------------------------------------------------------------

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
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) throw new Error('GOOGLE_API_KEY env var is not set')

  const llm = new ChatGoogleGenerativeAI({
    model: 'gemini-3-flash-preview',
    apiKey,
    temperature: 0,
  })

  // Step 1: generate SQL
  const sqlResponse = await llm.invoke([
    new SystemMessage('You are an expert PostgreSQL query writer. Output only raw SQL.'),
    new HumanMessage(buildSqlPrompt(question)),
  ])

  const sql = (sqlResponse.content as string).trim()
    .replace(/^```(?:sql)?\s*/i, '')
    .replace(/\s*```$/, '')
    .replace(/;$/, '')
    .trim()

  // Step 2: validate read-only
  assertReadOnly(sql)

  // Step 3: execute
  const db = getPool()
  const result = await db.query(sql)
  const rows = result.rows

  // Step 4: format natural language answer
  const answerResponse = await llm.invoke([
    new SystemMessage('You are a helpful assistant summarising database query results for a professor.'),
    new HumanMessage(buildAnswerPrompt(question, sql, rows)),
  ])

  const answer = (answerResponse.content as string).trim()

  return { answer, sql }
}
