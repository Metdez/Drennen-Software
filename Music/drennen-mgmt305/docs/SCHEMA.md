# SCHEMA.md — Database Schema
# Supabase (PostgreSQL) — all tables, columns, types, constraints, and RLS policies
# Agent 03 creates the migrations. All other agents read this to know the data shape.

---

## CONNECTION

- **Project URL:** `https://kdukifzbqmxffmdzfrip.supabase.co`
- **Anon key:** see ENV.md
- **Service role key:** see ENV.md (server-side only, never in browser)

---

## TABLE: sessions

This is the only application table. It stores every generation run.

```sql
CREATE TABLE sessions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  speaker_name  TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  output        TEXT NOT NULL,
  file_count    INTEGER NOT NULL DEFAULT 0
);
```

### Column definitions

| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | UUID | NO | Primary key, auto-generated |
| `user_id` | UUID | NO | FK to Supabase auth.users — who ran this session |
| `speaker_name` | TEXT | NO | The guest speaker name the professor entered |
| `created_at` | TIMESTAMPTZ | NO | When the session was created, UTC |
| `output` | TEXT | NO | Full AI-generated question sheet as plain text |
| `file_count` | INTEGER | NO | Number of student files processed in this session |

### Indexes

```sql
CREATE INDEX sessions_user_id_idx ON sessions(user_id);
CREATE INDEX sessions_created_at_idx ON sessions(created_at DESC);
```

---

## ROW LEVEL SECURITY (RLS)

RLS is enabled on all tables. This is enforced at the database level.

```sql
-- Enable RLS
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Policy: users can only see their own sessions
CREATE POLICY "Users can view own sessions"
  ON sessions FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: users can only insert their own sessions
CREATE POLICY "Users can insert own sessions"
  ON sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- No UPDATE policy — sessions are immutable once created
-- No DELETE policy — professors cannot delete their history
```

---

## AUTH TABLES (managed by Supabase, do not touch)

Supabase manages `auth.users` automatically. We never create or modify this table.
The `user_id` foreign key in `sessions` references `auth.users(id)`.

Fields we use from `auth.users`:
- `id` — UUID, used as our `user_id`
- `email` — for display in the nav header

---

## MIGRATION FILE LOCATION

```
supabase/migrations/
  └── 20240101000000_initial_schema.sql
```

This single migration file contains all `CREATE TABLE`, `CREATE INDEX`, and `CREATE POLICY` statements above. Run with:

```bash
supabase db push
```

Or apply manually in the Supabase SQL editor.

---

## QUERY PATTERNS (what lib/db/ functions look like)

All queries are in `lib/db/sessions.ts`. No other file queries the database directly.

```ts
// Insert a new session (called from API route after AI completes)
insertSession(input: CreateSessionInput): Promise<Session>

// Get all sessions for the logged-in user, newest first
getSessionsByUser(userId: string): Promise<Session[]>

// Get a single session by ID (verifies ownership via RLS)
getSessionById(id: string, userId: string): Promise<Session | null>
```

See TYPES.md for the `Session`, `CreateSessionInput` interface definitions.
