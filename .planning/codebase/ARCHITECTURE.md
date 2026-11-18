---
last_mapped_commit: 61012611b3bbfe57df4d8eb25c37b98b17a2d673
last_mapped_at: 2026-11-18
---
<!-- refreshed: 2026-11-18 -->
# Architecture

**Analysis Date:** 2026-11-18

## System Overview

```text
┌──────────────────────────────────────────────────────────────────────────┐
│  Browser                                                                  │
│  Client pages `app/(app)/**/page.tsx`, `app/(public)/**/page.tsx`         │
│  Contexts: SubscriptionContext, SemesterContext, PortfolioContext         │
└──────────────┬───────────────────────────────────────────┬───────────────┘
               │ fetch('/api/...')                          │ Supabase browser client
               ▼                                            │ (uploads ZIP to temp-uploads)
┌──────────────────────────────────────────────────────────┐ │
│  Edge middleware `middleware.ts` (auth gate, cookie refresh)│ │
└──────────────┬───────────────────────────────────────────┘ │
               ▼                                              │
┌──────────────────────────────────────────────────────────┐  │
│  Route handlers `app/api/**/route.ts` (thin orchestration)│  │
│  getCurrentUser() → ownership check → lib call → JSON     │  │
└──────┬────────────────┬──────────────────┬───────────────┘  │
       ▼                ▼                  ▼                  ▼
┌────────────┐  ┌───────────────┐  ┌──────────────┐  ┌──────────────────┐
│ lib/db/*   │  │ lib/ai/*      │  │ lib/parse/*  │  │ lib/stripe/      │
│ Supabase   │  │ agents, prompt│  │ ZIP/PDF/DOCX │  │ Stripe SDK       │
│ queries    │  │ → OpenRouter  │  │ → text       │  │ + webhook        │
└─────┬──────┘  └───────┬───────┘  └──────────────┘  └────────┬─────────┘
      ▼                 ▼                                      ▼
┌────────────────────┐ ┌────────────────────┐        ┌───────────────────┐
│ Supabase Postgres  │ │ OpenRouter         │        │ Stripe            │
│ (RLS) + storage    │ │ DeepSeek V4 Flash  │        │ (webhook → DB)    │
└────────────────────┘ └────────────────────┘        └───────────────────┘
```

Export pipeline (`lib/export/*`) is invoked by download route handlers and returns PDF or DOCX bytes; it does not persist anything.

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Auth gate | Validates Supabase session, refreshes cookies, redirects protected prefixes to `/login` | `middleware.ts` |
| Protected layout | Wraps authenticated pages with `SubscriptionProvider`, `SemesterProvider`, `NavHeader`, banner, toaster | `app/(app)/layout.tsx` |
| Public layout | Minimal shell for token-gated pages; no auth, no nav | `app/(public)/layout.tsx` |
| Session pipeline | ZIP → parse → AI → persist → background jobs | `app/api/process/route.ts` |
| Current user | Cookie-scoped Supabase user lookup used by every protected route | `lib/db/users.ts` |
| Supabase clients | Cookie/RLS client, service-role admin client, browser client | `lib/supabase/server.ts`, `lib/supabase/client.ts` |
| Temp storage | Browser upload to `temp-uploads` bucket; server download and delete | `lib/supabase/storage.ts`, `lib/supabase/storage.server.ts` |
| Session generation | Calls OpenRouter with the 10-section interview-sheet prompt | `lib/ai/client.ts`, `lib/ai/prompt.ts` |
| Shared AI client | Lazy OpenRouter singleton plus Gemini-shaped facade used by all agents | `lib/ai/geminiClient.ts` |
| Analysis agents | Per-session, class, report, story, brief, portal, comparison, SQL, tier, profile agents | `lib/ai/*.ts` (22 files) |
| DB access layer | One module per domain table group; Supabase query functions | `lib/db/*.ts` (26 files) |
| Parsing | ZIP extraction, PDF/DOCX/HTML text extraction, question and theme parsing | `lib/parse/*.ts` |
| Export | Session, brief, report, story to PDF/DOCX/text | `lib/export/*.ts` |
| Row mapping | snake_case DB rows to camelCase domain objects | `lib/utils/transforms.ts` |
| Subscription | Access check, free-session decrement, Stripe webhook state sync | `lib/db/subscription.ts`, `app/api/stripe/webhook/route.ts` |
| Route and brand constants | Single import surface for route paths and brand colors | `lib/constants/index.ts` |

## Pattern Overview

**Overall:** Next.js 14 App Router monolith. Client-rendered pages call JSON route handlers, which delegate to a `lib/` service layer that talks to Supabase, OpenRouter, and Stripe. Supabase Row Level Security is the primary data-isolation mechanism.

**Key Characteristics:**
- Pages in `app/(app)/` and `app/(public)/` are mostly `'use client'` components that fetch from `/api/*` on mount (for example `app/(app)/roster/page.tsx` fetches `GET /api/roster`). Server Components are not used for data loading.
- Route handlers are thin. Each one authenticates, checks ownership, calls one or more `lib/` functions, and returns `NextResponse.json`. Every route exports `dynamic = 'force-dynamic'` (see `app/api/CLAUDE.md`).
- Access control has two modes: user sessions (cookie plus RLS via `createClient()`) for `(app)` routes, and unguessable share tokens for `(public)` routes (`session_shares`, `saved_comparisons`, `speaker_portals`, `portfolio_shares`).
- Sessions are immutable. `sessions` has no UPDATE or DELETE policy by design (root `CLAUDE.md`). Other user-owned rows such as notes and share tokens can be deleted (`lib/db/professorNotes.ts`, `lib/db/sessionShares.ts`), and `app/api/admin/clear/route.ts` clears data.
- Heavy AI work is split between synchronous generation (the one interview sheet returned to the client) and fire-and-forget jobs for everything else.
- All AI calls go through one OpenRouter client. Model name is set by `OPENROUTER_MODEL`, defaulting to `deepseek/deepseek-v4-flash-0731`.

## Layers

**Edge middleware:**
- Purpose: Refresh Supabase auth cookies and gate protected URL prefixes.
- Location: `middleware.ts`
- Contains: One `createServerClient` from `@supabase/ssr` and a prefix allowlist.
- Depends on: `@supabase/ssr`, `next/server`
- Used by: Every non-static request (matcher excludes `_next/static`, `_next/image`, `favicon.ico`).

**Page layer (client components):**
- Purpose: Rendering, local UI state, `fetch` to API, `sessionStorage` caching.
- Location: `app/(app)/**/page.tsx`, `app/(auth)/login/page.tsx`, `app/(public)/**/page.tsx`
- Contains: Page-level components plus feature components under `components/`.
- Depends on: `components/*`, `lib/constants` (`ROUTES`), `types/`, contexts.
- Used by: Next.js router.

**Context layer:**
- Purpose: Share subscription and semester state across the `(app)` tree.
- Location: `components/subscription/SubscriptionContext.tsx`, `components/semester/SemesterContext.tsx`, `components/portfolio/PortfolioContext.tsx`
- Contains: React context providers and hooks (`useSemesterContext`, and similar).
- Depends on: `/api/subscription`, `/api/semesters`
- Used by: `app/(app)/layout.tsx` and descendant pages.

**Route handler layer:**
- Purpose: HTTP boundary. Auth, input validation, ownership checks, status codes.
- Location: `app/api/**/route.ts` (62 `route.ts` files)
- Contains: `GET`, `POST`, `PATCH`, `DELETE` exports.
- Depends on: `lib/db/*`, `lib/ai/*`, `lib/export/*`, `lib/parse/*`, `lib/stripe`, `lib/supabase/*`
- Used by: Client pages (`fetch`), Stripe (`app/api/stripe/webhook`), and the OAuth callback (`app/api/auth/callback`).

**Domain service layer (`lib/`):**
- Purpose: All business logic and I/O wrappers.
- Location: `lib/db/`, `lib/ai/`, `lib/parse/`, `lib/export/`, `lib/stripe/`, `lib/utils/`
- Contains: Named async functions per operation (for example `insertSession`, `checkSubscriptionAccess`, `generateSemesterReport`).
- Depends on: `lib/supabase/server.ts` (or `lib/supabase/client.ts` in browser code), `lib/ai/geminiClient.ts`, `lib/stripe/index.ts`
- Used by: Route handlers; a few `lib/` modules call each other (for example `lib/ai/client.ts` imports `lib/ai/prompt.ts`).

**Data and external services:**
- Purpose: Persistence, auth, object storage, LLM, payments.
- Location: `supabase/migrations/*.sql` (schema, RLS, SQL functions), external APIs.
- Contains: Tables listed in root `CLAUDE.md`; RPC functions `decrement_free_session` and `execute_analytics_query`.
- Depends on: Nothing in-repo.
- Used by: `lib/db/*`, `lib/supabase/*`, `lib/ai/*`, `lib/stripe/*`.

## Data Flow

### Primary Request Path: Generate an interview sheet

1. Professor uploads a Canvas ZIP from the dashboard. The browser writes it to Supabase Storage via `lib/supabase/storage.ts` (`uploadTempZip`). (`app/(app)/dashboard/page.tsx`)
2. Client posts `{ speakerName, storagePath }` to `POST /api/process`. (`app/api/process/route.ts`)
3. Auth and subscription gate: `getCurrentUser()` then `checkSubscriptionAccess()` returns 401 or 403 otherwise. (`lib/db/users.ts`, `lib/db/subscription.ts`)
4. ZIP downloaded from `temp-uploads` with `downloadTempZip()`. (`lib/supabase/storage.server.ts`)
5. `buildSubmissionsText()` unzips, extracts PDF/DOCX/HTML text, and returns structured text plus per-student submissions. (`lib/parse/builder.ts`)
6. Active custom prompt resolved through `getActivePrompt()`, else built-in default. (`lib/db/systemPrompts.ts`, `lib/ai/prompt.ts`)
7. `generateQuestionSheet()` calls OpenRouter via `getOpenRouter()`. (`lib/ai/client.ts`, `lib/ai/geminiClient.ts`)
8. Active semester resolved (NULL if none). Session row inserted with `insertSession()`. (`lib/db/semesters.ts`, `lib/db/sessions.ts`)
9. Free-session counter decremented for trial users. (`lib/db/subscription.ts`)
10. In parallel: `insertStudentSubmissions()` and `insertSessionThemes()`; theme overlap computed against recent sessions (non-fatal). (`lib/db/sessions.ts`, `lib/parse/parseThemes.ts`, `lib/db/themes.ts`)
11. Four fire-and-forget jobs start and are not awaited: `generateClassInsights`, `generateAndCacheSessionAnalysis`, `generateStudentProfiles`, `classifyAndStoreTiers`. (`lib/ai/classInsights.ts`, `lib/ai/generateSessionAnalysis.ts`, `lib/ai/studentProfile.ts`, `lib/ai/tierClassifier.ts`)
12. Temp ZIP deleted in a `finally` block. Response returns `{ sessionId, output, fileCount, overlappingThemes }`.
13. Client stores `output` in `sessionStorage` under `session_${sessionId}` and navigates to `/preview`, which reads the cache first.

### Stripe Subscription Sync

1. Checkout created by `app/api/stripe/checkout/route.ts`. Client is redirected to Stripe.
2. Stripe calls `app/api/stripe/webhook/route.ts`. The handler verifies the signature and calls `updateSubscriptionFromWebhook()` in `lib/db/subscription.ts`.
3. `profiles` row updated. Webhooks are the only source of truth for status. `/api/subscription` reads the row and `SubscriptionContext` caches it on the client.

### Public Share Read

1. Owner creates a token via `POST /api/sessions/[id]/share`, `/api/compare/share`, `/api/sessions/[id]/portal/publish`, or `/api/portfolio`.
2. Recipient opens `app/(public)/shared/[token]/page.tsx` (or the equivalent portfolio, speaker, or compare page).
3. The page fetches its matching `app/api/shared/[token]/*`, `app/api/portfolio/[token]/*`, or `app/api/speaker/[token]` route. These routes look up the token with the DB layer and return only the allowed fields.

### Analytics Natural-Language Query

1. `app/(app)/analytics/page.tsx` posts a question to `POST /api/analytics/query`.
2. `lib/ai/sqlAgent.ts` (`runAnalyticsQuery(question, userId)`) asks the model for SQL scoped to `sessions.user_id`, rejects SQL that lacks the user id literal, and executes it through the `execute_analytics_query` SECURITY DEFINER function (bypasses RLS).

### Background job model

Fire-and-forget promises are started after the response is prepared and their failures are logged with `console.error`. No `waitUntil` from `@vercel/functions` is used (it is installed but no call sites exist under `app/` or `lib/`), so on a serverless host these jobs are not guaranteed to finish after the response is sent.

**State Management:**
- Server: Postgres is the source of truth. `sessions`, `session_analyses`, `class_insights`, `student_profiles`, and `profiles` (subscription fields) are written by the pipeline.
- Client: React state inside pages, React context for subscription and semester, and `sessionStorage` for generated output, overlapping themes, and per-session analysis (keys `session_${id}`, `overlap_${id}`, `analysis_${id}`).

## Key Abstractions

**`getCurrentUser()`:**
- Purpose: Resolve the authenticated professor from cookies.
- Examples: `lib/db/users.ts`, called in nearly every `app/api/**/route.ts`
- Pattern: Returns `null` when unauthenticated. Route returns 401.

**Supabase clients:**
- Purpose: Choose privilege per call site.
- Examples: `lib/supabase/server.ts` exports `createClient()` (anon key, cookies, RLS) and `createAdminClient()` (service role).
- Pattern: Use `createClient()` for user reads. Reserve `createAdminClient()` for background jobs, storage, and webhooks. Note the deviation in Architectural Constraints below.

**Lazy singletons:**
- Purpose: Avoid crashes at build time when env vars are missing.
- Examples: `getOpenRouter()` in `lib/ai/geminiClient.ts`, `lib/stripe/index.ts`, and the Supabase helpers.
- Pattern: Module-level `let client: X | null = null`, created on first call.

**Gemini-shaped facade:**
- Purpose: Keep 17+ agents unchanged after the provider switch to OpenRouter.
- Examples: `getGeminiClient().models.generateContent({ model, contents, config })` in `lib/ai/geminiClient.ts`, read via `.text`.
- Pattern: Adapter. Names are historical. New agents should import `getGeminiClient()` from `lib/ai/geminiClient.ts`.

**Domain DB modules:**
- Purpose: One file per table group with named CRUD functions.
- Examples: `lib/db/sessions.ts`, `lib/db/semesters.ts`, `lib/db/portfolioShares.ts`, `lib/db/studentProfiles.ts`
- Pattern: Each function takes primitives or typed objects and returns mapped domain types via `lib/utils/transforms.ts`.

**Token-gated public views:**
- Purpose: Share sessions, comparisons, speaker portals, and portfolios without accounts.
- Examples: `app/(public)/portfolio/[token]/layout.tsx`, `app/api/portfolio/[token]/route.ts`
- Pattern: Token is the only credential. Each share type has its own table and token namespace.

**Agents:**
- Purpose: One module per AI feature containing prompt building, a model call, and output parsing.
- Examples: `lib/ai/reportAgent.ts` (`generateSemesterReport`), `lib/ai/storyAgent.ts`, `lib/ai/speakerBrief.ts`, `lib/ai/comparisonAgent.ts`
- Pattern: Export one entry function. Persist the result through a `lib/db/*` function. Never create an SDK client inline.

## Entry Points

**Root layout and home:**
- Location: `app/layout.tsx`, `app/page.tsx`
- Triggers: Any request not caught by middleware. `app/page.tsx` redirects to `/dashboard` or `/login`.
- Responsibilities: HTML shell, fonts, global CSS (`app/globals.css`).

**Edge middleware:**
- Location: `middleware.ts`
- Triggers: Every request except static assets.
- Responsibilities: Session refresh, redirects for `/dashboard`, `/preview`, `/history`, `/analytics`, `/roster`, `/reports`, `/compare`, `/semesters`, `/account`.

**Session pipeline:**
- Location: `app/api/process/route.ts` (`POST`, `maxDuration: 60` in `vercel.json`)
- Triggers: Dashboard upload submit.
- Responsibilities: Full ZIP to interview sheet to persistence, plus background jobs.

**Stripe webhook:**
- Location: `app/api/stripe/webhook/route.ts`
- Triggers: Stripe events (`customer.subscription.*`, `invoice.*`).
- Responsibilities: Verify the `stripe-signature` header with `constructEvent` and update `profiles` subscription fields.

**OAuth callback:**
- Location: `app/api/auth/callback/route.ts`
- Triggers: Supabase PKCE redirect after sign-in.
- Responsibilities: Exchange code for session cookies.

**Standalone scripts (outside the Next.js runtime):**
- Location: `scripts/backfill-tiers.ts`, `scripts/agent_orchestrator.ts`
- Triggers: Manual `tsx` runs.
- Responsibilities: One-off data backfill and an offline ts-morph based codebase tool. `agent_orchestrator.ts` reads `GEMINI_API_KEY` and is not aligned with the OpenRouter setup.

## Architectural Constraints

- **Threading:** Node.js single event loop per serverless invocation. No worker threads. Background jobs share the request's process and are not durable.
- **Global state:** Module-level lazy singletons: the OpenRouter client in `lib/ai/geminiClient.ts`, the Stripe client in `lib/stripe/index.ts`, and the Supabase helpers in `lib/supabase/`. Client-side state lives in `sessionStorage` on `/preview`.
- **Circular imports:** None observed in the files reviewed. Not checked exhaustively.
- **Middleware allowlist is incomplete:** `middleware.ts` does not list `/stories`. The page `app/(app)/stories/[id]/page.tsx` is therefore not redirected by middleware. Its API (`app/api/stories/[id]/route.ts`) does call `getCurrentUser()` and returns 401, so data is still protected.
- **Admin client used beyond the documented exception:** 23 of 26 files in `lib/db/` import `createAdminClient()`, including `lib/db/sessions.ts` (`insertSession`, which runs in the pipeline) and `lib/db/systemPrompts.ts`. Some of these functions take a `userId` and filter by it, but RLS is bypassed. Root `CLAUDE.md` says to use `createClient()` for user-scoped reads.
- **Analytics SQL isolation is string-based:** `lib/ai/sqlAgent.ts` checks that generated SQL contains the user id literal. `execute_analytics_query` is SECURITY DEFINER, so it bypasses RLS. Root `CLAUDE.md` acknowledges this is not airtight.
- **Stale provider references in code comments:** `lib/ai/client.ts` (header), `app/api/process/route.ts` (header and step 5), and `app/api/CLAUDE.md` still describe xAI Grok. The code calls OpenRouter through `getOpenRouter()`.
- **Serverless timeout:** `vercel.json` sets `maxDuration: 60` for `app/api/process/route.ts`. The report and story generate routes (`app/api/reports/generate/route.ts`, `app/api/stories/generate/route.ts`) state a 60-second budget in comments only, so their actual limit depends on the host configuration.

## Anti-Patterns

### Fire-and-forget jobs without `waitUntil`

**What happens:** `app/api/process/route.ts` (steps 11 to 15) calls four `lib/ai/*` functions with `.catch(...)` and does not await them. The response returns first.
**Why it's wrong:** On Vercel, the function instance can be frozen once the response is sent, so class insights, session analysis, student profiles, and tier data may never finish. `@vercel/functions` is already a dependency and provides `waitUntil`.
**Do this instead:** Wrap each job with `waitUntil` from `@vercel/functions` in the route, or await them if the response can wait. Keep the `.catch` logging.

### Service-role client for user reads

**What happens:** Many `lib/db/*.ts` functions call `createAdminClient()` and filter by a `userId` argument, for example `lib/db/systemPrompts.ts`, `lib/db/studentProfiles.ts`, `lib/db/semesters.ts`.
**Why it's wrong:** A missed `.eq('user_id', ...)` filter exposes other professors' rows, because RLS does not apply.
**Do this instead:** Use `createClient()` from `lib/supabase/server.ts` for any read that runs in a user request. Reserve `createAdminClient()` for the pipeline insert, storage helpers, and webhook writes.

### Provider drift in agent modules

**What happens:** New agents are expected to import `getGeminiClient()`, but `lib/ai/client.ts` still has xAI wording in its doc comments.
**Why it's wrong:** Readers and future edits will assume a different provider and different env vars (`XAI_API_KEY`).
**Do this instead:** Import `getOpenRouter()` or `getGeminiClient()` from `lib/ai/geminiClient.ts`, and update the header comment when touching the file.

## Error Handling

**Strategy:** Route handlers catch all errors, log with a context prefix, and return a sanitized JSON error. AI errors are normalized before reaching the client.

**Patterns:**
- Map known failures to status codes: 401 unauthenticated, 403 `subscription_required`, 400 bad input, 404 not owned (existence hidden), 500 unexpected. See `app/api/process/route.ts`.
- Use `extractErrorMessage()` from `lib/utils/errors.ts` in catch blocks that touch AI output so raw provider JSON never reaches the browser.
- Non-fatal side work (theme overlap, analytics jobs, PDF/DOCX parse of one file) logs and continues. Parse helpers return `''` on failure (`lib/parse/pdf.ts`, `lib/parse/docx.ts`).
- Client shows inline `error` state plus `toast.error()` from `sonner`. `alert()` is not used.

## Cross-Cutting Concerns

**Logging:** `console.error` / `console.warn` with a bracketed route or module prefix, for example `[/api/process] generateClassInsights failed (non-fatal):`. No structured logger.
**Validation:** Manual checks in each route (`typeof body.x === 'string'`, `.trim()` checks). Shared limits in `lib/constants/validation.ts`. No schema library detected in `package.json`.
**Authentication:** Supabase email/password in `app/(auth)/login/page.tsx`. Cookie session read by `getCurrentUser()`. Middleware refreshes tokens. Public surfaces use share tokens.
**Subscriptions:** Stripe Checkout and Billing Portal (`app/api/stripe/*`). Access decided by `checkSubscriptionAccess()` on the server and mirrored in `SubscriptionContext` on the client.
**Brand and routes:** Import from the barrel `lib/constants` (for example `ROUTES`, `BRAND`). Hard-coded hex colors are not allowed by convention.

---

*Architecture analysis: 2026-11-18*
