# AGENT-SUPABASE.md — Agent 03: Supabase Database Setup
# Wave 1 agent. Fires simultaneously with Agents 01, 02, and 04.
# You are setting up the database. You write SQL, not TypeScript app code.

---

## MANDATORY PRE-READ

1. AGENTS.md
2. STRUCTURE.md
3. ERRORS.md
4. SCHEMA.md ← your entire spec. Every table, column, index, and policy is defined there.
5. ENV.md ← connection credentials

---

## YOUR JOB

Create the Supabase database migration file and configure the project. You own these files and ONLY these files:

```
supabase/migrations/20240101000000_initial_schema.sql
supabase/config.toml (if initializing local supabase)
```

You do NOT write any TypeScript. You do NOT touch lib/, app/, or components/.

---

## STEP 1: INITIALIZE SUPABASE (if not already done)

```bash
npx supabase init
```

This creates the `supabase/` directory structure.

---

## STEP 2: CREATE THE MIGRATION FILE

Create `supabase/migrations/20240101000000_initial_schema.sql` with the complete schema from SCHEMA.md.

```sql
-- ============================================================
-- Drennen MGMT 305 — Initial Schema
-- ============================================================

-- Sessions table
-- Stores every AI generation run by every professor
CREATE TABLE sessions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  speaker_name  TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  output        TEXT NOT NULL,
  file_count    INTEGER NOT NULL DEFAULT 0
);

-- Indexes for common query patterns
CREATE INDEX sessions_user_id_idx ON sessions(user_id);
CREATE INDEX sessions_created_at_idx ON sessions(created_at DESC);

-- ============================================================
-- Row Level Security
-- ============================================================

-- Enable RLS on sessions table
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Users can only SELECT their own sessions
CREATE POLICY "Users can view own sessions"
  ON sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only INSERT sessions for themselves
CREATE POLICY "Users can insert own sessions"
  ON sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- No UPDATE policy — sessions are immutable
-- No DELETE policy — professors cannot delete history

-- ============================================================
-- Notes
-- ============================================================
-- The auth.users table is managed entirely by Supabase Auth.
-- We never create or modify it.
-- New professor accounts are created via the Supabase dashboard.
-- Self-signup is disabled at the project level (see DECISIONS.md DEC-006).
```

---

## STEP 3: APPLY THE MIGRATION

**Option A — Using Supabase CLI (recommended for local dev):**
```bash
npx supabase db push
```

**Option B — Direct SQL editor:**
Copy the SQL above and paste it into:
Supabase Dashboard → SQL Editor → New Query → Run

---

## STEP 4: CONFIGURE SUPABASE AUTH SETTINGS

In the Supabase Dashboard, configure these settings manually:

**Authentication → Providers → Email:**
- Enable email provider: YES
- Confirm email: optional for this use case
- **Enable email signups: NO** ← critical, see DECISIONS.md DEC-006

**Authentication → Providers → Google:**
- Enable Google provider: YES
- You'll need to add Google OAuth credentials
- Authorized redirect URI for this app: `https://kdukifzbqmxffmdzfrip.supabase.co/auth/v1/callback`

**Authentication → URL Configuration:**
- Site URL: `http://localhost:3000` (update to production URL after deploy)
- Redirect URLs: Add `http://localhost:3000/api/auth/callback`

---

## STEP 5: VERIFY

After applying the migration, verify in the Supabase dashboard:

**Table Editor:** You should see a `sessions` table with all 6 columns.

**Authentication → Policies:** You should see 2 policies on the sessions table:
- "Users can view own sessions" (SELECT)
- "Users can insert own sessions" (INSERT)

Run this test query in the SQL editor to confirm structure:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sessions'
ORDER BY ordinal_position;
```

Expected output:
| column_name | data_type | is_nullable |
|---|---|---|
| id | uuid | NO |
| user_id | uuid | NO |
| speaker_name | text | NO |
| created_at | timestamp with time zone | NO |
| output | text | NO |
| file_count | integer | NO |

---

## COMPLETION CHECKLIST

- [ ] `supabase/migrations/20240101000000_initial_schema.sql` created
- [ ] Migration applied to the Supabase project
- [ ] `sessions` table visible in Supabase Table Editor
- [ ] RLS enabled with both policies active
- [ ] Email signups disabled in Auth settings
- [ ] Google OAuth provider enabled
- [ ] Redirect URL configured in Supabase Auth settings
- [ ] Verification query returns correct 6-column schema
