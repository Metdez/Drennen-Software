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
NEXT_PUBLIC_SITE_URL=  # Production base URL (e.g. https://yourdomain.com) — REQUIRED in prod; used as redirect base for Stripe checkout and billing portal. Falls back to localhost:3000 if missing.
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
    preview/                   → output display + download (4 tabs: questions, analysis, insights, debrief)
    preview/brief/             → speaker brief preview + download
    preview/portal/            → speaker portal preview + publish
    preview/theme/             → theme deep-dive (sessionId + theme name in query params)
    history/                   → past sessions list
    analytics/                 → submission trend charts, leaderboard, drop-off analysis
    analytics/compare/         → semester-level cohort comparison
    analytics/theme/           → cross-session theme analysis
    compare/                   → side-by-side session comparison
    reports/[id]/              → semester report viewer
    stories/[id]/              → semester narrative story viewer
    roster/                    → all students list with participation rates
    roster/[studentName]/      → per-student profile (3 tabs: Profile, Growth, Submissions)
    semesters/                 → semester management (create, archive, assign sessions)
    account/                   → subscription & billing management
  (public)/                    → public layout (no auth required)
    portfolio/[token]/         → public portfolio landing page
    portfolio/[token]/analytics/ → public portfolio analytics
    portfolio/[token]/reports/ → public portfolio reports list
    portfolio/[token]/reports/[reportId]/ → public portfolio report detail
    portfolio/[token]/roster/  → public portfolio roster
    portfolio/[token]/roster/[studentName]/ → public portfolio student detail
    portfolio/[token]/sessions/ → public portfolio sessions list
    portfolio/[token]/sessions/[sessionId]/ → public portfolio session detail
    shared/[token]/            → public shared session view
    shared/compare/[token]/    → public shared comparison view
    speaker/[token]/           → public speaker portal view
  api/
    auth/callback/             → Supabase PKCE callback
    admin/clear/               → admin data clear (POST)
    process/                   → main ZIP → AI pipeline (POST)
    system-prompts/            → list/create custom system prompt versions (GET, POST)
    system-prompts/[id]/activate/ → activate a saved prompt version (PATCH)
    system-prompts/reset/      → revert to the built-in default prompt (POST)
    sessions/                  → list sessions (GET)
    sessions/[id]/             → fetch single session (GET)
    sessions/[id]/analysis/    → per-session Gemini analysis (GET, POST)
    sessions/[id]/brief/       → speaker brief data (GET, POST)
    sessions/[id]/brief/download/ → export brief as PDF or text (GET)
    sessions/[id]/debrief/     → get/save debrief (GET, POST)
    sessions/[id]/debrief/complete → mark complete + AI summary (POST)
    sessions/[id]/download/    → export as PDF or DOCX (?format=pdf|docx)
    sessions/[id]/portal/      → speaker portal data (GET, POST)
    sessions/[id]/portal/publish/ → publish speaker portal (POST)
    sessions/[id]/rerun/       → re-run a session with the current active prompt (POST)
    sessions/[id]/share/       → create/get share token (GET, POST)
    sessions/[id]/speaker-analyses/ → student speaker analysis submissions (GET, POST)
    sessions/[id]/student-debriefs/ → student debrief submissions (GET, POST)
    sessions/[id]/synthesis/   → session synthesis (GET, POST)
    sessions/[id]/theme-analysis/ → per-theme deep analysis (GET, POST)
    analytics/                 → aggregated analytics data (GET)
    analytics/insights/        → saved Gemini class analysis (GET)
    analytics/query/           → natural-language → SQL → answer via Gemini (POST)
    analytics/recommendations/ → AI-generated speaker recommendations (GET)
    analytics/themes/          → theme frequency across sessions (GET)
    compare/                   → session comparison data (GET)
    compare/analysis/          → AI comparative analysis (POST)
    compare/share/             → create/get comparison share token (POST)
    reports/generate/          → generate semester report (POST)
    reports/[id]/              → fetch report (GET)
    reports/[id]/download/     → export report as PDF or DOCX (GET)
    roster/                    → list all students with participation (GET)
    roster/[studentName]/      → student detail (GET)
    roster/[studentName]/notes/ → professor notes for student (GET, POST, DELETE)
    roster/[studentName]/profile/ → student AI profile (GET, POST)
    stories/generate/          → generate semester narrative story (POST)
    stories/[id]/              → fetch story (GET)
    stories/[id]/download/     → export story as PDF or DOCX (GET)
    semesters/                 → list/create semesters (GET, POST)
    semesters/[id]/            → update semester (PATCH)
    semesters/assign/          → assign sessions to a semester (POST)
    semesters/compare/         → cohort comparison across semesters (GET)
    portfolio/                 → create/list portfolio shares (GET, POST)
    portfolio/[token]/         → public portfolio config (GET)
    portfolio/[token]/analytics/ → public portfolio analytics (GET)
    portfolio/[token]/reports/ → public portfolio reports (GET)
    portfolio/[token]/reports/[reportId]/ → public portfolio report detail (GET)
    portfolio/[token]/roster/  → public portfolio roster (GET)
    portfolio/[token]/roster/[studentName]/ → public portfolio student (GET)
    portfolio/[token]/sessions/ → public portfolio sessions (GET)
    portfolio/[token]/sessions/[sessionId]/ → public portfolio session (GET)
    shared/[token]/            → fetch shared session (GET)
    shared/[token]/analysis/   → shared session analysis (GET)
    shared/[token]/download/   → shared session download (GET)
    shared/compare/[token]/    → fetch shared comparison (GET)
    speaker/[token]/           → fetch speaker portal (GET)
    subscription/              → current user's subscription access status (GET)
    stripe/checkout/           → create Stripe Checkout session (POST)
    stripe/webhook/            → handle Stripe webhook events (POST)
    stripe/portal/             → create Stripe Billing Portal session (POST)
    stripe/invoices/           → list user's Stripe invoices (GET)
```

### Library layout

**Supabase clients**
- `lib/supabase/server.ts` — `createClient()` (cookie-based) and `createAdminClient()` (service role, bypasses RLS)
- `lib/supabase/client.ts` — browser Supabase client
- `lib/supabase/storage.ts` — `uploadTempZip()`: browser-side ZIP uploads to `temp-uploads` bucket
- `lib/supabase/storage.server.ts` — `downloadTempZip()`, `deleteTempZip()`: server-side storage operations

**Database layer (`lib/db/`)**
- `lib/db/users.ts` — `getCurrentUser()`
- `lib/db/sessions.ts` — `insertSession()`, `getSessionById()`, `listSessions()`
- `lib/db/systemPrompts.ts` — `getActivePrompt()`, `getPromptVersions()`, `createPromptVersion()`, `activatePromptVersion()`, `resetToDefault()`
- `lib/db/analytics.ts` — `getAnalytics()`: session trend, leaderboard, drop-off
- `lib/db/classInsights.ts` — `getClassInsights()`, `upsertClassInsights()`, `fetchInsightsInput()`
- `lib/db/studentSubmissions.ts` — `getStudentsWithParticipation()`, `getStudentDetail()`
- `lib/db/studentProfiles.ts` — `getStudentProfile()`, `upsertStudentProfile()`, `getGrowthSignalsForUser()`
- `lib/db/professorNotes.ts` — `getProfessorNotes()`, `addProfessorNote()`, `deleteProfessorNote()`, `toggleFollowupFlag()`, `getStudentsWithFollowupFlags()`
- `lib/db/debriefs.ts` — `getDebrief()`, `upsertDebrief()`, `completeDebrief()`, `getDebriefStatusesBySessionIds()`, `getStudentNamesForSession()`
- `lib/db/semesters.ts` — `getSemestersByUser()`, `getActiveSemester()`, `getSemesterById()`, `insertSemester()`, `updateSemester()`, `archiveAndCreateSemester()`, `assignSessionsToSemester()`, `getUnassignedSessions()`
- `lib/db/semesterComparison.ts` — `getSemesterComparisonData()`: cross-semester cohort comparison
- `lib/db/themes.ts` — `getThemeFrequency()`, `getRecentThemeTitles()`
- `lib/db/subscription.ts` — `checkSubscriptionAccess()`, `decrementFreeSession()`, `getSubscriptionProfile()`, `updateStripeCustomerId()`, `updateSubscriptionFromWebhook()`
- `lib/db/sessionAnalyses.ts` — CRUD for per-session Gemini analysis results
- `lib/db/sessionShares.ts` — create/fetch session share tokens
- `lib/db/savedComparisons.ts` — CRUD for saved session comparison shares
- `lib/db/speakerBriefs.ts` — CRUD for speaker brief data
- `lib/db/speakerPortals.ts` — CRUD for speaker portal data
- `lib/db/tierData.ts` — CRUD for session tier classification data
- `lib/db/reports.ts` — CRUD for semester reports
- `lib/db/stories.ts` — CRUD for semester narrative stories
- `lib/db/portfolioShares.ts` — CRUD for portfolio share tokens and configs
- `lib/db/studentDebriefs.ts` — student debrief submission data
- `lib/db/studentSpeakerAnalyses.ts` — student speaker analysis submission data
- `lib/db/sessionSyntheses.ts` — CRUD for session synthesis data

**Parsing (`lib/parse/`)**
- `lib/parse/builder.ts` — orchestrates ZIP → parse → structured text
- `lib/parse/unzip.ts` — ZIP extraction with MAC directory filtering
- `lib/parse/pdf.ts` — PDF text extraction
- `lib/parse/docx.ts` — DOCX text extraction
- `lib/parse/parseQuestions.ts` — `parseSections()`, `parseQuestionsFromOutput()`: shared question parser used by OutputPreview and DebriefPanel

**AI agents (`lib/ai/`)**
- `lib/ai/client.ts` — lazy OpenAI SDK client pointed at XAI_BASE_URL (session generation)
- `lib/ai/geminiClient.ts` — `getGeminiClient()`, `getGeminiModel()`: lazy singleton for all Gemini calls
- `lib/ai/prompt.ts` — built-in system prompt template, custom prompt interpolation, validation helpers
- `lib/ai/analysisAgent.ts` — `runSessionAnalysis()`, `runThemeAnalysis()`: per-session deep analysis
- `lib/ai/generateSessionAnalysis.ts` — server-side session analysis generation
- `lib/ai/studentProfile.ts` — `generateStudentProfiles()`: growth intelligence profiles, fire-and-forget
- `lib/ai/classInsights.ts` — `generateClassInsights()`: cross-session class analysis, fire-and-forget
- `lib/ai/debriefSummary.ts` — `generateDebriefSummary()`: debrief summary on completion
- `lib/ai/sqlAgent.ts` — NL→SQL→answer agent for analytics queries
- `lib/ai/reportAgent.ts` — `generateSemesterReport()`: comprehensive semester report generation
- `lib/ai/storyAgent.ts` — semester narrative story generation (5-section structure)
- `lib/ai/speakerBrief.ts` — speaker brief generation (themes, tensions, suggestions, blind spots, sentiment)
- `lib/ai/speakerPortal.ts` — speaker portal content generation
- `lib/ai/speakerPortalPostSession.ts` — post-session speaker portal feedback
- `lib/ai/speakerRecommendations.ts` — AI-generated speaker recommendations
- `lib/ai/comparisonAgent.ts` — side-by-side session comparative analysis
- `lib/ai/semesterComparison.ts` — cross-semester cohort comparison analysis
- `lib/ai/synthesisAgent.ts` — session synthesis generation
- `lib/ai/tierClassifier.ts` — question quality tier classification
- `lib/ai/debriefReflectionAnalysis.ts` — student debrief reflection analysis
- `lib/ai/speakerAnalysisEvaluation.ts` — student speaker analysis evaluation

**Export (`lib/export/`)**
- `lib/export/pdf.ts` — session output → PDF (via `@react-pdf/renderer`)
- `lib/export/docx.ts` — session output → DOCX (via `docx`)
- `lib/export/reportPdf.ts` — semester report → PDF with cover page and brand colors
- `lib/export/reportDocx.ts` — semester report → DOCX
- `lib/export/briefPdf.ts` — speaker brief → PDF
- `lib/export/briefText.ts` — speaker brief → plain text
- `lib/export/storyPdf.ts` — narrative story → PDF
- `lib/export/storyDocx.ts` — narrative story → DOCX

**Utilities**
- `lib/utils/transforms.ts` — `rowToSession()`, `rowToSessionSummary()`, `rowToDebrief()` (snake_case → camelCase)
- `lib/utils/format.ts` — `formatStudentName()`, `formatDate()`, `formatFileCount()`, `slugifySpeakerName()`
- `lib/stripe/index.ts` — Stripe SDK lazy singleton (`apiVersion: '2026-03-25.dahlia'`)
- `lib/constants/` — barrel at `index.ts` re-exports from:
  - `routes.ts` — `ROUTES` object with all route paths (static and dynamic)
  - `brand.ts` — `BRAND` colors (`ORANGE`, `PURPLE`, `GREEN`), `APP_NAME`
  - `ai.ts` — `AI_CONFIG` defaults
  - `validation.ts` — `ACCEPTED_FILE_TYPES`, `ACCEPTED_ZIP_MIME`

### Database

All tables use RLS. Sessions are **immutable** — no UPDATE or DELETE policies exist by design. New users can self-signup with a 3-day free trial. Signups must be enabled in the Supabase Dashboard (Authentication > Providers > Email).

**Core tables**

| Table | Purpose |
|---|---|
| `sessions` | One row per processed ZIP — speaker name, AI output, file count, optional `semester_id` FK (NULL = unassigned), optional `prompt_version_id` FK (NULL = built-in default prompt) |
| `custom_system_prompts` | Immutable per-professor prompt versions — optional label, full prompt text, version number, active flag |
| `student_submissions` | One row per student per session — raw submission text, student name, filename |
| `session_themes` | One row per theme per session — theme number (1–10) and title extracted from AI output |
| `class_insights` | One row per professor — Gemini-generated class analysis JSON, upserted after each session |
| `session_debriefs` | One row per session — post-session debrief: rating, question feedback, observations, AI summary |
| `student_profiles` | One row per professor+student pair — Gemini-generated AI profile (JSONB) with growth intelligence, denormalized `growth_signal` |
| `professor_student_notes` | Professor-authored notes per student — survive AI profile regeneration, support follow-up flagging |
| `semesters` | One row per semester per professor — name, start/end dates, status (`active`/`archived`) |
| `cohort_comparisons` | Cross-semester comparison data — session counts, student counts, avg submissions, theme persistence |

**Analysis & sharing tables**

| Table | Purpose |
|---|---|
| `session_analyses` | Cached per-session Gemini analysis results (theme clusters, tensions, sentiment) |
| `session_shares` | Share tokens for public session links |
| `saved_comparisons` | Saved side-by-side session comparisons with share tokens |
| `session_tier_data` | Per-session question quality tier classification data |
| `session_syntheses` | Session synthesis data combining multiple analysis dimensions |

**Speaker & student submission tables**

| Table | Purpose |
|---|---|
| `speaker_briefs` | Generated speaker briefs — themes, tensions, suggestions, blind spots, sentiment |
| `speaker_portals` | Published speaker portal content with share tokens |
| `student_debrief_submissions` | Raw student debrief/reflection submissions per session |
| `student_debrief_analyses` | AI analysis of student debrief reflections |
| `student_speaker_analysis_submissions` | Raw student speaker analysis submissions per session |
| `student_speaker_analyses` | AI evaluation of student speaker analyses |

**Semester & portfolio tables**

| Table | Purpose |
|---|---|
| `semester_reports` | Generated semester reports (JSONB content, config) |
| `semester_stories` | Generated semester narrative stories (5-section structure) |
| `portfolio_shares` | Portfolio share tokens with configurable section visibility |

The `profiles` table also stores Stripe subscription fields: `stripe_customer_id`, `subscription_status`, `stripe_subscription_id`, `subscription_price_id`, `subscription_current_period_end`, `trial_ends_at`, `free_sessions_remaining`. The `decrement_free_session` SQL function atomically decrements free sessions.

The built-in interview-sheet prompt stays in `lib/ai/prompt.ts`. When `sessions.prompt_version_id` is `NULL`, that built-in default prompt was used for generation.

The `execute_analytics_query` SQL function (SECURITY DEFINER) is used by the SQL agent to run read-only SELECT queries bypassing RLS. It validates queries server-side before executing them.

### Dual AI systems

- **xAI Grok** (via OpenAI SDK + `baseURL` override): session generation — turns student submissions into the 10-section interview sheet
- **Google Gemini** (via `@google/genai`, singleton from `geminiClient.ts`): powers all other AI features —
  - `analysisAgent.ts`: per-session analysis (theme clusters, tensions, suggestions, blind spots, sentiment); also powers theme deep-dive via `runThemeAnalysis()`
  - `classInsights.ts`: cross-session class analysis, fire-and-forget after each session save and debrief completion
  - `debriefSummary.ts`: post-session debrief summary, generated when professor marks debrief complete
  - `sqlAgent.ts`: NL→SQL→answer agent for analytics page queries
  - `reportAgent.ts`: comprehensive semester report generation (executive summary, theme evolution, student engagement, question quality, etc.)
  - `storyAgent.ts`: semester narrative story with 5-section structure
  - `speakerBrief.ts`: speaker brief generation (themes, tensions, suggestions, blind spots, sentiment distribution)
  - `speakerPortal.ts` / `speakerPortalPostSession.ts`: speaker portal content (pre- and post-session)
  - `speakerRecommendations.ts`: AI-generated speaker recommendations
  - `comparisonAgent.ts`: side-by-side session comparative analysis
  - `semesterComparison.ts`: cross-semester cohort comparison
  - `synthesisAgent.ts`: session synthesis combining multiple analysis dimensions
  - `tierClassifier.ts`: question quality tier classification (Tier 1–4)
  - `studentProfile.ts`: growth intelligence profiles, fire-and-forget after session upload
  - `debriefReflectionAnalysis.ts`: analysis of student debrief reflections
  - `speakerAnalysisEvaluation.ts`: evaluation of student speaker analyses

### Key conventions

- Path alias `@/` maps to the repo root (`tsconfig.json`)
- All API routes set `export const dynamic = 'force-dynamic'`
- The `(app)` layout also sets `force-dynamic` so auth checks run per-request
- Brand colors live in `lib/constants/brand.ts` (`BRAND.ORANGE`, `BRAND.PURPLE`, `BRAND.GREEN`) — use these instead of hardcoded hex values
- Student name is parsed from filename: `FirstName_LastName...` → displayed as `"FirstName L."`
- PDF/DOCX parse failures return empty string — processing continues for other files in the ZIP
- Session generation resolves the professor's active custom prompt at request time; if none is active, the built-in default prompt is used
- `sessionStorage` cache keys on `/preview`: `session_${sessionId}` (AI output), `overlap_${sessionId}` (overlapping themes JSON array), `analysis_${sessionId}` (per-session Gemini analysis JSON)
- `/preview` has four tabs: `questions` (markdown output), `analysis` (AnalysisPanelLeft — theme clusters + tensions), `insights` (AnalysisPanelRight — suggestions, blind spots, sentiment), `debrief` (DebriefPanel — post-session capture with auto-save)
- Subscription is managed via Stripe. Session generation (`/api/process`) is gated by `checkSubscriptionAccess()`. Existing users get 1 free session; new users get a 3-day trial. The `SubscriptionContext` provides client-side access to subscription state. Stripe webhooks are the source of truth for subscription status changes.
- Semesters are optional groupings for sessions. Each professor can have one `active` semester at a time; others are `archived`. New sessions created via `/api/process` are automatically assigned to the active semester if one exists. Sessions with `semester_id = NULL` are unassigned and can be bulk-assigned from `/semesters`.
- Public sharing uses token-based URLs under `(public)/`. Session shares, comparison shares, speaker portals, and portfolios each generate unique tokens. No auth required for public routes.
- Portfolios are configurable — professors choose which sections (analytics, roster, reports, sessions) to expose via `PortfolioConfig`.
- Speaker portals have two phases: pre-session (brief with student questions) and post-session (feedback capture).
- Semester reports and stories are generated on-demand via `/api/reports/generate` and `/api/stories/generate`, then stored for retrieval and export.
- Three student submission types flow through the system: questions (from ZIP upload), debrief reflections (`student-debriefs` endpoint), and speaker analyses (`speaker-analyses` endpoint). All three feed into student profile generation.
- Export system covers 4 document types: session output (PDF/DOCX), speaker brief (PDF/text), semester report (PDF/DOCX), and narrative story (PDF/DOCX).

### Anti-patterns (do NOT do these)

- **Never create a new `GoogleGenAI` instance directly.** Import `getGeminiClient()` from `lib/ai/geminiClient.ts`. The lazy singleton pattern avoids build-time crashes and keeps configuration in one place.
- **Never hardcode hex color values.** Use `BRAND.ORANGE`, `BRAND.PURPLE`, `BRAND.GREEN` from `lib/constants`.
- **Never import from `lib/constants/routes.ts` (or other sub-files) directly.** Import from `lib/constants` (the barrel) — e.g., `import { ROUTES } from '@/lib/constants'`.
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
| Token-based public sharing | Allows professors to share sessions, comparisons, speaker portals, and portfolios without requiring recipients to have accounts. Each share type has its own token namespace. |
| Built-in prompt in code, custom prompts in DB | The default interview-sheet instructions stay version-controlled in `lib/ai/prompt.ts`, while professor overrides are saved as immutable versions in `custom_system_prompts`. `sessions.prompt_version_id = NULL` cleanly represents "default prompt used." |
| Three student submission types | Questions (ZIP upload), debrief reflections, and speaker analyses capture different dimensions of student engagement. All three feed into the AI profile for holistic growth tracking. |
| Portfolio configurability | Professors control which sections are visible in shared portfolios via `PortfolioConfig`. This respects privacy (e.g., hiding roster) while enabling flexible sharing with administrators or accreditation reviewers. |
| Semester reports and stories as separate artifacts | Reports are data-driven (metrics, charts, rankings). Stories are narrative-driven (human-readable semester arc). Different audiences need different formats. |
| Speaker portals with pre/post phases | Pre-session: gives speakers context on student questions. Post-session: captures speaker feedback. Two distinct generation agents handle each phase. |

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
## Working Style & Preferences

- **Execute, don't explain.** If you have tools to make a change, make it. Don't describe what to do.
- **Local-first.** When working on localhost, never suggest Supabase Dashboard, Vercel, or cloud fixes. Use CLI and local files only unless explicitly told otherwise.
- **Action-oriented prompts.** Treat feature requests as implementation tickets — plan phases, then execute end-to-end.
- **Commit frequently.** After completing each phase of multi-file work, stage and commit to prevent loss from stash/linter/external reverts.
- **Verify after git ops.** After any stash, merge, or branch switch, run `git diff --stat` and confirm no files were accidentally reverted.
- **Typecheck before reporting done.** Always run `npx tsc --noEmit` and `npm run build` after multi-file changes. Don't report completion until clean.
- **Multi-phase feature pattern:** Types → Migration → DB layer → AI agent → API route → UI → Typecheck/Build → CLAUDE.md update.
- **No production config changes during local dev.** Never modify remote/production Supabase config when working on localhost.
- **Parallel agents welcome.** For large features (10+ files), spawn sub-agents for independent workstreams (DB, API, UI) when possible.
- **Migrations reminder.** If migrations were created, remind to push them (`supabase db push`).
- **Wrong approach = most common friction.** When unsure, outline the plan and confirm before coding rather than diving in.
