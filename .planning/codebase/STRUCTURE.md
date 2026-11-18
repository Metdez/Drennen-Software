---
last_mapped_commit: 61012611b3bbfe57df4d8eb25c37b98b17a2d673
last_mapped_at: 2026-11-18
---
# Codebase Structure

**Analysis Date:** 2026-11-18

## Directory Layout

```
Drennen-Software/
├── app/                     # Next.js App Router: pages, route handlers, layouts
│   ├── (app)/               # Authenticated professor pages (NavHeader layout)
│   ├── (auth)/              # Login page
│   ├── (public)/            # Token-gated public pages (no auth)
│   ├── api/                 # 62 route.ts handlers (JSON API)
│   ├── globals.css
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Redirects to /dashboard or /login
├── components/              # React components grouped by feature
│   ├── analytics/  compare/  debrief/  layout/  portfolio/  report/
│   ├── semester/   session/  speaker/  student/ subscription/  ui/
├── lib/                     # Server and shared logic (no React components)
│   ├── ai/                  # 22 AI clients, prompts and agents
│   ├── constants/           # Barrel index.ts + routes, brand, ai, validation
│   ├── db/                  # 26 Supabase query modules, one per table group
│   ├── export/              # PDF / DOCX / text builders
│   ├── parse/               # ZIP, PDF, DOCX, HTML parsing
│   ├── stripe/              # Stripe SDK singleton
│   ├── supabase/            # Supabase clients and storage helpers
│   └── utils/               # format, transforms, errors
├── types/                   # Domain types; index.ts is the barrel (24 files)
├── supabase/                # Local Supabase config and SQL migrations
│   ├── config.toml
│   └── migrations/          # 42 timestamped .sql files
├── scripts/                 # Standalone tsx scripts (not part of the Next build)
├── docs/                    # Product docs and design specs
├── public/                  # Static assets (mock-questions.zip)
├── middleware.ts            # Edge auth gate (repo root)
├── next.config.mjs  tsconfig.json  tailwind.config.ts  postcss.config.js
├── vercel.json              # Deploy config (maxDuration for process route)
├── .eslintrc.json  package.json  package-lock.json
├── CLAUDE.md  GEMINI.md  README.md   # Agent and human docs (root CLAUDE.md is authoritative)
└── .planning/codebase/      # Generated codebase maps (this document lives here)
```

Generated or local-only directories not tracked in git: `node_modules/`, `.next/`, `.vercel/`, `tsconfig.tsbuildinfo`, `next-env.d.ts`. These are in `.gitignore`.

## Directory Purposes

**`app/(app)/`:**
- Purpose: Protected professor UI. Every page here is wrapped by `app/(app)/layout.tsx`.
- Contains: One `page.tsx` per route; some have sibling `layout.tsx` or nested dynamic segments.
- Key files: `app/(app)/dashboard/page.tsx` (upload), `app/(app)/preview/page.tsx` (tabs for output), `app/(app)/roster/[studentName]/page.tsx`, `app/(app)/semesters/page.tsx`, `app/(app)/account/page.tsx`

**`app/(auth)/`:**
- Purpose: Sign-in only.
- Key files: `app/(auth)/login/page.tsx`

**`app/(public)/`:**
- Purpose: Pages reached through share tokens. No auth.
- Contains: `shared/[token]`, `shared/compare/[token]`, `speaker/[token]`, `portfolio/[token]/...`
- Key files: `app/(public)/layout.tsx`, `app/(public)/portfolio/[token]/layout.tsx`

**`app/api/`:**
- Purpose: JSON endpoints. Each directory maps to a URL segment; `route.ts` exports HTTP verbs.
- Contains: `process/`, `sessions/[id]/...`, `analytics/...`, `compare/...`, `reports/...`, `stories/...`, `roster/...`, `semesters/...`, `portfolio/...`, `shared/...`, `speaker/...`, `stripe/...`, `subscription/`, `system-prompts/...`, `admin/clear/`, `auth/callback/`
- Key files: `app/api/process/route.ts`, `app/api/stripe/webhook/route.ts`, `app/api/auth/callback/route.ts`
- Each directory has its own nested notes in `app/api/CLAUDE.md`, `app/api/sessions/CLAUDE.md`

**`components/`:**
- Purpose: Client components (most are `'use client'`) grouped by feature area. Each feature folder has a `CLAUDE.md`.
- Contains: Feature folders with 1 to 11 components each. `components/ui/` holds primitives (`Badge`, `Button`, `Card`, `Spinner`).
- Key files: `components/layout/NavHeader.tsx`, `components/session/DropZone.tsx`, `components/session/OutputPreview.tsx`, `components/semester/SemesterContext.tsx`, `components/subscription/SubscriptionContext.tsx`

**`lib/ai/`:**
- Purpose: Model clients, the system prompt, and every AI agent.
- Contains: 22 `.ts` files. `geminiClient.ts` is the shared OpenRouter client. `client.ts` is session generation. `prompt.ts` holds the built-in interview-sheet prompt.
- Key files: `lib/ai/geminiClient.ts`, `lib/ai/client.ts`, `lib/ai/prompt.ts`, `lib/ai/sqlAgent.ts`, `lib/ai/reportAgent.ts`

**`lib/db/`:**
- Purpose: The only place that writes Supabase queries (other than `lib/supabase/storage*.ts`).
- Contains: One module per table group, named after the domain (camelCase).
- Key files: `lib/db/sessions.ts`, `lib/db/semesters.ts`, `lib/db/subscription.ts`, `lib/db/users.ts`, `lib/db/systemPrompts.ts`

**`lib/parse/`:**
- Purpose: Turn uploaded Canvas ZIP contents into text and structured question and theme data.
- Key files: `lib/parse/builder.ts` (entry), `lib/parse/unzip.ts`, `lib/parse/parseQuestions.ts`, `lib/parse/parseThemes.ts`

**`lib/export/`:**
- Purpose: Build downloadable documents. Pure transformations from stored content to bytes or text.
- Key files: `lib/export/pdf.ts` (session PDF), `lib/export/docx.ts` (session DOCX), `lib/export/reportPdf.ts`, `lib/export/storyDocx.ts`, `lib/export/briefPdf.ts`

**`lib/supabase/`:**
- Purpose: Create Supabase clients for each context.
- Key files: `lib/supabase/server.ts` (cookie client and admin client), `lib/supabase/client.ts` (browser), `lib/supabase/storage.ts` (browser upload), `lib/supabase/storage.server.ts` (download and delete temp ZIP)

**`lib/constants/`:**
- Purpose: Shared constants. Import through the barrel only.
- Key files: `lib/constants/index.ts` (barrel), `lib/constants/routes.ts` (`ROUTES`), `lib/constants/brand.ts` (`BRAND`, `APP_NAME`), `lib/constants/ai.ts` (`AI_CONFIG`), `lib/constants/validation.ts`

**`lib/utils/`:**
- Purpose: Format helpers, row transforms, and error normalization.
- Key files: `lib/utils/transforms.ts` (`rowToSession()` and similar), `lib/utils/format.ts`, `lib/utils/errors.ts` (`extractErrorMessage()`)

**`lib/stripe/`:**
- Purpose: Lazy Stripe singleton (`getStripe()`).
- Key files: `lib/stripe/index.ts`

**`types/`:**
- Purpose: Shared TypeScript types for API payloads and domain objects.
- Contains: One file per domain (`session.ts`, `semester.ts`, `student_profile.ts`, `speaker_brief.ts`, and others). Some filenames use snake_case, others camelCase (for example `analytics.ts`).
- Key files: `types/index.ts` (barrel, must re-export every new type)

**`supabase/`:**
- Purpose: Schema history, RLS policies, and SQL functions for Supabase.
- Key files: `supabase/config.toml`, `supabase/migrations/20260401000000_create_semesters.sql` (latest semester schema), `supabase/migrations/20260324300000_normalize_student_name_initials.sql`, `supabase/migrations/20260406000000_create_custom_system_prompts.sql`

**`scripts/`:**
- Purpose: One-off Node scripts run with `tsx`.
- Key files: `scripts/backfill-tiers.ts`, `scripts/agent_orchestrator.ts` (ts-morph based; reads `GEMINI_API_KEY`)

**`docs/`:**
- Purpose: Product context and design specs. Not imported by code.
- Key files: `docs/PROJECT.md`, `docs/BUYER_PERSONA.md`, `docs/superpowers/specs/*.md`, `docs/superpowers/plans/*.md`

**`public/`:**
- Key files: `public/mock-questions.zip` (fetched by the dashboard's sample-data action)

## Key File Locations

**Entry Points:**
- `middleware.ts`: Auth gate for all requests
- `app/layout.tsx`: Root HTML shell
- `app/page.tsx`: Root redirect
- `app/(app)/layout.tsx`: Authenticated shell
- `app/api/process/route.ts`: Main generation pipeline

**Configuration:**
- `package.json`: Scripts (`dev`, `build`, `lint`, `type-check`) and dependencies
- `tsconfig.json`: `@/*` path alias to repo root, `strict: true`
- `next.config.mjs`: Next.js config
- `vercel.json`: `maxDuration` for `app/api/process/route.ts`
- `.eslintrc.json`: Lint config (extends `next/core-web-vitals`)
- `tailwind.config.ts`, `postcss.config.js`: Styling
- `.env.example`: Documents required env vars (names only; never copy values from `.env*` files)

**Core Logic:**
- `lib/ai/client.ts`: Session generation
- `lib/ai/geminiClient.ts`: Shared AI client
- `lib/db/sessions.ts`: Session and submission persistence
- `lib/db/subscription.ts`: Access checks and Stripe state
- `lib/parse/builder.ts`: ZIP to text

**Testing:**
- No test directory or test runner is present in the repository. The verification step is `npm run type-check` (`tsc --noEmit`) and `npm run lint`, as stated in root `CLAUDE.md`.

## Naming Conventions

**Files:**
- React components: PascalCase `.tsx`, for example `components/student/RosterTable.tsx`
- Non-component modules: camelCase `.ts`, for example `lib/db/studentProfiles.ts`, `lib/ai/speakerBrief.ts`
- Route handlers: always `route.ts`. Page files: always `page.tsx` or `layout.tsx`.
- Some modules use suffixes: `*.server.ts` for server-only helpers (`lib/supabase/storage.server.ts`)
- Migrations: `YYYYMMDDHHMMSS_snake_case_description.sql`, for example `supabase/migrations/20260403000002_create_speaker_portals.sql`
- Types: mixed. Use the existing style of the neighbouring file.

**Directories:**
- Route segments: lowercase kebab-case (`compare`, `speaker-analyses`, `student-debriefs`). Dynamic segments use brackets: `[id]`, `[token]`, `[studentName]`, `[reportId]`, `[sessionId]`.
- Route groups use parentheses: `(app)`, `(auth)`, `(public)`. They do not appear in URLs.
- Feature component folders: lowercase, mostly singular (`session`, `semester`, `student`, `speaker`). Some are plural (`analytics`, `components/ui`).

**Code identifiers:**
- Functions: camelCase verbs. DB functions: `getX`, `insertX`, `upsertX`, `updateX`, `listX`. AI agents: `generateX`, `runX`, `classifyX`.
- Database: snake_case tables and columns (`session_analyses`, `user_id`). TypeScript: camelCase after `rowToX` transforms.

## Where to Add New Code

**New API endpoint:**
- Handler: `app/api/<feature>/route.ts` (or `app/api/<feature>/[id]/route.ts`). Start with `export const dynamic = 'force-dynamic'`.
- Auth: `getCurrentUser()` from `lib/db/users.ts`, then return 401 if null.
- Register the URL in `lib/constants/routes.ts` (`ROUTES`) and import from `@/lib/constants`.

**New database table or query group:**
- Migration: `supabase/migrations/<timestamp>_<name>.sql` with RLS enabled.
- Query module: `lib/db/<feature>.ts`. Use `createClient()` from `lib/supabase/server.ts` for user-scoped reads.
- Types: `types/<feature>.ts`, re-exported from `types/index.ts`.

**New AI feature:**
- Agent: `lib/ai/<feature>Agent.ts` (or `lib/ai/<feature>.ts`). Import `getGeminiClient()` from `lib/ai/geminiClient.ts`. Do not construct a client in the module.
- Persist the output through a `lib/db/` module. Call it from a route handler.

**New page:**
- Authenticated: `app/(app)/<route>/page.tsx`. Add the path prefix to the list in `middleware.ts` (the list is currently missing `/stories`).
- Public: `app/(public)/<route>/[token]/page.tsx`, with its API in `app/api/<route>/[token]/route.ts`.
- Feature UI: `components/<feature>/<Name>.tsx`. Add a `CLAUDE.md` in that folder when the component introduces a new pattern.

**New export format:**
- `lib/export/<type><Format>.ts`, for example `lib/export/reportPdf.ts`. Register in the matching download route under `app/api/**/download/route.ts`.

**New shared utility:**
- Formatting or transforms: `lib/utils/`
- Brand or constant values: `lib/constants/` (add to the barrel `index.ts`)
- UI primitive: `components/ui/`

**New script:**
- `scripts/<name>.ts`, run with `tsx`. Load env with `dotenv` as `scripts/agent_orchestrator.ts` does.

## Special Directories

**`.planning/codebase/`:**
- Purpose: Generated codebase analysis documents (this file, ARCHITECTURE.md, and the other focus-area outputs)
- Generated: Yes
- Committed: Not stated in the repo. The directory was empty when this map was generated.

**`.next/`:**
- Purpose: Next.js build output and cache
- Generated: Yes
- Committed: No (`.gitignore`)

**`.vercel/`:**
- Purpose: Vercel project link metadata
- Generated: Yes
- Committed: No (`.gitignore`, added in commit `3959d54`)

**`.superpowers/`:**
- Purpose: Local brainstorm artifacts (HTML mockups, server pid files)
- Generated: Yes
- Committed: Listed in `.gitignore`, but a few files are still tracked in git (`.superpowers/brainstorm/...`). Consider `git rm --cached` to match the ignore rule.

**`supabase/.temp/`, `supabase/.branches/`:**
- Purpose: Supabase CLI local state. `supabase/.temp/` contains an env file for the local edge runtime, which must not be read or copied. `supabase/.gitignore` excludes `.branches` and `.temp`.
- Generated: Yes
- Committed: No (`supabase/.gitignore`)

**`node_modules/`:**
- Generated: Yes
- Committed: No

---

*Structure analysis: 2026-11-18*
