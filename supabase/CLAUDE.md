# supabase/ — Local Supabase Stack

This directory contains the Supabase project configuration and all database migrations.

## Local Stack

The local Supabase stack is managed with the Supabase CLI. It runs entirely on localhost — never use the Supabase Dashboard or cloud tooling when working in local dev.

| Service | Local URL |
|---------|-----------|
| API (PostgREST) | http://127.0.0.1:54321 |
| DB (PostgreSQL) | postgresql://postgres:postgres@127.0.0.1:54322/postgres |
| Studio | http://127.0.0.1:54323 |
| Inbucket (email) | http://127.0.0.1:54324 |

```bash
supabase start       # Start the local stack
supabase stop        # Stop the local stack
supabase db reset    # Drop + recreate local DB, re-run all migrations, run seed.sql
supabase db push     # Push local migrations to remote (production)
supabase status      # Show local service URLs and keys
```

## Migration Workflow

Migrations live in `supabase/migrations/` and are named `<timestamp>_<description>.sql`.
They run in timestamp order during `supabase db reset` and `supabase db push`.

**Creating a new migration:**
```bash
supabase migration new <description>
```
This generates an empty file with the correct timestamp prefix. Write the SQL inside it.

**After creating migrations locally:**
1. Test with `supabase db reset` to confirm they apply cleanly from scratch.
2. Run `npx tsc --noEmit` and `npm run build` to check for TypeScript errors.
3. When ready for production: `supabase db push`.

**Never edit past migrations.** If you need to change a column or add a constraint, create a new migration. The migration history is immutable once pushed.

## RLS (Row-Level Security) Policy Philosophy

All tables use RLS. The overarching rules are:

- **SELECT** policies: `user_id = auth.uid()` — users can only read their own data.
- **INSERT** policies: `user_id = auth.uid()` — users can only insert for themselves.
- **UPDATE** policies: exist on mutable tables only (e.g. `session_debriefs`, `student_profiles`, `semesters`, `portfolio_shares`, `speaker_portals`, `speaker_briefs`).
- **DELETE** policies: exist on notes (`professor_student_notes`) and a few other mutable tables. **Do not exist on `sessions`** — sessions are intentionally immutable.
- **Public tables** (token-gated): `session_shares`, `saved_comparisons`, `speaker_portals`, `portfolio_shares` have additional SELECT policies that allow reads matching a token column (no auth required for the token match).

**Admin client bypasses RLS.** `createAdminClient()` (service role key) is used in background AI jobs and cross-user reads where ownership has already been verified at the API route layer. Never use it for user-scoped queries.

## Key SQL Functions

### `execute_analytics_query(query_text TEXT) → JSON`
**File:** `20260324000003_analytics_query_fn.sql`
**Role:** SECURITY DEFINER (runs as the function owner, bypasses RLS)
**Purpose:** Used by the NL→SQL analytics agent (`lib/ai/sqlAgent.ts`) to execute read-only SELECT queries on behalf of the service role.

Security measures:
- Rejects any query not starting with `SELECT` or `WITH` (case-insensitive).
- Rejects queries containing write keywords (`INSERT`, `UPDATE`, `DELETE`, `DROP`, etc.) via regex.
- Results are returned as a JSON array via `json_agg(row_to_json(t))`.

Called from: `POST /api/analytics/query`

### `decrement_free_session(user_id UUID) → VOID`
**File:** `20260401000007_add_subscription_fields.sql`
**Role:** SECURITY DEFINER
**Purpose:** Atomically decrements `profiles.free_sessions_remaining` for a user, but only if it is currently above 0. Prevents race conditions where two concurrent session generations could both decrement below zero.

Called from: `lib/db/subscription.ts` → `decrementFreeSession()` inside `POST /api/process`.

### `handle_new_user() → TRIGGER`
**File:** `20260401000007_add_subscription_fields.sql`
**Role:** SECURITY DEFINER (trigger function on `auth.users`)
**Purpose:** Fires after a new user signs up. Creates a row in `public.profiles` with a 3-day trial window (`trial_ends_at = now() + interval '3 days'`) and `free_sessions_remaining = 0`. Uses `ON CONFLICT DO NOTHING` so it is safe if the profile was created manually.

## Storage Bucket

`temp-uploads` — temporary ZIP upload bucket used during session processing.
- Browser uploads ZIP → `lib/supabase/storage.ts` (`uploadTempZip()`)
- Server downloads ZIP → `lib/supabase/storage.server.ts` (`downloadTempZip()`)
- After processing, the ZIP is deleted: `deleteTempZip()`
- File size limit: 50 MiB (set in `config.toml`)

## Auth Configuration (`config.toml`)

- Email/password auth is enabled (`enable_signup = true`).
- Anonymous sign-ins are disabled.
- Email confirmation is NOT required (`enable_confirmations = false`) — professors can sign in immediately after signup.
- JWT expiry: 1 hour; refresh token rotation is enabled.
- Redirect URLs include both `localhost:3000` and the production domain.

## Migration Inventory (chronological)

| File | Purpose |
|------|---------|
| `20240101000000_initial_schema.sql` | Initial schema setup |
| `20240103000000_create_profiles_table.sql` | `profiles` table + `handle_new_user` trigger |
| `20260324000003_analytics_query_fn.sql` | `execute_analytics_query` SECURITY DEFINER function |
| `20260324000004_class_insights.sql` | `class_insights` table |
| `20260325000000_session_analyses.sql` | `session_analyses` table |
| `20260328000000_student_profiles.sql` | `student_profiles` table |
| `20260329000000_session_shares.sql` | `session_shares` table + RLS |
| `20260330000000_speaker_briefs.sql` | `speaker_briefs` table |
| `20260331000000_session_debriefs.sql` | `session_debriefs` table |
| `20260401000000_create_semesters.sql` | `semesters` table |
| `20260401000001_add_semester_id_to_sessions.sql` | `sessions.semester_id` FK |
| `20260401000002_create_cohort_comparisons.sql` | `cohort_comparisons` table |
| `20260401000004_create_session_tier_data.sql` | `session_tier_data` table |
| `20260401000005_create_semester_reports.sql` | `semester_reports` table |
| `20260401000006_create_saved_comparisons.sql` | `saved_comparisons` table |
| `20260401000007_add_subscription_fields.sql` | Stripe fields on `profiles`, `decrement_free_session`, `handle_new_user` trigger |
| `20260402000000_create_student_debrief_submissions.sql` | `student_debrief_submissions` table |
| `20260402000001_create_student_debrief_analyses.sql` | `student_debrief_analyses` table |
| `20260402000002_create_student_speaker_analysis_submissions.sql` | `student_speaker_analysis_submissions` table |
| `20260402000003_create_student_speaker_analyses.sql` | `student_speaker_analyses` table |
| `20260402000004_create_session_syntheses.sql` | `session_syntheses` table |
| `20260403000000_create_portfolio_shares.sql` | `portfolio_shares` table + token RLS |
| `20260403000001_create_semester_stories.sql` | `semester_stories` table |
| `20260403000002_create_speaker_portals.sql` | `speaker_portals` table + token RLS |
| `20260404000000_add_growth_signal_to_student_profiles.sql` | `student_profiles.growth_signal` column |
| `20260404000001_create_professor_student_notes.sql` | `professor_student_notes` table |
| `20260406000000_create_custom_system_prompts.sql` | `custom_system_prompts` table |
| `20260406000001_add_prompt_version_to_sessions.sql` | `sessions.prompt_version_id` FK |

## Anti-patterns

- **Never edit pushed migrations.** Create a new migration file instead.
- **Never use the Supabase Dashboard to make schema changes** during local dev — they won't be captured in migrations.
- **Never bypass RLS with `createAdminClient()` for user-scoped data** unless ownership has already been verified at the API layer.
- **Never add UPDATE or DELETE policies for `sessions`** — the table is intentionally immutable.
- **Never put secrets in `config.toml`.** Use `env(VAR_NAME)` references for any sensitive values.

## Cross-references

- Supabase clients: `lib/supabase/server.ts`, `lib/supabase/client.ts`, `lib/supabase/storage.ts`
- DB query layer: `lib/db/` (see `lib/db/CLAUDE.md`)
- Subscription logic (uses SQL functions): `lib/db/subscription.ts`
- Analytics SQL agent (uses `execute_analytics_query`): `lib/ai/sqlAgent.ts`
