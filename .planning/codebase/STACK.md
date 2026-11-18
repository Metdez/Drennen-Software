---
last_mapped_commit: 61012611b3bbfe57df4d8eb25c37b98b17a2d673
last_mapped_at: 2026-11-18
---
# Technology Stack

**Analysis Date:** 2026-11-18

## Languages

**Primary:**
- TypeScript (strict mode) - All application code: `app/`, `lib/`, `components/`, `types/`, `middleware.ts`, `scripts/*.ts`. Config in `tsconfig.json` (`strict: true`, `moduleResolution: bundler`, `paths: { "@/*": ["./*"] }`).
- TSX - React components and App Router pages under `app/` and `components/`.

**Secondary:**
- SQL (PostgreSQL dialect) - Schema and functions in `supabase/migrations/*.sql` (42 migration files, 2024-01 through 2026-04). Includes RPC functions such as `execute_analytics_query`, `decrement_free_session`, `create_custom_system_prompt_version`, `activate_custom_system_prompt_version`, `reset_custom_system_prompts_to_default`.
- CSS - `app/globals.css`, processed by Tailwind via `postcss.config.js`.
- JavaScript - `next.config.mjs`, `postcss.config.js`, `.eslintrc.json`, `tailwind.config.ts` (TypeScript).

## Runtime

**Environment:**
- Node.js (version not pinned in repo: no `.nvmrc`, no `engines` field in `package.json`; `@types/node` is `^20.x`, so target Node 20 for local work).
- Target platform: Vercel serverless functions (`vercel.json` sets `framework: nextjs`, `buildCommand: next build`, `installCommand: npm install`).
- Browser: React 18 client components for dashboards and forms.

**Package Manager:**
- npm
- Lockfile: present (`package-lock.json`, tracked in git)

## Frameworks

**Core:**
- Next.js `14.2.x` (App Router) - Full-stack framework. Pages in `app/**/page.tsx`, route handlers in `app/api/**/route.ts`, root layout in `app/layout.tsx`. Config: `next.config.mjs`.
- React `^18.x` and React DOM `^18.x` - UI rendering (`react`, `react-dom` in `package.json`).
- Tailwind CSS `^3.x` - Styling. Config: `tailwind.config.ts`. Custom brand colors under `theme.extend.colors.brand`: `orange #f36f21`, `purple #542785`, `green #0f6b37`.
- Supabase (`@supabase/ssr`, `@supabase/supabase-js`) - Auth, Postgres, and file storage. See `INTEGRATIONS.md`.

**Data visualization and UI libraries:**
- `recharts` `^3.8.0` - Analytics and report charts (e.g. `components/compare/*`, `components/report/*`).
- `sonner` `^2.0.7` - Toast notifications.

**Document generation and parsing:**
- `@react-pdf/renderer` `^3.x` - PDF export for briefs and reports (`lib/export/pdf.ts`, `lib/export/briefPdf.ts`, `lib/export/reportPdf.ts`, `lib/export/storyPdf.ts`).
- `docx` `^8.x` - Word export (`lib/export/docx.ts`, `lib/export/reportDocx.ts`, `lib/export/storyDocx.ts`).
- `pdf-parse` `^1.1.x` - PDF text extraction for uploads (`lib/parse/pdf.ts`).
- `mammoth` `^1.7.x` - DOCX text extraction (`lib/parse/docx.ts`).
- `unzipper` `^0.12.x` - ZIP upload extraction (`lib/parse/unzip.ts`).
- `node-html-parser` `^7.1.0` - HTML parsing (`lib/parse/html.ts`).

**Testing:**
- Not detected. No test runner (`jest`, `vitest`, `playwright`) is in `package.json` and no test config files are tracked.

**Build/Dev:**
- TypeScript `^5.x` - Type checking (`npm run type-check` runs `tsc --noEmit`).
- ESLint `^8.57.1` with `eslint-config-next` `^14.2.35` - Lint (`.eslintrc.json` extends `next/core-web-vitals`; `npm run lint`).
- PostCSS `^8.x` with Autoprefixer `^10.x` - `postcss.config.js`.
- `tsx` `^4.21.0` - Runs TypeScript scripts directly.
- `ts-morph` `^27.0.2` - AST tooling used by `scripts/agent_orchestrator.ts`.
- `p-limit` `^7.3.0` - Concurrency limiting for scripts.
- `glob` `^13.0.6` - File globbing (dev tooling).
- Supabase CLI - Local stack via `supabase/config.toml` (Postgres major version 17, API port 54321, DB port 54322, Studio port 54323, local SMTP port 54324).

## AI Model Clients

All application AI calls route through OpenRouter's OpenAI-compatible API:
- `openai` `^4.x` - OpenAI SDK, used as the HTTP client with `baseURL: https://openrouter.ai/api/v1`. Singleton in `lib/ai/geminiClient.ts` (`getOpenRouter`).
- Default model: `deepseek/deepseek-v4-flash-0731` (`DEFAULT_MODEL` in `lib/ai/geminiClient.ts`), overridable with `OPENROUTER_MODEL`.
- Shared request options (`OPENROUTER_FAST`): `reasoning: { enabled: false }` and `provider: { sort: 'throughput' }`.
- `lib/ai/geminiClient.ts` exports a Gemini-SDK-shaped facade (`getGeminiClient().models.generateContent`) so agents keep their call shape. Consumers: `lib/ai/analysisAgent.ts`, `reportAgent.ts`, `comparisonAgent.ts`, `tierClassifier.ts`, `speakerRecommendations.ts`, `speakerAnalysisEvaluation.ts`, `sqlAgent.ts`, `app/api/semesters/compare/route.ts`.
- Session generation: `lib/ai/client.ts` calls `generateQuestionSheet` through the same OpenRouter client, with `temperature: 0.3` and `max_tokens: 8000`.

**Legacy and unused-in-app SDKs still in `package.json`:**
- `@google/genai` `^1.46.0` - Used directly only by the standalone scripts `scripts/backfill-tiers.ts` and `scripts/agent_orchestrator.ts` (reads `GEMINI_API_KEY`, `GEMINI_MODEL`).
- `@google/generative-ai` `^0.24.1` - No import found in `app/`, `lib/`, `components/`, or `scripts/`.
- `@langchain/google-genai` `^2.1.26` - No import found in `app/`, `lib/`, `components/`, or `scripts/`.
- `xai` (Grok): `lib/ai/client.ts` header comments still describe an xAI client (`XAI_API_KEY`, `XAI_BASE_URL`). The live code path uses OpenRouter (`getOpenRouter`). Treat those comments as stale.

## Key Dependencies

**Critical:**
- `next` `14.2.x` - Framework; `experimental.serverComponentsExternalPackages` in `next.config.mjs` lists `pdf-parse`, `mammoth`, `unzipper` so they bypass bundling.
- `@supabase/supabase-js` `^2.x` and `@supabase/ssr` `^0.x` - Database, storage, and auth clients. Wrappers in `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/storage.ts`, `lib/supabase/storage.server.ts`.
- `stripe` `^21.0.1` - Subscription billing. Pinned `apiVersion: '2026-03-25.dahlia'` in `lib/stripe/index.ts`.
- `openai` `^4.x` - Transport for OpenRouter calls (see AI Model Clients).
- `pg` `^8.20.0` and `@types/pg` `^8.20.0` - Declared dependency. No `import ... from 'pg'` found in `app/`, `lib/`, or `scripts/`; the analytics SQL agent runs through the Supabase RPC `execute_analytics_query` instead.

**Infrastructure:**
- `@vercel/functions` `^3.4.3` - Declared dependency. No import found in `app/` or `lib/`.
- `dotenv` `^17.4.0` - Loads env files in `scripts/agent_orchestrator.ts`.
- `react-dom` `^18.x` - Rendering (see Frameworks).

**Type packages (dev):**
- `@types/node` `^20.x`, `@types/react` `^18.x`, `@types/react-dom` `^18.x`, `@types/pdf-parse`, `@types/unzipper`, `@types/pg`.

## Configuration

**Environment:**
- Variables are read from `process.env` at runtime. Names are listed in `.env.example`, which is the tracked template. Real values live in local `.env` / `.env.local` files (gitignored) and in the Vercel project settings. Do not copy values into docs or commits.
- Required in app code: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENROUTER_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_ANNUAL`.
- Optional in app code: `OPENROUTER_MODEL` (default `deepseek/deepseek-v4-flash-0731`), `NEXT_PUBLIC_SITE_URL` (default `http://localhost:3000`).
- Scripts only: `GEMINI_API_KEY`, `GOOGLE_API_KEY`, `GEMINI_MODEL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- Listed in `.env.example` but not read by app code: `DATABASE_URL` (direct Postgres URI). Confirm before relying on it.
- Client-exposed variables use the `NEXT_PUBLIC_` prefix (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`). All others are server-only.
- Local `.env` and `.env.local` files exist at the repo root. They are gitignored. Their contents were not read for this document.

**Build:**
- `next.config.mjs` - Next.js config (server external packages only).
- `tsconfig.json` - Strict TypeScript, `incremental: true`, `skipLibCheck: true`, `isolatedModules: true`, `jsx: preserve`.
- `tailwind.config.ts` - Content globs cover `./pages`, `./components`, `./app`. Brand color tokens.
- `postcss.config.js` - Tailwind and Autoprefixer.
- `.eslintrc.json` - `next/core-web-vitals`.
- `vercel.json` - Sets `maxDuration: 60` for `app/api/process/route.ts`. Routes with `export const maxDuration = 60` also exist: `app/api/reports/generate/route.ts`, `app/api/stories/generate/route.ts`.
- `supabase/config.toml` - Local Supabase stack. `site_url` is `https://www.mgmt305.com`. Enabled services: API, DB migrations and seed, Realtime, Studio, local SMTP, Storage (with S3 protocol), Auth, Edge runtime, Analytics.

## Platform Requirements

**Development:**
- Node.js 20 or later (inferred from `@types/node` `^20.x`).
- npm, with `package-lock.json` as the source of truth.
- Docker, for the local Supabase stack (`supabase start`). Local DB at `127.0.0.1:54322`, Postgres 17.
- Local env file populated from `.env.example`.

**Production:**
- Vercel (Next.js framework preset). Analysis and report routes depend on `maxDuration` limits.
- Supabase hosted project (Postgres, Auth, Storage). Production auth redirects go to `https://www.mgmt305.com`.
- Stripe account for live subscription billing.
- OpenRouter API account for all AI calls.

---

*Stack analysis: 2026-11-18*
