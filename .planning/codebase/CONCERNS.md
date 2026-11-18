---
last_mapped_commit: 61012611b3bbfe57df4d8eb25c37b98b17a2d673
last_mapped_at: 2026-11-18
---
# Codebase Concerns

**Analysis Date:** 2026-11-18

Findings are ordered by severity within each section. Every item lists the file(s) where the issue lives. Line numbers are approximate where given.

## Summary of Priorities

| Priority | Area | Issue |
|----------|------|-------|
| Critical | Billing | Checkout accepts any Stripe `priceId` from the request body |
| Critical | Tenancy | Analytics SQL agent runs LLM-written SQL through a service-role RPC; tenant scoping is a substring check |
| High | Tenancy | `storagePath` is never checked against the caller's folder in three ZIP-processing routes |
| High | Privacy | Public portfolio links expose student AI profiles and submission text by default |
| High | Cost / Billing | Most AI-cost API routes have no server-side subscription gate |
| High | Security | Unescaped `dangerouslySetInnerHTML` renders AI/student-derived text |
| Medium | Ops | No tests, no CI config, no rate limiting, destructive endpoint reachable from production UI |
| Medium | Docs | Provider comments and docs are stale (Gemini / xAI vs. OpenRouter) |
| Medium | Data | Student data is sent to a third-party LLM router with throughput-based provider selection |
| Low | Hygiene | Empty migrations, duplicate table definitions, tracked tooling artifacts, large files |

---

## Security Issues

**Stripe checkout accepts an arbitrary client-supplied price (Critical):**
- Issue: When the request body has no `plan`, the raw `priceId` from the body is used directly as the Stripe line item. Any authenticated user can buy any price that exists in the Stripe account, including discounted, legacy, or test prices.
- Files: `app/api/stripe/checkout/route.ts` (around lines 80-85 and 111: `const priceId = plan ? ... : rawPriceId` and `line_items: [{ price: priceId, quantity: 1 }]`)
- Impact: Pricing bypass. The webhook (`app/api/stripe/webhook/route.ts`) then marks the account `active` for whatever price was purchased.
- Current mitigation: Authentication is required. Nothing validates the price against `STRIPE_PRICE_MONTHLY` / `STRIPE_PRICE_ANNUAL`.
- Recommendations: Remove the `priceId` branch, or allow only an allowlist of the two configured price IDs. Reject anything else with 400.

**`storagePath` ownership is not verified (High):**
- Issue: The client supplies `storagePath` in the request body. The handler downloads that object with the service-role client and deletes it in `finally`. Nothing checks that the path starts with the caller's `user.id` folder. The upload policy (`supabase/migrations/20260324200902_create_temp_uploads_policies.sql`) only restricts uploads, not reads by the server.
- Files: `app/api/process/route.ts` (around lines 115-130), `app/api/sessions/[id]/speaker-analyses/route.ts` (around lines 123-172), `app/api/sessions/[id]/student-debriefs/route.ts` (around lines 152-204), `lib/supabase/storage.server.ts` (`downloadTempZip`, `deleteTempZip`)
- Impact: An authenticated professor who learns another professor's `{userId}/{file}` path can process that ZIP into their own session (reading student submissions) and delete it. Path discovery is hard, but the check is missing entirely.
- Recommendations: Before download, assert `storagePath.startsWith(`${user.id}/`)` and reject `..` or absolute paths. Better, have the server issue a signed upload path bound to the user and session.

**Analytics SQL agent executes LLM-written SQL with service-role rights (Critical):**
- Issue: `lib/ai/sqlAgent.ts` asks a model to write SQL from a free-text question, checks it with a regex (`WRITE_KEYWORDS`, `assertReadOnly`) and a substring check (`sql.includes(userId)`), then runs it through `execute_analytics_query` via `createAdminClient()`. That RPC is `SECURITY DEFINER` and bypasses RLS (`supabase/migrations/20260324000003_analytics_query_fn.sql`). The migration's guard is a leading `select|with` check plus a keyword regex, and the query is wrapped as `(%s) t`.
- Why it matters: The tenant guard is a string match on the UUID. The model can satisfy it while reading other rows (for example with a `UNION` or a join through another table). The service role can also read schemas outside `public`, such as `auth.users`, because the function does not restrict schemas. The code comment already says "string check, not airtight". Recent commit `6101261` scoped the prompt, but enforcement is still in the model's output.
- Files: `lib/ai/sqlAgent.ts` (Step 2 and Step 3 of `runAnalyticsQuery`), `supabase/migrations/20260324000003_analytics_query_fn.sql`, `app/api/analytics/query/route.ts`
- Current mitigation: `getCurrentUser()` gate; `assertReadOnly`; the UUID substring check; SELECT-only prefix in the RPC.
- Recommendations: Stop executing model-written SQL with the service role. Options, in order of preference: (1) run the query as a dedicated read-only database role with RLS enforced and `search_path` restricted to `public`; (2) replace free-form SQL with a fixed set of parameterized query functions that take `user_id` as an argument; (3) at minimum, parse the statement (for example with `pg-query-parser`) and reject any table not in the allowlist or any non-`public` schema reference.

**Public portfolio exposes student AI profiles and submission text (High):**
- Issue: `DEFAULT_PORTFOLIO_CONFIG` sets `includeStudentProfiles: true`. `getPortfolioStudentDetail` then returns each student's submission text and AI growth profile to anyone who has the link. Student names are derived from Canvas filenames. Share links have no expiry and there is no rate limit.
- Files: `types/portfolio.ts` (around line 114), `lib/db/portfolioShares.ts` (around lines 925-1010, `getPortfolioStudentDetail`), `app/api/portfolio/[token]/roster/[studentName]/route.ts`, `app/api/portfolio/[token]/sessions/[sessionId]/route.ts`
- Impact: Education records (student work and evaluative AI profiles) are published to unauthenticated viewers by default. This is a likely FERPA exposure for a university deployment.
- Recommendations: Default `includeStudentProfiles` to `false`. Require explicit opt-in with a warning. Add link expiry and revocation for portfolios, matching the session-share model. Log views.

**Public share tokens have no expiry and no rate limit (Medium):**
- Issue: Tokens are UUID v4 (`gen_random_uuid()`), which is good, but nothing expires and no endpoint is rate-limited. `speaker_portals.share_token` is stable across publish cycles by design (`lib/db/speakerPortals.ts`).
- Files: `supabase/migrations/20260329000000_session_shares.sql`, `supabase/migrations/20260403000002_create_speaker_portals.sql`, `app/api/shared/[token]/route.ts`, `app/api/speaker/[token]/route.ts`, `app/api/portfolio/[token]/route.ts`
- Recommendations: Add an optional `expires_at` column and an edge rate limit (Vercel firewall or middleware) on `/api/shared`, `/api/speaker`, and `/api/portfolio` routes.

**Unescaped HTML rendering (High):**
- Issue: `WhatChangedBanner` renders `c.text` with `dangerouslySetInnerHTML`. The text includes theme titles parsed from AI output, which derives from student-written questions. Only double quotes are transformed, so `<img onerror=...>` in a theme title would execute.
- Files: `components/analytics/WhatChangedBanner.tsx` (around line 193)
- Recommendations: Remove `dangerouslySetInnerHTML`. Build the `<strong>` emphasis with React nodes by splitting on the quote regex. Escape any other content.

**Public and API routes lack ownership checks in several places (Medium):**
- Issue: Middleware (`middleware.ts`) redirects only page routes, and it does not cover `/api/*`. Every API route therefore has to call `getCurrentUser()` itself. Most do. The check is manual and easy to forget in new routes. The protected-route list in `middleware.ts` also omits `/stories`, so `app/(app)/stories/[id]/page.tsx` depends on its API call returning 401 to redirect.
- Files: `middleware.ts`, `app/(app)/stories/[id]/page.tsx`, `app/api/stories/[id]/route.ts`
- Recommendations: Add `/stories` to `isProtectedRoute`. Consider a shared `requireUser()` helper used by every route, plus a lint rule or test that fails when a `route.ts` under `app/api` (outside `shared/`, `speaker/`, `portfolio/`) does not call it.

**`admin/clear` is destructive and reachable from the production UI (Medium):**
- Issue: `POST /api/admin/clear` deletes every session for the caller with the service role. Its header comment says it is "not exposed in the production UI" and "admin only", but there is no admin check, and `ClearDataButton` is rendered on the roster page (`app/(app)/roster/page.tsx` line ~94).
- Files: `app/api/admin/clear/route.ts`, `components/layout/ClearDataButton.tsx`, `app/(app)/roster/page.tsx`
- Impact: Any signed-in professor can wipe their own data with one click. It is scoped to `user_id`, so it does not cross tenants, but it is irreversible and the documentation is wrong.
- Recommendations: Correct the docs, or gate the route and button behind an explicit role or environment flag. Consider soft delete.

**Student data is sent to a third-party LLM router (Medium, governance):**
- Issue: All generation and analysis goes through OpenRouter (`lib/ai/geminiClient.ts`). `OPENROUTER_FAST` sets `provider: { sort: 'throughput' }`, so the upstream provider can change between requests, and each may have different retention and training policies. Submissions contain student names and coursework.
- Files: `lib/ai/geminiClient.ts`, `lib/ai/client.ts`, `lib/ai/sqlAgent.ts`, `lib/parse/builder.ts`
- Recommendations: Pin providers that offer zero data retention, or disable fallback routing for student data. Document the data flow for the institution. Tell professors what leaves the app.

**Secrets handling is acceptable, with one hygiene gap:**
- `.env.example` contains placeholders only, and `.gitignore` excludes `.env*`. Keys are read by name from `process.env` (`OPENROUTER_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `DATABASE_URL`, and others).
- Gap: `scripts/agent_orchestrator.ts` and `scripts/backfill-tiers.ts` require `GEMINI_API_KEY` (and `GEMINI_MODEL`, `GOOGLE_API_KEY`), and these are not in `.env.example`. `DATABASE_URL` in `.env.example` documents a local default credential. Add the script variables to `.env.example` as placeholders.

## Tech Debt

**Stale provider wiring and comments:**
- Issue: The runtime uses OpenRouter through the OpenAI SDK, but comments still describe xAI and Gemini. `lib/ai/client.ts` documents `XAI_API_KEY` and `XAI_BASE_URL`, which the code no longer reads. `app/api/process/route.ts` says "Call xAI Grok". `lib/ai/sqlAgent.ts` header says Gemini. `geminiClient.ts` names a "Gemini-SDK-shaped facade" that is really OpenRouter.
- Files: `lib/ai/client.ts`, `app/api/process/route.ts` (around line 120), `lib/ai/sqlAgent.ts`, `lib/ai/geminiClient.ts`, `lib/ai/CLAUDE.md`
- Impact: Future changes will be made against the wrong provider. Operators will set the wrong env vars.
- Fix approach: Rename `getGeminiClient` / `getGeminiModel` to provider-neutral names, update the comments, and update `lib/ai/CLAUDE.md`.

**Unused or redundant AI SDK dependencies:**
- Issue: `package.json` declares `@google/genai`, `@google/generative-ai`, `@langchain/google-genai`, and `openai`. Runtime code imports only `openai`. The Google SDKs are used only by `scripts/agent_orchestrator.ts` and `scripts/backfill-tiers.ts`. `@langchain/google-genai` has no visible importer in app code.
- Files: `package.json`, `scripts/agent_orchestrator.ts`, `scripts/backfill-tiers.ts`
- Fix approach: Move script-only Google packages to `devDependencies`, or port the scripts to OpenRouter and remove them. Remove `@langchain/google-genai` if nothing imports it.

**Maintenance script writes LLM output into the source tree:**
- Issue: `scripts/agent_orchestrator.ts` sends source files to a model, writes JSDoc into the files through ts-morph (`sf.save()`), and writes `<file>.CLAUDE.md` with `fs.writeFileSync`. There is no review step or diff preview.
- Files: `scripts/agent_orchestrator.ts` (around lines 120-140)
- Fix approach: Write to a staging directory or print a diff. Require `--apply`.

**Very large modules:**
- Issue: Several files exceed 800 lines, which makes review and change risky.
- Files: `lib/export/reportPdf.ts` (1673), `lib/db/portfolioShares.ts` (1128), `lib/ai/reportAgent.ts` (1027), `lib/export/reportDocx.ts` (858), `app/(app)/preview/portal/page.tsx` (785), `app/(app)/preview/page.tsx` (658), `components/debrief/DebriefPanel.tsx` (537), `app/(app)/preview/brief/page.tsx` (536), `components/session/SystemPromptEditor.tsx` (522), `lib/ai/studentProfile.ts` (521)
- Fix approach: Split `portfolioShares.ts` by concern (sessions, roster, reports, analytics). Split the PDF and DOCX report builders into per-section modules.

**Weak typing and unguarded parsing:**
- Issue: About 12 `any` usages appear in `app/`, `lib/`, and `components/`. There are 25 `JSON.parse` calls, and LLM output is parsed in several agents without schema validation.
- Files: grep `: any` / `as any` across `lib/ai/` and `app/api/`; `lib/ai/*.ts` agents that call `JSON.parse` on model output (for example `lib/ai/studentProfile.ts`, `lib/ai/tierClassifier.ts`)
- Fix approach: Validate model output with a schema (zod or a hand-written guard) at the agent boundary and fail with a typed error.

**Repeated AI call boilerplate:**
- Issue: About 20 modules in `lib/ai/` each call `getGeminiClient()` and re-implement prompt building, JSON extraction, and error wrapping.
- Files: `lib/ai/*.ts`
- Fix approach: One `runAgent({ system, user, schema })` helper in `lib/ai/geminiClient.ts`.

## Known Bugs and Logic Risks

**Free-session decrement is check-then-act (Medium):**
- Symptoms: Concurrent `/api/process` (or `/api/sessions/[id]/rerun`) requests can each pass `checkSubscriptionAccess` before any decrement happens, so a user with one free session can generate several.
- Files: `app/api/process/route.ts` (access check around line 100, `decrementFreeSession` around line 150), `lib/db/subscription.ts` (`decrementFreeSession` uses an atomic RPC, but the check is separate)
- Trigger: Two tabs or a double-submit on the upload.
- Workaround: None. Fix by decrementing first inside the RPC and refusing when the result is zero, or by reserving the slot before calling the model.

**`/api/process` may exceed its time budget:**
- Symptoms: Large ZIPs or slow model responses time out, and the professor sees a failure after AI cost has already been incurred.
- Files: `vercel.json` (only `app/api/process/route.ts` has `maxDuration: 60`), `app/api/process/route.ts`
- Trigger: Large batches, or long model latency under `throughput` routing.
- Workaround: Retry. The temp ZIP is deleted in `finally`, so the upload must be repeated.
- Fix approach: Set `maxDuration` for the other long-running AI routes (`reports/generate`, `stories/generate`, `sessions/[id]/synthesis`, `sessions/[id]/theme-analysis`). Move generation to a background job with polling.

**Stripe checkout success redirect depends on the `Origin` header:**
- Symptoms: `success_url` and `return_url` use `request.headers.get('origin')` before `NEXT_PUBLIC_SITE_URL`, and fall back to `http://localhost:3000` if neither exists.
- Files: `app/api/stripe/checkout/route.ts` (around line 106), `app/api/stripe/portal/route.ts` (around line 41)
- Trigger: `NEXT_PUBLIC_SITE_URL` unset in production.
- Fix approach: Prefer `NEXT_PUBLIC_SITE_URL` in production and fail startup if it is missing.

**Student name normalization is spread across modules:**
- Symptoms: Student names are derived from filenames (`FirstName_LastName...`). Migration `20260327000000_fix_student_names_from_filenames.sql` and `20260324300000_normalize_student_name_initials.sql` show this has been corrected twice. Name normalization lives in several places (`lib/parse/builder.ts`, `lib/utils/format.ts`, `lib/constants/validation.ts`).
- Trigger: Canvas exports with unexpected filename shapes (late submissions, extra IDs).
- Workaround: Professors edit names by hand (`professor_student_notes` table).
- Fix approach: One normalization function, used in both parse and display paths, with unit tests.

## Security-Adjacent Data Handling

**ZIP extraction has no size or entry limits (Medium):**
- Risk: `extractZip` loads every entry into memory with `file.buffer()` and does not cap entry count or uncompressed size. A crafted archive can exhaust memory in the serverless function. The 50 MiB bucket limit in `supabase/config.toml` (`file_size_limit`) is a local-dev setting and is not enforced in the app.
- Files: `lib/parse/unzip.ts`, `lib/parse/builder.ts` (`processInChunks` concurrency 5), `app/(app)/dashboard/page.tsx`
- Current mitigation: Only `pdf`, `docx`, `html`, and `htm` entries are kept. Parsing runs with a concurrency of 5.
- Recommendations: Reject archives over a fixed entry count and total uncompressed size before reading. Enforce the upload size in the production Supabase bucket settings.

**Parsers process untrusted documents:**
- Risk: `pdf-parse`, `mammoth`, and `node-html-parser` run on student-uploaded files. These libraries have a history of parser CVEs and unbounded memory use.
- Files: `lib/parse/pdf.ts`, `lib/parse/docx.ts`, `lib/parse/html.ts`, `next.config.mjs` (`serverComponentsExternalPackages`)
- Recommendations: Keep these packages current. Add per-file size and page limits.

**Prompt injection from student content:**
- Risk: Student submissions are placed directly into model prompts (`lib/parse/builder.ts`, `lib/ai/prompt.ts`). A submission can instruct the model to change output, including the theme titles that later reach the unescaped HTML path above.
- Files: `lib/ai/prompt.ts`, `lib/parse/builder.ts`, `lib/ai/sqlAgent.ts`
- Recommendations: Delimit submissions with a fixed envelope and instruct the model to treat them as data. Escape all model output at render time (see the XSS item above).

**Professor-authored custom system prompts are stored and used verbatim:**
- Risk: `lib/db/systemPrompts.ts` and `app/api/system-prompts/` let a professor replace the system prompt. The prompt is then used for every generation for that user. This is self-inflicted rather than cross-tenant, but a bad prompt can silently degrade output.
- Files: `lib/db/systemPrompts.ts`, `app/api/system-prompts/route.ts`, `lib/ai/prompt.ts` (`buildCustomSystemPrompt`)
- Recommendations: Keep the built-in guardrails (output format, no PII echo) appended after the custom text, and show a diff when a professor activates a prompt.

## Cost and Subscription Enforcement

**Most AI-cost routes have no server-side subscription gate (High):**
- Issue: `checkSubscriptionAccess` is enforced only in `/api/process`, `/api/sessions/[id]/rerun`, and `/api/subscription` related paths. The following routes call a model and do not check access:
  - `app/api/reports/generate/route.ts`
  - `app/api/stories/generate/route.ts`
  - `app/api/analytics/query/route.ts`
  - `app/api/analytics/insights/route.ts`
  - `app/api/analytics/recommendations/route.ts`
  - `app/api/compare/analysis/route.ts`
  - `app/api/semesters/compare/route.ts`
  - `app/api/roster/[studentName]/profile/route.ts`
  - `app/api/sessions/[id]/analysis/route.ts`
  - `app/api/sessions/[id]/brief/route.ts`
  - `app/api/sessions/[id]/debrief/complete/route.ts`
  - `app/api/sessions/[id]/portal/route.ts`
  - `app/api/sessions/[id]/synthesis/route.ts`
  - `app/api/sessions/[id]/theme-analysis/route.ts`
  - `app/api/sessions/[id]/speaker-analyses/route.ts`
  - `app/api/sessions/[id]/student-debriefs/route.ts`
  - `app/api/system-prompts/route.ts`
- Impact: A free or expired account can run unlimited model calls against OpenRouter, billed to the operator. Only UI gating prevents this.
- Recommendations: Add one shared gate (for example `requireAiAccess(user.id)`) to every route that calls `lib/ai/*`. Test that expired accounts receive 403.

**Subscription state is only as good as the webhook:**
- Issue: The Stripe webhook is signature-verified (good). `checkout.session.completed` sets `subscriptionStatus: 'active'` without checking the price, which combines with the `priceId` bypass above. Event handling is not idempotent, and there is no record of processed event IDs.
- Files: `app/api/stripe/webhook/route.ts`, `lib/db/subscription.ts`
- Recommendations: Store processed `event.id` values. Derive status from the subscription object and the configured price allowlist.

## Performance Bottlenecks

**Unbounded reads in analytics paths:**
- Problem: Several analytics loaders read every submission across all sessions, with no limit and no pagination.
- Files: `lib/db/studentSubmissions.ts` (around line 205, `supabase.from('student_submissions').select('student_name, session_id')` with no filter when `semesterId` is absent), `lib/db/analytics.ts`, `lib/db/classInsights.ts`, and 26 `select('*')` calls across `lib/db/` (only one `.limit(` in the whole layer)
- Cause: Aggregation happens in Node after fetching all rows. `student_submissions.submission_text` is large, so `select('*')` is expensive.
- Improvement path: Push aggregation into SQL (views or RPCs with `GROUP BY`). Select only the columns each caller needs. Add `.range()` pagination for lists.

**Quadratic lookup in class insights:**
- Problem: In the loop over `studentRows`, each iteration calls `sessions.find(...)`.
- Files: `lib/db/classInsights.ts` (around lines 338-343)
- Cause: Linear search per row.
- Improvement path: Build a `Map` from `sessionId` to session before the loop.

**Spread of very large arrays:**
- Problem: `results.push(...await Promise.all(...))` spreads the chunk into function arguments. With very large batches this can exceed the engine's argument limit.
- Files: `lib/parse/builder.ts` (`processInChunks`, around line 175)
- Improvement path: Use `for (const r of chunkResults) results.push(r)` or pre-allocate the array.

**Sequential AI calls in multi-step pipelines:**
- Problem: `/api/process` runs generation, then tier classification, class insights, session analysis, and student profiles in sequence on the request path, all within a 60-second budget.
- Files: `app/api/process/route.ts` (Steps 7-14), `lib/ai/tierClassifier.ts`, `lib/ai/classInsights.ts`, `lib/ai/generateSessionAnalysis.ts`, `lib/ai/studentProfile.ts`
- Improvement path: Keep only the session row and the generated sheet on the request path. Run the rest as a queued job.

## Fragile Areas

**Admin (service-role) client bypasses RLS across 38 modules:**
- Files: 38 files call `createAdminClient()`, including `lib/db/sessions.ts`, `lib/db/reports.ts`, `lib/db/speakerPortals.ts`, `lib/db/sessionShares.ts`, `lib/db/subscription.ts`, `lib/db/studentProfiles.ts`, `lib/db/classInsights.ts`, `lib/db/themes.ts`, `app/api/shared/compare/[token]/route.ts`
- Why fragile: Access control in these paths depends entirely on each query carrying a correct `user_id` or token filter. One missing `.eq('user_id', ...)` is a cross-tenant read. In `lib/db/studentSubmissions.ts`, `getStudentNamesBySession` uses the admin client and filters only by `session_id`, so it relies on callers passing an owned session ID.
- Safe modification: Add a new query only through an existing helper that takes `userId`. Never pass a client-supplied ID to `createAdminClient()` queries without first resolving ownership.
- Test coverage: None. There are no automated tests for tenant isolation.

**Sessions are "immutable" by convention, not by enforcement:**
- Files: `app/api/process/route.ts` (comment "sessions are IMMUTABLE after this point"), `app/api/admin/clear/route.ts`, `supabase/migrations/20240101000000_initial_schema.sql`
- Why fragile: There is no UPDATE or DELETE policy on `sessions` for regular users, which is correct, but `admin/clear` and `rerun` use the service role to write. Any new admin-client write path can change immutable rows.
- Safe modification: Keep sessions write-once. Add a `status` column or a dedicated `session_versions` table for reruns instead of mutating.

**Migrations are not idempotent or ordered cleanly:**
- Files: `supabase/migrations/20260324000000_create_student_submissions.sql` (plain `CREATE TABLE student_submissions`) and `supabase/migrations/20260324210000_create_student_submissions_table.sql` (`CREATE TABLE IF NOT EXISTS`) both define the same table. `supabase/migrations/20240101000001_create_profiles_early.sql` and `supabase/migrations/20240103000000_create_profiles_table.sql` both define `public.profiles`. `supabase/migrations/20240104000000_remote.sql` and `supabase/migrations/20240105000000_remote.sql` are empty (0 bytes).
- Why fragile: A fresh `supabase db reset` works only because the later files use `IF NOT EXISTS`. Schema drift between local and remote is not verifiable from the repo.
- Safe modification: Run `supabase db reset` on every migration change. Compare remote schema with `supabase db diff` before adding migrations.
- Test coverage: None.

**RLS policy on `profiles` applies to every role:**
- Files: `supabase/migrations/20240102000000_fix_profiles_insert_policy.sql` (`CREATE POLICY "allow_trigger_insert" ... FOR INSERT WITH CHECK (true)` with no `TO` clause)
- Why fragile: Without `TO service_role`, the policy also applies to `anon` and `authenticated`. Inserts are limited by the foreign key to `auth.users`, so exposure is small, but the policy is broader than its comment says.
- Safe modification: Add `TO service_role` (or restrict to the `handle_new_user` trigger's owner) in a new migration.

**Long, handwritten prompts embedded in code:**
- Files: `lib/ai/prompt.ts`, `lib/ai/sqlAgent.ts` (`SCHEMA_CONTEXT`), `lib/ai/*.ts`
- Why fragile: Output format is parsed downstream by regex and heading matching (`lib/parse/parseThemes.ts`, `lib/parse/parseQuestions.ts`). A prompt edit can silently break parsing with no failing test.
- Safe modification: Change the parser and the prompt in the same commit. Add fixture outputs and assert they parse.

**Client-side sessionStorage carries full outputs:**
- Files: 42 `sessionStorage` references in `app/` and `components/`, including the `session_${sessionId}` key described in `CLAUDE.md`
- Why fragile: Output can be stale after a rerun or edit, and sessionStorage is per-tab, so state diverges across tabs.
- Safe modification: Read from the API by `sessionId` and treat sessionStorage as a cache only.

## Scaling Limits

**Single-tenant analytics over full history:**
- Current capacity: Not measured. The data layer loads all submissions and sessions for a professor into memory on each analytics request (see Performance above).
- Limit: Memory and latency grow linearly with total submissions. Vercel function memory and the 60-second process budget are the first limits to hit.
- Scaling path: SQL aggregation, materialized views refreshed on session completion, and paginated APIs.

**Model rate limits and cost:**
- Current capacity: Unknown. Each session triggers several model calls. `OPENROUTER_FAST` uses throughput routing, which can change upstream providers and their quotas between calls.
- Limit: No retry or backoff is visible in `lib/ai/client.ts` (a failure is wrapped and thrown) or in `lib/ai/geminiClient.ts`.
- Scaling path: Add exponential backoff with a cap, a per-user concurrency limit, and a budget alert.

**Object storage for temp ZIPs:**
- Current capacity: Limited by the Supabase bucket setting (documented as 50 MiB in `supabase/config.toml`).
- Limit: Production bucket settings are not in the repo. Large Canvas exports may fail at upload.
- Scaling path: Document the production limit. Use resumable uploads for large files.

## Dependencies at Risk

**Google AI SDKs with overlapping purpose:**
- Risk: Three Google AI packages are declared (`@google/genai`, `@google/generative-ai`, `@langchain/google-genai`). The runtime does not use Gemini directly, so these are maintenance and supply-chain surface.
- Impact: Upgrades can break scripts unexpectedly. Each package adds transitive dependencies.
- Migration plan: Remove unused packages. Keep one SDK for scripts or move scripts to OpenRouter.

**Document parsers:**
- Risk: `pdf-parse` (1.x) is unmaintained upstream. `mammoth` and `unzipper` are on 0.x or 1.x lines with infrequent releases.
- Impact: Untrusted input is parsed by these libraries (see Security-Adjacent above).
- Migration plan: Evaluate `pdfjs-dist` or a maintained wrapper for PDF extraction. Pin versions and add a fuzzing or fixture test for each parser.

**Next.js 14 and React 18:**
- Risk: The project pins Next.js 14 (`package.json`), which is an older major line that may no longer receive all security fixes. `serverComponentsExternalPackages` is the Next 14 config key, which has been renamed in later versions.
- Impact: Security patches may require a major upgrade later.
- Migration plan: Schedule an upgrade to the current Next.js and React major versions. Re-verify middleware and route handlers after the upgrade.

## Missing Critical Features

**No automated tests:**
- Problem: There is no test runner, no `*.test.*` or `*.spec.*` file, and no `__tests__` directory. `CLAUDE.md` states that `npm run type-check` is the only check.
- Blocks: Safe refactoring of parsers, prompts, and tenant-scoped queries. Regressions in billing and access control would not be caught.

**No CI pipeline:**
- Problem: No `.github/workflows`, `.circleci`, or equivalent is tracked. Lint, type-check, and build run only if someone runs them locally.
- Blocks: Enforced checks before merge and before deployment to Vercel.

**No rate limiting or abuse controls:**
- Problem: No rate limiter is present (no Upstash, Vercel firewall config, or middleware counters). AI endpoints and public token endpoints accept unlimited requests.
- Blocks: Protection against cost abuse, token enumeration, and scraping of public portfolios.

**No audit log:**
- Problem: Views of public shares, deletions (`admin/clear`), and subscription changes are not recorded.
- Blocks: Investigating a privacy incident or a billing dispute.

**No data retention or deletion policy in code:**
- Problem: Student submissions and AI profiles persist indefinitely. Deleting a session does not appear to purge its `student_submissions`, `session_themes`, or derived analyses (verify cascades in `supabase/migrations/`).
- Blocks: Compliance with institutional retention rules and student deletion requests.

## Test Coverage Gaps

**Tenant isolation:**
- What's not tested: Every query that uses `createAdminClient()` filters by `user_id` or token. `lib/ai/sqlAgent.ts` restricts results only by a string match.
- Files: `lib/db/*.ts` (especially `sessions.ts`, `reports.ts`, `portfolioShares.ts`, `studentProfiles.ts`), `lib/ai/sqlAgent.ts`
- Risk: A cross-tenant read introduced by a refactor goes unnoticed.
- Priority: High

**Billing and access gating:**
- What's not tested: `checkSubscriptionAccess` branches, the free-session decrement race, the Stripe checkout price selection, and webhook event handling.
- Files: `lib/db/subscription.ts`, `app/api/stripe/checkout/route.ts`, `app/api/stripe/webhook/route.ts`, `app/api/process/route.ts`
- Risk: Revenue leakage (see Security and Cost sections).
- Priority: High

**Upload and parsing pipeline:**
- What's not tested: ZIP extraction, PDF and DOCX text extraction, student-name normalization, and theme parsing from model output.
- Files: `lib/parse/unzip.ts`, `lib/parse/pdf.ts`, `lib/parse/docx.ts`, `lib/parse/builder.ts`, `lib/parse/parseThemes.ts`, `lib/parse/parseQuestions.ts`
- Risk: Silent data loss for a subset of Canvas exports. Fixture files are not in the repo, except `public/mock-questions.zip`.
- Priority: High

**Rendering of AI output:**
- What's not tested: `WhatChangedBanner` and other `dangerouslySetInnerHTML` or markdown-like renderers.
- Files: `components/analytics/WhatChangedBanner.tsx`, `components/session/OutputPreview.tsx`
- Risk: XSS regression (see Security).
- Priority: High

**Export generation:**
- What's not tested: PDF and DOCX builders for sessions, reports, stories, and briefs.
- Files: `lib/export/*.ts`
- Risk: Layout regressions and failed exports after dependency updates.
- Priority: Medium

## Hygiene and Repository Issues

**Tracked tooling artifacts despite `.gitignore`:**
- Issue: `.gitignore` lists `.superpowers/`, but five files under `.superpowers/brainstorm/` are tracked, including a server PID file and preview HTML.
- Files: `.superpowers/brainstorm/936-1774386368/.server.pid`, `.superpowers/brainstorm/936-1774386368/.server-stopped`, `.superpowers/brainstorm/936-1774386368/layout-preview.html`, `.superpowers/brainstorm/936-1774386368/layout-v2.html`, `.superpowers/brainstorm/936-1774386368/layout-v3.html`
- Fix approach: `git rm --cached .superpowers` and commit.

**Test-looking data in the public folder:**
- Issue: `public/mock-questions.zip` is served publicly at `/mock-questions.zip` (linked from `app/(app)/dashboard/page.tsx`). Its entries use Canvas-style names with numeric IDs.
- Files: `public/mock-questions.zip`, `app/(app)/dashboard/page.tsx` (around lines 152 and 272)
- Risk: If any entry corresponds to a real student, this is a disclosure. Confirm the contents are synthetic.
- Fix approach: Replace with a generated set of fictional students, and check the archive into `tests/fixtures/` instead of `public/`.

**Documentation drift risk:**
- Issue: `CLAUDE.md` requires self-maintenance on every change, but several claims are already wrong: the admin clear route is described as not in the production UI (it is on the roster page), and provider names are inconsistent across files.
- Files: `CLAUDE.md`, `app/api/CLAUDE.md`, `lib/ai/CLAUDE.md`, `components/layout/CLAUDE.md`
- Fix approach: Correct the entries listed above and add a check to the review process.

**Empty migration files:**
- Files: `supabase/migrations/20240104000000_remote.sql`, `supabase/migrations/20240105000000_remote.sql` (both 0 bytes)
- Fix approach: Delete them, or document why they exist. Empty migrations can confuse drift checks.

---

*Concerns audit: 2026-11-18*
