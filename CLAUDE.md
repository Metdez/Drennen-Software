# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Next.js dev server on localhost:3000
npm run build        # Production build
npm run lint         # ESLint via next lint
npm run type-check   # tsc --noEmit (no test runner; this is the check)
```

For local Supabase (requires Supabase CLI):
```bash
supabase start       # Start local Supabase stack (DB on :54322, Studio on :54323)
supabase db reset    # Reset local DB and re-run migrations
supabase db push     # Push migrations to remote
```

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
XAI_API_KEY=
XAI_BASE_URL=          # defaults to https://api.x.ai/v1
XAI_MODEL=             # defaults to grok-4-1-fast-reasoning
GOOGLE_API_KEY=        # (or GEMINI_API_KEY) — used by the analytics SQL agent
GEMINI_API_KEY=        # used by lib/ai/analysisAgent.ts for Analysis and Insights panel (theme clusters, tensions, suggestions, blind spots, sentiment)
GEMINI_MODEL=          # defaults to gemini-3.1-flash-lite-preview
DATABASE_URL=          # Postgres connection string — used by the analytics SQL agent
```

## Architecture

This is a **Next.js 14 App Router** app for a university professor tool. Professors upload a Canvas ZIP of student question submissions for an upcoming guest speaker; the AI synthesizes them into a moderator-ready interview sheet.

### Core flow

1. Professor uploads `speakerName` + `.zip` to `POST /api/process`
2. `lib/parse/`: ZIP is extracted → each `.pdf`/`.docx` file parsed to text → assembled into a single structured string (student name derived from filename format `FirstName_LastName...`)
3. `lib/ai/`: xAI (Grok) is called via the OpenAI SDK interface with `baseURL` overridden. The system prompt in `lib/ai/prompt.ts` has a strict 10-section output format with tier rankings for question quality.
4. The generated output + metadata is saved to Supabase `sessions` table; individual student submissions are saved to `student_submissions`; parsed themes are saved to `session_themes`
5. The API returns `sessionId` + `output`; the client stashes `output` in `sessionStorage` keyed by `session_${sessionId}` to avoid a round-trip on the preview page
6. `/preview` renders the markdown output; professors can download as PDF (`lib/export/pdf.ts` via `@react-pdf/renderer`) or DOCX (`lib/export/docx.ts` via `docx`)

### Route structure

```
app/
  page.tsx                     → redirects to /dashboard or /login
  layout.tsx                   → root layout
  (auth)/login/                → email/password sign-in (Supabase Auth)
  (app)/                       → protected layout with NavHeader
    dashboard/                 → upload form
    preview/                   → output display + download
    history/                   → past sessions list
    analytics/                 → submission trend charts, leaderboard, drop-off analysis
    preview/theme/             → theme deep-dive (sessionId + theme name in query params)
    roster/                    → all students list with participation rates
    roster/[studentName]/      → per-student submission history
    semesters/                 → semester management (create, archive, assign sessions)
  api/
    auth/callback/             → Supabase PKCE callback
    process/                   → main ZIP → AI pipeline (POST)
    sessions/                  → list sessions (GET)
    sessions/[id]/             → fetch single session (GET)
    sessions/[id]/download/    → export as PDF or DOCX (?format=pdf|docx)
    analytics/                 → aggregated analytics data (GET)
    analytics/themes/          → theme frequency across sessions (GET)
    analytics/insights/        → saved Gemini class analysis (GET)
    analytics/query/           → natural-language → SQL → answer via Gemini (POST)
    sessions/[id]/debrief/     → get/save debrief (GET, POST)
    sessions/[id]/debrief/complete → mark complete + AI summary (POST)
    semesters/                 → list/create semesters (GET, POST)
    semesters/[id]/            → update semester (PATCH)
    semesters/assign/          → assign sessions to a semester (POST)
    semesters/compare/         → cohort comparison across semesters (GET)
```

### Library layout

- `lib/supabase/server.ts` — `createClient()` (cookie-based) and `createAdminClient()` (service role, bypasses RLS)
- `lib/supabase/client.ts` — browser Supabase client
- `lib/db/users.ts` — `getCurrentUser()`
- `lib/db/sessions.ts` — `insertSession()`, `getSessionById()`, `listSessions()`
- `lib/db/analytics.ts` — `getAnalytics()`: session trend, leaderboard, drop-off
- `lib/db/classInsights.ts` — `getClassInsights()`, `upsertClassInsights()`, `fetchInsightsInput()`
- `lib/db/student_submissions.ts` — `getStudentsWithParticipation()`, `getStudentDetail()`
- `lib/db/debriefs.ts` — `getDebrief()`, `upsertDebrief()`, `completeDebrief()`, `getDebriefStatusesBySessionIds()`, `getStudentNamesForSession()`
- `lib/db/semesters.ts` — `getSemestersByUser()`, `getActiveSemester()`, `getSemesterById()`, `insertSemester()`, `updateSemester()`, `archiveAndCreateSemester()`, `assignSessionsToSemester()`, `getUnassignedSessions()`
- `lib/db/comparison.ts` — `getSemesterComparisonData()`: cross-semester cohort comparison (session counts, student counts, theme persistence)
- `lib/db/themes.ts` — `getThemeFrequency()`, `getRecentThemeTitles()`
- `lib/parse/` — `unzip.ts`, `pdf.ts`, `docx.ts`, `builder.ts` (orchestrates them all)
- `lib/parse/parseQuestions.ts` — `parseSections()`, `parseQuestionsFromOutput()`: shared question parser used by OutputPreview and DebriefPanel
- `lib/ai/client.ts` — lazy OpenAI SDK client pointed at XAI_BASE_URL (used for session generation)
- `lib/ai/prompt.ts` — system prompt template with `{{SPEAKER_NAME}}` placeholder
- `lib/ai/analysisAgent.ts` — `runSessionAnalysis()` and `runThemeAnalysis()`: Gemini-powered per-session deep analysis; called client-side from `/preview` on demand; results cached in sessionStorage as `analysis_${sessionId}`
- `lib/ai/classInsights.ts` — `generateClassInsights(userId)`: Gemini-powered class analysis, called fire-and-forget from `/api/process` after each session save and after debrief completion; results stored in `class_insights` table
- `lib/ai/debriefSummary.ts` — `generateDebriefSummary()`: Gemini-powered debrief summary, called when professor marks debrief complete
- `lib/ai/sqlAgent.ts` — Gemini-powered NL→SQL→answer agent for analytics queries; calls the `execute_analytics_query` Supabase RPC
- `lib/export/` — `pdf.ts` and `docx.ts` for download generation
- `lib/utils/transforms.ts` — `rowToSession` / `rowToSessionSummary` (snake_case DB rows → camelCase types)
- `lib/constants.ts` — `ROUTES`, `BRAND` colors, `APP_NAME`, `AI_CONFIG`, accepted file types

### Database

Three core tables with RLS. Sessions are **immutable** — no UPDATE or DELETE policies exist by design. New professor accounts are created via the Supabase dashboard only; self-signup is disabled.

| Table | Purpose |
|---|---|
| `sessions` | One row per processed ZIP — speaker name, AI output, file count, optional `semester_id` FK to `semesters` (NULL = unassigned) |
| `student_submissions` | One row per student per session — raw submission text, student name, filename |
| `session_themes` | One row per theme per session — theme number (1–10) and title extracted from AI output |
| `class_insights` | One row per professor — Gemini-generated class analysis JSON, upserted after each session |
| `session_debriefs` | One row per session — post-session debrief: rating, question feedback, observations, AI summary |
| `semesters` | One row per semester per professor — name, start/end dates, status (`active`/`archived`) |
| `cohort_comparisons` | Cross-semester comparison data — session counts, student counts, avg submissions, theme persistence |

The `execute_analytics_query` SQL function (SECURITY DEFINER) is used by the SQL agent to run read-only SELECT queries bypassing RLS. It validates queries server-side before executing them.

### Dual AI systems

- **xAI Grok** (via OpenAI SDK + `baseURL` override): session generation — turns student submissions into the 10-section interview sheet
- **Google Gemini** (via `@google/genai`): three distinct uses —
  - `analysisAgent.ts`: per-session analysis (theme clusters, tensions, suggestions, blind spots, sentiment) fetched client-side from `/preview`; also powers theme deep-dive via `runThemeAnalysis()`
  - `classInsights.ts`: cross-session class analysis, fire-and-forget after each session save and debrief completion
  - `debriefSummary.ts`: post-session debrief summary, generated when professor marks debrief complete
  - `sqlAgent.ts`: NL→SQL→answer agent for analytics page queries

### Key conventions

- Path alias `@/` maps to the repo root (`tsconfig.json`)
- All API routes set `export const dynamic = 'force-dynamic'`
- The `(app)` layout also sets `force-dynamic` so auth checks run per-request
- Brand colors live in `lib/constants.ts` (`BRAND.ORANGE`, `BRAND.PURPLE`, `BRAND.GREEN`) — use these instead of hardcoded hex values
- Student name is parsed from filename: `FirstName_LastName...` → displayed as `"FirstName L."`
- PDF/DOCX parse failures return empty string — processing continues for other files in the ZIP
- `sessionStorage` cache keys on `/preview`: `session_${sessionId}` (AI output), `overlap_${sessionId}` (overlapping themes JSON array), `analysis_${sessionId}` (per-session Gemini analysis JSON)
- `/preview` has four tabs: `questions` (markdown output), `analysis` (AnalysisPanelLeft — theme clusters + tensions), `insights` (AnalysisPanelRight — suggestions, blind spots, sentiment), `debrief` (DebriefPanel — post-session capture with auto-save)
- Semesters are optional groupings for sessions. Each professor can have one `active` semester at a time; others are `archived`. New sessions created via `/api/process` are automatically assigned to the active semester if one exists. Sessions with `semester_id = NULL` are unassigned and can be bulk-assigned from `/semesters`.
