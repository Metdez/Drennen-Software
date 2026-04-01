# lib/db/ — Database Access Layer

All Supabase queries live here. One file per domain entity.

## Conventions

- **Naming:** camelCase filenames (e.g., `studentProfiles.ts`, `classInsights.ts`)
- **Client choice:**
  - `createClient()` — cookie-based, respects RLS. Use for user-scoped reads.
  - `createAdminClient()` — service role, bypasses RLS. Use for writes, cross-user queries, and background jobs.
- **Error handling:** `if (error) throw new Error(...)` — consistent across all files
- **Transforms:** DB rows are snake_case; domain types are camelCase. Use transform functions in the same file or `lib/utils/transforms.ts`.

## Immutability Rule

The `sessions` table has **no UPDATE or DELETE policies** by design. Sessions are append-only. Never add mutation queries for sessions.

## File → Table Mapping

| File | Table(s) | Key Functions |
|------|----------|---------------|
| `users.ts` | `profiles` (via auth) | `getCurrentUser()` |
| `sessions.ts` | `sessions` | `insertSession()`, `getSessionById()`, `listSessions()` |
| `systemPrompts.ts` | `custom_system_prompts` | `getActivePrompt()`, `getPromptVersions()`, `createPromptVersion()`, `activatePromptVersion()`, `resetToDefault()` |
| `studentSubmissions.ts` | `student_submissions` | `getStudentsWithParticipation()`, `getStudentDetail()` |
| `studentProfiles.ts` | `student_profiles` | `getStudentProfile()`, `upsertStudentProfile()`, `getGrowthSignalsForUser()` |
| `professorNotes.ts` | `professor_student_notes` | `getProfessorNotes()`, `addProfessorNote()`, `deleteProfessorNote()` |
| `analytics.ts` | `sessions`, `student_submissions` | `getAnalytics()` |
| `classInsights.ts` | `class_insights` | `getClassInsights()`, `upsertClassInsights()` |
| `themes.ts` | `session_themes` | `getThemeFrequency()`, `getRecentThemeTitles()` |
| `debriefs.ts` | `session_debriefs` | `getDebrief()`, `upsertDebrief()`, `completeDebrief()` |
| `semesters.ts` | `semesters` | `getSemestersByUser()`, `getActiveSemester()`, `insertSemester()` |
| `semesterComparison.ts` | `cohort_comparisons` | `getSemesterComparisonData()` |
| `savedComparisons.ts` | `session_comparisons` | saved session-pair comparisons |
| `subscription.ts` | `profiles` | `checkSubscriptionAccess()`, `updateSubscriptionFromWebhook()` |
| `reports.ts` | `semester_reports` | report CRUD |
| `stories.ts` | `semester_stories` | story CRUD |
| `speakerBriefs.ts` | `speaker_briefs` | speaker brief CRUD |
| `speakerPortals.ts` | `speaker_portals` | speaker portal CRUD |
| `sessionAnalyses.ts` | `session_analyses` | cached analyses |
| `sessionShares.ts` | `session_shares` | share token management |
| `sessionSyntheses.ts` | `session_syntheses` | theme synthesis data |
| `studentSpeakerAnalyses.ts` | `student_speaker_analyses` | speaker analysis submissions |
| `studentDebriefs.ts` | `student_debrief_submissions` | student debrief submissions |
| `tierData.ts` | `tier_data` | tier classification data |
| `portfolioShares.ts` | `portfolio_shares` | portfolio share tokens |

## Adding a New DB File

1. Create `lib/db/yourEntity.ts` (camelCase)
2. Import `createClient` and/or `createAdminClient` from `@/lib/supabase/server`
3. Define typed functions following the existing pattern
4. Add to the table above
