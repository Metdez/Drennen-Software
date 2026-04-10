# lib/db/ — Database Access Layer

All Supabase queries live here. One file per domain entity.

## Purpose

This directory is the **only** place in the codebase that calls `supabase.from(...)` directly. API routes and AI agents must delegate all DB access to a `lib/db/` function. This keeps query logic reusable, auditable for RLS correctness, and easy to evolve independently of the HTTP layer.

## Conventions

- **Naming:** camelCase filenames (e.g., `studentProfiles.ts`, `classInsights.ts`)
- **Client choice:**
  - `createClient()` — cookie-based, respects RLS. Use for user-scoped reads.
  - `createAdminClient()` — service role, bypasses RLS. Use for writes, cross-user queries, and background jobs.
- **Error handling:** `if (error) throw new Error(...)` — consistent across all files
- **Transforms:** DB rows are snake_case; domain types are camelCase. Use transform functions in the same file or `lib/utils/transforms.ts`. Never return raw Supabase row types to callers.

## Client Choice Rules

| Situation | Client | Reason |
|-----------|--------|--------|
| User-facing API route with request cookie | `createClient()` | RLS filters rows to the authenticated professor automatically |
| Background / fire-and-forget AI job | `createAdminClient()` | No cookie context is available at job execution time |
| Server-side write during upload pipeline | `createAdminClient()` | The browser cookie may not be present in the server pipeline context |
| Public token-based route (portfolio, shared session) | `createAdminClient()` | Intentionally serves data beyond the token holder's own rows |

**Never use `createAdminClient()` for a user-scoped read without justification.** It removes the automatic row-ownership filter and is a potential data-exposure escalation.

## Immutability Rule

The `sessions` table has **no UPDATE or DELETE policies** by design. Sessions are a point-in-time artifact that professors and speakers link to. Mutations would silently break shared links, debrief references, and speaker portals. **Never add UPDATE or DELETE queries for the `sessions` table.**

## File → Table Mapping

| File | Functions exported | Table(s) touched | RLS client | Called by |
|------|-------------------|-----------------|------------|-----------|
| `users.ts` | `getCurrentUser()` | `auth.users` (via Supabase Auth SDK) | `createClient()` — RLS enforced | Every protected API route as the first auth check |
| `sessions.ts` | `insertSession()`, `getSessionsByUser()`, `getSessionById()`, `insertStudentSubmissions()`, `insertSessionThemes()` | `sessions`, `student_submissions`, `session_themes` | Reads: `createClient()` RLS; Writes: `createAdminClient()` bypass | `app/api/process`, `app/api/sessions/[id]` and all sub-routes |
| `systemPrompts.ts` | `getActivePrompt()`, `getPromptVersions()`, `getPromptById()`, `createPromptVersion()`, `activatePromptVersion()`, `resetToDefault()` | `custom_system_prompts` | Reads: `createClient()` RLS; Writes/RPCs: `createAdminClient()` bypass | `app/api/process`, `app/api/sessions/[id]/rerun`, `app/api/system-prompts/**` |
| `analytics.ts` | `getAnalytics()` | `sessions`, `student_submissions` | `createClient()` — RLS enforced | `app/api/analytics/route.ts` |
| `classInsights.ts` | `getClassInsights()`, `upsertClassInsights()`, `fetchInsightsInput()` | `class_insights`, `sessions`, `session_themes`, `student_submissions`, `session_debriefs`, `student_debrief_analyses` | `createAdminClient()` — bypass (background jobs) | `lib/ai/classInsights.ts` (fire-and-forget), `app/api/analytics/insights/route.ts` |
| `studentSubmissions.ts` | `getSubmissionsBySession()`, `getStudentNamesBySession()`, `getStudentsWithParticipation()`, `getStudentDetail()` | `student_submissions`, `sessions`, `student_debrief_submissions`, `student_speaker_analysis_submissions` | `getStudentNamesBySession`: `createAdminClient()` bypass; all others: `createClient()` RLS | `app/api/roster/**`, `lib/ai/studentProfile.ts`, `lib/db/debriefs.ts` |
| `studentProfiles.ts` | `getStudentProfile()`, `upsertStudentProfile()`, `getGrowthSignalsForUser()` | `student_profiles` | `createAdminClient()` — bypass (background jobs) | `app/api/roster/[studentName]/profile/route.ts`, `lib/ai/studentProfile.ts` |
| `professorNotes.ts` | `getProfessorNotes()`, `addProfessorNote()`, `deleteProfessorNote()`, `toggleFollowupFlag()`, `getStudentsWithFollowupFlags()` | `professor_student_notes` | `createAdminClient()` — bypass (ownership enforced via explicit `user_id` filter) | `app/api/roster/[studentName]/notes/route.ts` |
| `themes.ts` | `getThemeFrequency()`, `getRecentThemeTitles()` | `session_themes` | `createClient()` — RLS enforced | `app/api/analytics/themes/route.ts` |
| `debriefs.ts` | `getDebrief()`, `upsertDebrief()`, `completeDebrief()`, `getDebriefStatusesBySessionIds()`, `getStudentNamesForSession()` | `session_debriefs` | `createClient()` — RLS enforced | `app/api/sessions/[id]/debrief/**` |
| `semesters.ts` | `getSemestersByUser()`, `getActiveSemester()`, `getSemesterById()`, `insertSemester()`, `updateSemester()`, `archiveAndCreateSemester()`, `assignSessionsToSemester()`, `getUnassignedSessions()` | `semesters`, `sessions` | `createClient()` — RLS enforced | `app/api/semesters/**` |
| `semesterComparison.ts` | `getSemesterComparisonData()` | `cohort_comparisons` | `createAdminClient()` — bypass | `app/api/semesters/compare/route.ts` |
| `savedComparisons.ts` | saved session-pair comparison CRUD | `saved_comparisons` | `createAdminClient()` — bypass | `app/api/compare/**` |
| `subscription.ts` | `checkSubscriptionAccess()`, `decrementFreeSession()`, `getSubscriptionProfile()`, `updateStripeCustomerId()`, `updateSubscriptionFromWebhook()` | `profiles` | `createAdminClient()` — bypass (webhook & Stripe flows) | `app/api/process`, `app/api/stripe/**`, `app/api/subscription/route.ts` |
| `reports.ts` | report CRUD | `semester_reports` | `createAdminClient()` — bypass | `app/api/reports/**` |
| `stories.ts` | story CRUD | `semester_stories` | `createAdminClient()` — bypass | `app/api/stories/**` |
| `speakerBriefs.ts` | speaker brief CRUD | `speaker_briefs` | `createAdminClient()` — bypass | `app/api/sessions/[id]/brief/**` |
| `speakerPortals.ts` | speaker portal CRUD | `speaker_portals` | `createAdminClient()` — bypass | `app/api/sessions/[id]/portal/**`, `app/api/speaker/**` |
| `sessionAnalyses.ts` | cached per-session analysis CRUD | `session_analyses` | `createAdminClient()` — bypass | `app/api/sessions/[id]/analysis/route.ts` |
| `sessionShares.ts` | `createShareToken()`, `getShareByToken()` | `session_shares` | `createAdminClient()` — bypass | `app/api/sessions/[id]/share/route.ts`, `app/api/shared/**` |
| `sessionSyntheses.ts` | synthesis CRUD | `session_syntheses` | `createAdminClient()` — bypass | `app/api/sessions/[id]/synthesis/route.ts` |
| `studentSpeakerAnalyses.ts` | speaker analysis submission CRUD | `student_speaker_analyses`, `student_speaker_analysis_submissions` | `createAdminClient()` — bypass | `app/api/sessions/[id]/speaker-analyses/route.ts` |
| `studentDebriefs.ts` | student debrief submission CRUD | `student_debrief_submissions` | `createAdminClient()` — bypass | `app/api/sessions/[id]/student-debriefs/route.ts` |
| `tierData.ts` | tier classification CRUD | `session_tier_data` | `createAdminClient()` — bypass | `app/api/sessions/[id]/synthesis/route.ts` |
| `portfolioShares.ts` | portfolio share token CRUD | `portfolio_shares` | `createAdminClient()` — bypass | `app/api/portfolio/**` |

## Anti-patterns

- **Do not call `supabase.from(...)` outside `lib/db/`.**  
  API routes and AI agents must import a named function from `lib/db/` instead.

- **Do not use `createAdminClient()` in user-facing reads without a documented reason.**  
  It removes RLS — the professor can see rows that don't belong to them.

- **Do not add UPDATE or DELETE queries for the `sessions` table.**  
  Sessions are immutable by design. See the Immutability Rule above.

- **Do not use `.upsert()` with partial unique indexes.**  
  Supabase JS cannot resolve partial unique indexes (e.g. `WHERE semester_id IS NULL`). Use the check-then-insert/update pattern from `classInsights.ts` instead.

- **Do not skip the empty-array guard before `.in()` queries.**  
  Always short-circuit with `if (ids.length === 0) return []` before `.in('col', ids)`. An empty array passed to `.in()` can behave unexpectedly across client versions.

- **Do not return raw `snake_case` row objects to callers.**  
  Transform to camelCase domain types inside the `lib/db/` function before returning.

## Adding a New DB File

1. Create `lib/db/yourEntity.ts` (camelCase)
2. Import `createClient` and/or `createAdminClient` from `@/lib/supabase/server`
3. Add a `@file` JSDoc block at the top documenting: tables touched, client choice, and which files call it
4. Define typed query functions; throw on error, return `null` for "not found"
5. Add JSDoc to each exported function (`@param`, `@returns`, `@remarks` with table + client, `@see` for callers)
6. Add the file to the catalog table above
7. Add the file to the **Library layout → lib/db/** section in the root `CLAUDE.md`
