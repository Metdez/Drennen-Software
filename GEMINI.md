# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## SELF-MAINTENANCE RULE (MANDATORY)

**This file must stay in sync with the codebase at all times.** Whenever you (the AI assistant) make changes to the codebase, you MUST update this file and any relevant nested CLAUDE.md files before considering your work complete. This is not optional.

### What to update and when

| When you... | Update this |
|-------------|-------------|
| Add a new API route | Add it to the **Route structure** section |
| Add a new `lib/db/` file | Add it to **Library layout** and `lib/db/CLAUDE.md` table |
| Add a new `lib/ai/` agent | Add it to **Library layout** and `lib/ai/CLAUDE.md` agent catalog |
| Add a new component | Add it to `components/CLAUDE.md` if it creates a new pattern |
| Add a new type file | Add to **Library layout** and ensure it's in `types/index.ts` barrel |
| Add a new DB table | Add it to the **Database** table |
| Add a new environment variable | Add it to the **Environment Variables** section |
| Add a new export file | Add it to `lib/export/CLAUDE.md` |
| Change a convention or pattern | Update **Key conventions** or **Anti-patterns** |
| Make an architectural decision | Add it to the **Decision log** |
| Add a new page/route | Add it to the **Route structure** section |
| Rename or delete a file listed here | Update all references in this file and nested CLAUDE.md files |

### How to update
- Keep entries concise — one line per item, matching the existing format
- If a section gets stale or wrong, fix it — don't just append
- When in doubt, update. A slightly verbose CLAUDE.md is better than a stale one

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
STRIPE_SECRET_KEY=     # Stripe secret key for server-side API calls
STRIPE_WEBHOOK_SECRET= # Stripe webhook signing secret
STRIPE_PRICE_MONTHLY=  # Stripe Price ID for monthly subscription plan
STRIPE_PRICE_ANNUAL=   # Stripe Price ID for annual subscription plan
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
    roster/[studentName]/      → per-student profile (3 tabs: Profile, Growth, Submissions)
    semesters/                 → semester management (create, archive, assign sessions)
    account/                   → subscription & billing management
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
    subscription/              → current user's subscription access status (GET)
    stripe/checkout/           → create Stripe Checkout session (POST)
    stripe/webhook/            → handle Stripe webhook events (POST)
    stripe/portal/             → create Stripe Billing Portal session (POST)
    stripe/invoices/           → list user's Stripe invoices (GET)
```

### Library layout

- `lib/supabase/server.ts` — `createClient()` (cookie-based) and `createAdminClient()` (service role, bypasses RLS)
- `lib/supabase/client.ts` — browser Supabase client
- `lib/db/users.ts` — `getCurrentUser()`
- `lib/db/sessions.ts` — `insertSession()`, `getSessionById()`, `listSessions()`
- `lib/db/analytics.ts` — `getAnalytics()`: session trend, leaderboard, drop-off
- `lib/db/classInsights.ts` — `getClassInsights()`, `upsertClassInsights()`, `fetchInsightsInput()`
- `lib/db/studentSubmissions.ts` — `getStudentsWithParticipation()`, `getStudentDetail()`
- `lib/db/studentProfiles.ts` — `getStudentProfile()`, `upsertStudentProfile()`, `getGrowthSignalsForUser()`: student AI profiles with growth intelligence
- `lib/db/professorNotes.ts` — `getProfessorNotes()`, `addProfessorNote()`, `deleteProfessorNote()`, `toggleFollowupFlag()`, `getStudentsWithFollowupFlags()`
- `lib/db/debriefs.ts` — `getDebrief()`, `upsertDebrief()`, `completeDebrief()`, `getDebriefStatusesBySessionIds()`, `getStudentNamesForSession()`
- `lib/db/semesters.ts` — `getSemestersByUser()`, `getActiveSemester()`, `getSemesterById()`, `insertSemester()`, `updateSemester()`, `archiveAndCreateSemester()`, `assignSessionsToSemester()`, `getUnassignedSessions()`
- `lib/db/semesterComparison.ts` — `getSemesterComparisonData()`: cross-semester cohort comparison (session counts, student counts, theme persistence)
- `lib/db/themes.ts` — `getThemeFrequency()`, `getRecentThemeTitles()`
- `lib/parse/` — `unzip.ts`, `pdf.ts`, `docx.ts`, `builder.ts` (orchestrates them all)
- `lib/parse/parseQuestions.ts` — `parseSections()`, `parseQuestionsFromOutput()`: shared question parser used by OutputPreview and DebriefPanel
- `lib/ai/client.ts` — lazy OpenAI SDK client pointed at XAI_BASE_URL (used for session generation)
- `lib/ai/prompt.ts` — system prompt template with `{{SPEAKER_NAME}}` placeholder
- `lib/ai/analysisAgent.ts` — `runSessionAnalysis()` and `runThemeAnalysis()`: Gemini-powered per-session deep analysis; called client-side from `/preview` on demand; results cached in sessionStorage as `analysis_${sessionId}`
- `lib/ai/studentProfile.ts` — `generateStudentProfile()`, `generateStudentProfiles()`: Gemini-powered student profiles with growth intelligence; uses all 3 submission types (questions, reflections, speaker analyses); fire-and-forget after session upload
- `lib/ai/classInsights.ts` — `generateClassInsights(userId)`: Gemini-powered class analysis, called fire-and-forget from `/api/process` after each session save and after debrief completion; results stored in `class_insights` table
- `lib/ai/debriefSummary.ts` — `generateDebriefSummary()`: Gemini-powered debrief summary, called when professor marks debrief complete
- `lib/ai/sqlAgent.ts` — Gemini-powered NL→SQL→answer agent for analytics queries; calls the `execute_analytics_query` Supabase RPC
- `lib/export/` — `pdf.ts` and `docx.ts` for download generation
- `lib/utils/transforms.ts` — `rowToSession` / `rowToSessionSummary` (snake_case DB rows → camelCase types)
- `lib/stripe/index.ts` — Stripe SDK singleton using `STRIPE_SECRET_KEY`
- `lib/db/subscription.ts` — `checkSubscriptionAccess()`, `decrementFreeSession()`, `getSubscriptionProfile()`, `updateStripeCustomerId()`, `updateSubscriptionFromWebhook()`
- `lib/constants.ts` — `ROUTES`, `BRAND` colors, `APP_NAME`, `AI_CONFIG`, accepted file types

### Database

Three core tables with RLS. Sessions are **immutable** — no UPDATE or DELETE policies exist by design. New users can self-signup with a 3-day free trial. Signups must be enabled in the Supabase Dashboard (Authentication > Providers > Email).

| Table | Purpose |
|---|---|
| `sessions` | One row per processed ZIP — speaker name, AI output, file count, optional `semester_id` FK to `semesters` (NULL = unassigned) |
| `student_submissions` | One row per student per session — raw submission text, student name, filename |
| `session_themes` | One row per theme per session — theme number (1–10) and title extracted from AI output |
| `class_insights` | One row per professor — Gemini-generated class analysis JSON, upserted after each session |
| `session_debriefs` | One row per session — post-session debrief: rating, question feedback, observations, AI summary |
| `student_profiles` | One row per professor+student pair — Gemini-generated AI profile (JSONB) with growth intelligence, denormalized `growth_signal` for roster display |
| `professor_student_notes` | Professor-authored notes per student — survive AI profile regeneration, support follow-up flagging |
| `semesters` | One row per semester per professor — name, start/end dates, status (`active`/`archived`) |
| `cohort_comparisons` | Cross-semester comparison data — session counts, student counts, avg submissions, theme persistence |

The `profiles` table also stores Stripe subscription fields: `stripe_customer_id`, `subscription_status`, `stripe_subscription_id`, `subscription_price_id`, `subscription_current_period_end`, `trial_ends_at`, `free_sessions_remaining`. The `decrement_free_session` SQL function atomically decrements free sessions.

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
- Subscription is managed via Stripe. Session generation (`/api/process`) is gated by `checkSubscriptionAccess()`. Existing users get 1 free session; new users get a 3-day trial. The `SubscriptionContext` provides client-side access to subscription state. Stripe webhooks are the source of truth for subscription status changes.
- Semesters are optional groupings for sessions. Each professor can have one `active` semester at a time; others are `archived`. New sessions created via `/api/process` are automatically assigned to the active semester if one exists. Sessions with `semester_id = NULL` are unassigned and can be bulk-assigned from `/semesters`.

### Anti-patterns (do NOT do these)

- **Never create a new `GoogleGenAI` instance directly.** Import `getGeminiClient()` from `lib/ai/geminiClient.ts`. The lazy singleton pattern avoids build-time crashes and keeps configuration in one place.
- **Never hardcode hex color values.** Use `BRAND.ORANGE`, `BRAND.PURPLE`, `BRAND.GREEN` from `lib/constants`.
- **Never add UPDATE or DELETE queries for the `sessions` table.** Sessions are immutable by design.
- **Never use `createAdminClient()` for user-scoped reads.** Use `createClient()` (cookie-based, RLS-enforced) unless you specifically need to bypass RLS for background jobs or cross-user queries.
- **Never skip the type barrel.** All new types in `types/` must be re-exported from `types/index.ts`.

### Decision log

| Decision | Rationale |
|----------|-----------|
| Two AI providers (xAI + Gemini) | xAI Grok excels at long-form synthesis (the 10-section interview sheet). Gemini is faster and cheaper for analysis, profiles, and summaries. Keeping them separate avoids vendor lock-in. |
| Sessions are immutable | The AI output is a point-in-time artifact. Professors reference and share it. Mutations would break shared links and debrief references. |
| Fire-and-forget AI jobs | Class insights, student profiles, and tier classification run async after session upload. The user doesn't wait for them; they appear on subsequent page loads. |
| Stripe webhooks as source of truth | Client-side subscription state is a cache. Webhook events (`customer.subscription.*`, `invoice.*`) drive all real status changes in the `profiles` table. |
| `sessionStorage` caching on `/preview` | Avoids redundant API calls when switching tabs. Data is already in memory from the initial load. |

### New feature checklist

When adding a new feature, follow this order. **Step 8 is mandatory — your work is not done until CLAUDE.md is updated.**

1. **Types** — Define types in `types/yourFeature.ts`, add to `types/index.ts` barrel
2. **Migration** — Create Supabase migration in `supabase/migrations/` if new tables needed
3. **DB layer** — Create `lib/db/yourFeature.ts` with query functions
4. **AI agent** (if needed) — Create `lib/ai/yourAgent.ts`, import Gemini client from `geminiClient.ts`
5. **API route** — Create `app/api/yourFeature/route.ts`, add route to `lib/constants/routes.ts` ROUTES object
6. **Component** — Create in the appropriate `components/feature/` subdirectory
7. **Page** — Wire up in `app/(app)/yourFeature/page.tsx`
8. **CLAUDE.md** — **REQUIRED:** Update this root file (route structure, library layout, database tables as applicable) AND the relevant nested CLAUDE.md files. See the self-maintenance table at the top of this file.

### Local CLAUDE.md files

Key directories have their own CLAUDE.md with local conventions:
- `lib/ai/CLAUDE.md` — dual-AI system, agent catalog, client usage
- `lib/db/CLAUDE.md` — naming conventions, client choice, table mapping
- `components/CLAUDE.md` — directory structure, brand colors, component patterns
- `lib/export/CLAUDE.md` — PDF/DOCX export patterns
- `types/CLAUDE.md` — barrel export rules, Row vs Domain types
