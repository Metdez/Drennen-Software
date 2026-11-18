---
last_mapped_commit: 61012611b3bbfe57df4d8eb25c37b98b17a2d673
last_mapped_at: 2026-11-18
---
# External Integrations

**Analysis Date:** 2026-11-18

## APIs & External Services

**AI Model Provider (OpenRouter):**
- Purpose: All AI features: session question-sheet generation, session analysis, student profiles, speaker briefs, reports, stories, comparisons, tier classification, and the analytics SQL agent.
- SDK/Client: `openai` package pointed at `https://openrouter.ai/api/v1`. Singleton `getOpenRouter()` in `lib/ai/geminiClient.ts`. Gemini-shaped facade `getGeminiClient()` in the same file.
- Auth: `OPENROUTER_API_KEY` (required; throws `Missing OPENROUTER_API_KEY` if absent).
- Model selection: `OPENROUTER_MODEL` (optional), default `deepseek/deepseek-v4-flash-0731`. Helper `getGeminiModel()` in `lib/ai/geminiClient.ts`.
- Request options: `reasoning: { enabled: false }`, `provider: { sort: 'throughput' }`. JSON mode uses `response_format: { type: 'json_object' }` when `responseMimeType === 'application/json'`.
- Callers: `lib/ai/client.ts` (session generation, reached from `app/api/process/route.ts`), `lib/ai/analysisAgent.ts`, `lib/ai/reportAgent.ts`, `lib/ai/comparisonAgent.ts`, `lib/ai/tierClassifier.ts`, `lib/ai/speakerRecommendations.ts`, `lib/ai/speakerAnalysisEvaluation.ts`, `lib/ai/sqlAgent.ts`, `app/api/semesters/compare/route.ts`.

**Google Gemini (legacy, scripts only):**
- Purpose: Offline utilities. Not used by the running Next.js app.
- SDK/Client: `@google/genai` in `scripts/backfill-tiers.ts` and `scripts/agent_orchestrator.ts`.
- Auth: `GEMINI_API_KEY` (or `GOOGLE_API_KEY` in `backfill-tiers.ts`).
- Model: `GEMINI_MODEL`, default `gemini-3.1-flash-lite-preview` in `scripts/backfill-tiers.ts`.

**Payments (Stripe):**
- Purpose: Subscription billing, checkout, customer portal, invoices.
- SDK/Client: `stripe` `^21.0.1`. Single lazy instance from `getStripe()` in `lib/stripe/index.ts`. API version pinned to `2026-03-25.dahlia`.
- Auth: `STRIPE_SECRET_KEY` (server-only).
- Price IDs: `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_ANNUAL` (selected in `app/api/stripe/checkout/route.ts`).
- Routes:
  - `app/api/stripe/checkout/route.ts` - creates Checkout sessions. Redirect origin: request `origin` header, then `NEXT_PUBLIC_SITE_URL`, then `http://localhost:3000`.
  - `app/api/stripe/portal/route.ts` - opens the Stripe Billing Portal. Same origin fallback.
  - `app/api/stripe/invoices/route.ts` - lists invoices for the subscriber.
  - `app/api/stripe/webhook/route.ts` - webhook receiver (see Webhooks & Callbacks).
  - `app/api/subscription/route.ts` - reads subscription state for the app (`lib/db/subscription.ts`).

## Data Storage

**Primary database (Supabase PostgreSQL):**
- Type: PostgreSQL 17 (local, per `supabase/config.toml`). Hosted Supabase project in production.
- Connection (app): Supabase JS clients. There is no direct `pg` connection in app code.
  - Browser: `lib/supabase/client.ts` (anon key, `createBrowserClient`).
  - Server, user-scoped: `lib/supabase/server.ts` (anon key plus request cookies, `createServerClient`).
  - Server, admin: `createAdminClient()` in `lib/supabase/server.ts` (service role key, bypasses RLS). Used by `lib/ai/sqlAgent.ts` and by server-side DB helpers.
  - Middleware: `middleware.ts` builds a Supabase server client to refresh the auth session.
- Connection (scripts and local tooling): `DATABASE_URL` in `.env.example` (`postgresql://postgres:postgres@127.0.0.1:54322/postgres` for local dev). Not referenced in app code.
- Client: `@supabase/supabase-js` and `@supabase/ssr`. The `pg` package is declared but not imported.
- Data access layer: `lib/db/*.ts`, one module per domain (e.g. `lib/db/sessions.ts`, `lib/db/reports.ts`, `lib/db/semesters.ts`, `lib/db/subscription.ts`, `lib/db/systemPrompts.ts`, `lib/db/portfolioShares.ts`, `lib/db/speakerPortals.ts`).
- Main tables (from `.from('<table>')` calls): `sessions`, `student_submissions`, `session_themes`, `session_analyses`, `session_syntheses`, `session_debriefs`, `session_shares`, `session_tier_data`, `semesters`, `semester_reports`, `semester_stories`, `saved_comparisons`, `class_insights`, `student_profiles`, `student_debrief_submissions`, `student_debrief_analyses`, `student_speaker_analysis_submissions`, `student_speaker_analyses`, `speaker_briefs`, `speaker_portals`, `portfolio_shares`, `professor_student_notes`, `custom_system_prompts`, `profiles`.
- Migrations: `supabase/migrations/` (42 files). Apply locally with `supabase start` / `supabase db reset`; apply to production via the Supabase project.

**Analytics SQL execution:**
- `lib/ai/sqlAgent.ts` generates a SELECT with the AI model, then runs it through the Supabase RPC `execute_analytics_query` (`query_text` argument). Results are passed back to the model for a plain-English answer.
- Recent commits moved the analytics agent to be scoped to the requesting user (see `git log`, commit `6101261`).

**File Storage (Supabase Storage):**
- Service: Supabase Storage, bucket `temp-uploads`.
- Client: `lib/supabase/storage.ts` (browser upload via the user's session) and `lib/supabase/storage.server.ts` (server download and delete through the admin client).
- Use: Temporary staging of uploaded ZIP/PDF/DOCX files for processing. Object removed after processing (`admin.storage.from(BUCKET).remove`).
- Storage policies: `supabase/migrations/20260324200902_create_temp_uploads_policies.sql`.

**Caching:**
- None detected. No Redis, Memcached, or Vercel KV client in `package.json` or code.

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (`@supabase/ssr`).
- Implementation:
  - Login page: `app/(auth)/login/page.tsx`, with form in `components/layout/AuthForm.tsx`.
  - Session refresh and route protection: `middleware.ts` (matcher excludes `_next/static`, `_next/image`, `favicon.ico`). Unauthenticated requests redirect to `/login`.
  - Code exchange: `app/api/auth/callback/route.ts` calls `supabase.auth.exchangeCodeForSession(code)`.
  - Redirect allow-list in `supabase/config.toml` (`additional_redirect_urls`): `https://www.mgmt305.com/api/auth/callback`, `http://localhost:3000/api/auth/callback`, `http://localhost:3001/api/auth/callback`.
  - Site URL: `https://www.mgmt305.com`.
- Sign-in methods in code: email and password (`supabase.auth.signInWithPassword`, `supabase.auth.signUp`) and Google OAuth (`supabase.auth.signInWithOAuth`), both in `components/layout/AuthForm.tsx`.
- `supabase/config.toml` has no `[auth.external.*]` provider enabled for local development. Google OAuth therefore depends on the hosted Supabase project's provider settings, which are not tracked in the repo. Confirm in the Supabase dashboard.
- Authorization: Row Level Security policies in `supabase/migrations/`. Server code uses the admin client only where RLS must be bypassed.
- Free-session quota: RPC `decrement_free_session` (called with `adminClient.rpc`).

## Monitoring & Observability

**Error Tracking:**
- None detected. No Sentry, Datadog, or similar SDK in `package.json`.

**Logs:**
- `console.error` and `console.log` calls in route handlers and agents. Stripe webhook errors are logged with `console.error` in `app/api/stripe/webhook/route.ts`.
- Vercel function logs (platform).
- Supabase Analytics is enabled locally (`[analytics]` in `supabase/config.toml`).

## CI/CD & Deployment

**Hosting:**
- Vercel. `vercel.json` sets the Next.js framework, build and install commands, and `maxDuration: 60` for `app/api/process/route.ts`. `.vercel/` is present locally and gitignored.
- Production domain: `https://www.mgmt305.com` (from `supabase/config.toml` `site_url`).

**CI Pipeline:**
- None detected. No `.github/workflows/`, no CircleCI or other pipeline config tracked.

## Environment Configuration

**Required env vars (names only, from `.env.example` and code reads):**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (client and server).
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key (client and server).
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server only, admin client).
- `OPENROUTER_API_KEY` - OpenRouter key (all AI calls).
- `STRIPE_SECRET_KEY` - Stripe secret key.
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret.
- `STRIPE_PRICE_MONTHLY` - Stripe Price ID for monthly plan.
- `STRIPE_PRICE_ANNUAL` - Stripe Price ID for annual plan.

**Optional env vars:**
- `OPENROUTER_MODEL` - Model override.
- `NEXT_PUBLIC_SITE_URL` - Public base URL for Stripe redirects (default `http://localhost:3000`).
- `DATABASE_URL` - Direct Postgres URI (documented in `.env.example`, not read by app code).

**Script-only env vars:**
- `GEMINI_API_KEY`, `GOOGLE_API_KEY`, `GEMINI_MODEL`.

**Secrets location:**
- Local: `.env` and `.env.local` at the repo root. Both are gitignored (`.gitignore` lists `.env`, `.env.local`, `.env*`).
- Production: Vercel project environment variables.
- Stripe and Supabase secrets are managed in their respective dashboards.
- Note: the `.env.local` file is present locally. Its values were not read for this document.

## Webhooks & Callbacks

**Incoming:**
- `POST /api/stripe/webhook` (`app/api/stripe/webhook/route.ts`).
  - Verifies signature with `getStripe().webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)`. Returns 400 on missing or invalid signature.
  - Handled event types:
    - `checkout.session.completed` - activates subscription.
    - `customer.subscription.updated` - updates subscription row.
    - `customer.subscription.deleted` - cancels subscription.
    - `invoice.payment_failed` - payment failure handling.
    - `invoice.paid` - payment success handling.
  - Other event types are acknowledged without a DB write.
- `GET /api/auth/callback` - Supabase Auth redirect target (`app/api/auth/callback/route.ts`).

**Outgoing:**
- None detected. No outbound webhooks to third parties. Outbound HTTP is limited to the OpenRouter and Stripe API calls listed above.

**Public share endpoints (no external caller, token-based access):**
- `app/api/shared/[token]/*`, `app/api/shared/compare/[token]/*`, `app/api/portfolio/[token]/*`, `app/api/speaker/[token]/*`. Data is served from `session_shares`, `saved_comparisons`, `portfolio_shares`, and `speaker_portals`.

---

*Integration audit: 2026-11-18*
