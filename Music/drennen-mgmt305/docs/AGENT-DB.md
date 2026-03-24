# AGENT-DB.md — Agent 06: Database Layer
# Wave 2 agent. Fires after Wave 1 is merged.

---

## MANDATORY PRE-READ

1. AGENTS.md
2. STRUCTURE.md
3. ERRORS.md
4. SCHEMA.md ← your primary reference
5. TYPES.md ← every interface you'll use
6. ENV.md

---

## YOUR JOB

Build all database query functions. You own these files and ONLY these files:

```
lib/db/sessions.ts
lib/db/users.ts
lib/utils/transforms.ts
```

---

## IMPORTANT: YOU DO NOT TOUCH THE DATABASE SCHEMA

Agent 03 created the schema and migrations. You are writing the query functions that read and write data. Do not create new SQL migrations. Do not alter tables. Query the tables as defined in SCHEMA.md.

---

## FILE 1: lib/db/sessions.ts

All queries against the sessions table. Uses `createAdminClient` from `lib/supabase/server.ts` for inserts (server-side trusted context). Uses RLS-respecting client for reads.

```ts
import { createAdminClient, createClient } from '@/lib/supabase/server'
import type { Session, SessionSummary, CreateSessionInput, SessionRow } from '@/types'
import { rowToSession, rowToSessionSummary } from '@/lib/utils/transforms'

// Insert a new session. Called from app/api/process/route.ts after AI completes.
export async function insertSession(input: CreateSessionInput): Promise<Session> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      user_id: input.userId,
      speaker_name: input.speakerName,
      output: input.output,
      file_count: input.fileCount,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to insert session: ${error.message}`)
  return rowToSession(data as SessionRow)
}

// Get all sessions for a user, newest first. Output field excluded for performance.
export async function getSessionsByUser(userId: string): Promise<SessionSummary[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('sessions')
    .select('id, speaker_name, created_at, file_count')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch sessions: ${error.message}`)
  return (data as SessionRow[]).map(rowToSessionSummary)
}

// Get a single session by ID including full output.
// RLS ensures this only returns rows belonging to the logged-in user.
export async function getSessionById(id: string): Promise<Session | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return rowToSession(data as SessionRow)
}
```

---

## FILE 2: lib/db/users.ts

Thin user utilities. Supabase Auth handles the heavy lifting — we just need a convenience function.

```ts
import { createClient } from '@/lib/supabase/server'
import type { AuthUser } from '@/types'

// Get the currently authenticated user from the server session.
// Returns null if not authenticated.
export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return {
    id: user.id,
    email: user.email ?? '',
  }
}
```

---

## FILE 3: lib/utils/transforms.ts

Converts snake_case database rows to camelCase TypeScript objects.

```ts
import type { SessionRow, Session, SessionSummary } from '@/types'

export function rowToSession(row: SessionRow): Session {
  return {
    id: row.id,
    userId: row.user_id,
    speakerName: row.speaker_name,
    createdAt: row.created_at,
    output: row.output,
    fileCount: row.file_count,
  }
}

export function rowToSessionSummary(row: SessionRow): SessionSummary {
  return {
    id: row.id,
    speakerName: row.speaker_name,
    createdAt: row.created_at,
    fileCount: row.file_count,
  }
}
```

---

## COMPLETION CHECKLIST

- [ ] `lib/db/sessions.ts` — insertSession, getSessionsByUser, getSessionById
- [ ] `lib/db/users.ts` — getCurrentUser
- [ ] `lib/utils/transforms.ts` — rowToSession, rowToSessionSummary
- [ ] All functions are async, all errors are caught and rethrown with descriptive messages
- [ ] No hardcoded table names (use string literals matching SCHEMA.md exactly: `'sessions'`)
- [ ] `npx tsc --noEmit` passes with zero errors
