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
```

## Architecture

This is a **Next.js 14 App Router** app for a university professor tool. Professors upload a Canvas ZIP of student question submissions for an upcoming guest speaker; the AI synthesizes them into a moderator-ready interview sheet.

### Core flow

1. Professor uploads `speakerName` + `.zip` to `POST /api/process`
2. `lib/parse/`: ZIP is extracted → each `.pdf`/`.docx` file parsed to text → assembled into a single structured string (student name derived from filename format `FirstName_LastName...`)
3. `lib/ai/`: xAI (Grok) is called via the OpenAI SDK interface with `baseURL` overridden. The system prompt in `lib/ai/prompt.ts` has a strict 10-section output format with tier rankings for question quality.
4. The generated output + metadata is saved to Supabase `sessions` table
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
  api/
    auth/callback/             → Supabase PKCE callback
    process/                   → main ZIP → AI pipeline (POST)
    sessions/                  → list sessions (GET)
    sessions/[id]/             → fetch single session (GET)
    sessions/[id]/download/    → export as PDF or DOCX (?format=pdf|docx)
```

### Library layout

- `lib/supabase/server.ts` — `createClient()` (cookie-based, for authenticated requests) and `createAdminClient()` (service role, bypasses RLS)
- `lib/supabase/client.ts` — browser Supabase client
- `lib/db/` — `users.ts` (`getCurrentUser`) and `sessions.ts` (CRUD wrappers)
- `lib/parse/` — `unzip.ts`, `pdf.ts`, `docx.ts`, `builder.ts` (orchestrates them all)
- `lib/ai/` — `client.ts` (lazy OpenAI-SDK client pointing at xAI), `prompt.ts` (system prompt template with `{{SPEAKER_NAME}}` placeholder)
- `lib/export/` — `pdf.ts` and `docx.ts` for download generation
- `lib/utils/transforms.ts` — `rowToSession` / `rowToSessionSummary` (snake_case DB rows → camelCase types)
- `lib/constants.ts` — `ROUTES`, `BRAND` colors, `APP_NAME`, `AI_CONFIG`, accepted file types

### Database

Single `sessions` table with RLS. Sessions are **immutable** — no UPDATE or DELETE policies exist by design. New professor accounts are created via the Supabase dashboard only; self-signup is disabled at the project level.

### Key conventions

- Path alias `@/` maps to the repo root (`tsconfig.json`)
- All API routes set `export const dynamic = 'force-dynamic'`
- The `(app)` layout also sets `force-dynamic` so auth checks run per-request
- Brand colors live in `lib/constants.ts` (`BRAND.ORANGE`, `BRAND.PURPLE`, `BRAND.GREEN`) — use these instead of hardcoded hex values
- Student name is parsed from filename: `FirstName_LastName...` → displayed as `"FirstName L."`
