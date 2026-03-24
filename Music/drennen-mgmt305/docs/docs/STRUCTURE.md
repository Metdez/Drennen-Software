# STRUCTURE.md — Full Codebase File Tree
# Every file in this project is listed here before it exists.
# Agents do not create files not on this list.
# Agents do not put logic in a file assigned to a different domain.

---

## FULL FILE TREE

```
drennen-mgmt305/
│
├── docs/                          ← ALL planning MD files live here
│   ├── AGENTS.md
│   ├── CLAUDE.md
│   ├── GEMINI.md
│   ├── STRUCTURE.md               ← this file
│   ├── DECISIONS.md
│   ├── SCHEMA.md
│   ├── API.md
│   ├── ENV.md                     ← GITIGNORED — contains real keys
│   ├── TYPES.md
│   ├── PROMPT.md
│   ├── ERRORS.md
│   ├── AGENT-AUTH.md
│   ├── AGENT-UI.md
│   ├── AGENT-FILE.md
│   ├── AGENT-AI.md
│   ├── AGENT-DB.md
│   ├── AGENT-EXPORT.md
│   ├── AGENT-HISTORY.md
│   ├── AGENT-DEPLOY.md
│   └── INTEGRATION.md
│
├── app/                           ← Next.js App Router root
│   ├── layout.tsx                 ← Root layout, brand fonts, metadata
│   ├── globals.css                ← Tailwind base + brand CSS variables
│   ├── page.tsx                   ← Root redirect → /dashboard or /login
│   │
│   ├── (auth)/                    ← Auth route group (no shared layout)
│   │   └── login/
│   │       └── page.tsx           ← Login page: Google OAuth + email/password
│   │
│   ├── (app)/                     ← Protected route group (requires session)
│   │   ├── layout.tsx             ← Shared app layout with nav header
│   │   ├── dashboard/
│   │   │   └── page.tsx           ← Main upload page: speaker name + ZIP drop
│   │   ├── preview/
│   │   │   └── page.tsx           ← AI output preview + download buttons
│   │   └── history/
│   │       └── page.tsx           ← Past sessions table
│   │
│   └── api/                       ← All API routes (server-side only)
│       ├── auth/
│       │   └── callback/
│       │       └── route.ts       ← Supabase OAuth callback handler
│       ├── process/
│       │   └── route.ts           ← POST: receives ZIP + speaker name, orchestrates full pipeline
│       ├── sessions/
│       │   └── route.ts           ← GET: list all sessions for authed user
│       └── sessions/
│           └── [id]/
│               └── route.ts       ← GET: fetch single session by ID
│
├── components/                    ← Pure UI components, no business logic
│   ├── ui/                        ← Primitives
│   │   ├── Button.tsx             ← Brand-styled button variants
│   │   ├── Card.tsx               ← Container card component
│   │   ├── Badge.tsx              ← Status badge
│   │   └── Spinner.tsx            ← Loading spinner
│   ├── DropZone.tsx               ← Drag-and-drop ZIP upload component
│   ├── SpeakerInput.tsx           ← Controlled text input for speaker name
│   ├── OutputPreview.tsx          ← Renders AI output as formatted HTML
│   ├── DownloadButtons.tsx        ← PDF and Word download trigger buttons
│   ├── SessionsTable.tsx          ← History page data table
│   ├── NavHeader.tsx              ← Top nav with logo + logout
│   └── AuthForm.tsx               ← Login form (email/password + Google button)
│
├── lib/                           ← All business logic
│   │
│   ├── supabase/                  ← Supabase client helpers
│   │   ├── client.ts              ← Browser-side Supabase client (use client)
│   │   └── server.ts              ← Server-side Supabase client (uses cookies)
│   │
│   ├── db/                        ← Database query functions (server-side only)
│   │   ├── sessions.ts            ← insertSession, getSessionById, getSessionsByUser
│   │   └── users.ts               ← getUserById (thin wrapper, mostly auth handles this)
│   │
│   ├── parse/                     ← File processing pipeline (server-side only)
│   │   ├── unzip.ts               ← Accepts ZIP buffer → array of {filename, buffer}
│   │   ├── pdf.ts                 ← Accepts PDF buffer → extracted text string
│   │   ├── docx.ts                ← Accepts DOCX buffer → extracted text string
│   │   └── builder.ts             ← Combines parsed files → single formatted string with student attribution
│   │
│   ├── ai/                        ← xAI integration (server-side only)
│   │   ├── client.ts              ← xAI API client, uses XAI_API_KEY env var
│   │   └── prompt.ts              ← System prompt template + injectSpeakerName(name) fn
│   │
│   ├── export/                    ← Document generation (server-side only)
│   │   ├── pdf.ts                 ← generatePDF(output: string) → Buffer
│   │   └── docx.ts                ← generateDocx(output: string) → Buffer
│   │
│   └── constants.ts               ← App-wide constants: route names, config values
│
├── types/                         ← All shared TypeScript interfaces
│   ├── index.ts                   ← Re-exports everything
│   ├── session.ts                 ← Session, SessionRow, CreateSessionInput
│   ├── api.ts                     ← Request/response shapes for all API routes
│   └── user.ts                    ← User, AuthUser
│
├── middleware.ts                  ← Next.js middleware: protects (app) routes, redirects
│
├── .env.local                     ← Local env vars (gitignored — see ENV.md for values)
├── .env.example                   ← Safe example with placeholder values (committed)
├── .gitignore                     ← Includes .env.local and docs/ENV.md
├── next.config.ts                 ← Next.js config
├── tailwind.config.ts             ← Tailwind config with brand color tokens
├── tsconfig.json                  ← TypeScript strict config
├── package.json                   ← Dependencies (canonical list below)
├── vercel.json                    ← Vercel deployment config
└── README.md                      ← Setup and deployment instructions
```

---

## FILE OWNERSHIP BY AGENT

| Agent | Files They Own (and ONLY these) |
|---|---|
| Agent 01 Scaffold | `package.json` `tsconfig.json` `next.config.ts` `tailwind.config.ts` `.gitignore` `.env.example` |
| Agent 02 Types + Utils | `types/` (all files) `lib/constants.ts` |
| Agent 03 Supabase Setup | `supabase/migrations/` (SQL only) |
| Agent 04 Design System | `app/globals.css` `components/ui/` (all 4 primitives) |
| Agent 05 Auth | `lib/supabase/client.ts` `lib/supabase/server.ts` `middleware.ts` `app/(auth)/login/page.tsx` `components/AuthForm.tsx` `app/api/auth/callback/route.ts` |
| Agent 06 DB | `lib/db/sessions.ts` `lib/db/users.ts` |
| Agent 07 File Parsing | `lib/parse/unzip.ts` `lib/parse/pdf.ts` `lib/parse/docx.ts` `lib/parse/builder.ts` |
| Agent 08 AI | `lib/ai/client.ts` `lib/ai/prompt.ts` |
| Agent 09 Export | `lib/export/pdf.ts` `lib/export/docx.ts` |
| Agent 10 API Routes | `app/api/process/route.ts` `app/api/sessions/route.ts` `app/api/sessions/[id]/route.ts` `app/page.tsx` |
| Agent 11 Main UI | `app/(app)/layout.tsx` `app/(app)/dashboard/page.tsx` `app/(app)/preview/page.tsx` `components/DropZone.tsx` `components/SpeakerInput.tsx` `components/OutputPreview.tsx` `components/DownloadButtons.tsx` `components/NavHeader.tsx` `app/layout.tsx` |
| Agent 12 History + Deploy | `app/(app)/history/page.tsx` `components/SessionsTable.tsx` `vercel.json` `README.md` |

---

## CANONICAL PACKAGE.JSON DEPENDENCIES

Agent 01 installs exactly these. No other agent adds packages without checking this list first.

```json
{
  "dependencies": {
    "next": "14.2.x",
    "@supabase/supabase-js": "^2.x",
    "@supabase/ssr": "^0.x",
    "unzipper": "^0.12.x",
    "pdf-parse": "^1.1.x",
    "mammoth": "^1.7.x",
    "@react-pdf/renderer": "^3.x",
    "docx": "^8.x",
    "openai": "^4.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "@types/node": "^20.x",
    "@types/react": "^18.x",
    "@types/react-dom": "^18.x",
    "@types/unzipper": "^0.10.x",
    "@types/pdf-parse": "^1.1.x",
    "tailwindcss": "^3.x",
    "autoprefixer": "^10.x",
    "postcss": "^8.x"
  }
}
```

Note: xAI uses an OpenAI-compatible API so we use the `openai` SDK pointed at the xAI base URL.

---

## WHAT DOES NOT BELONG IN EACH LAYER

| Location | Never put here |
|---|---|
| `components/` | API calls, database queries, business logic, env var access |
| `types/` | Functions, constants, implementation code |
| `lib/db/` | HTTP request/response handling, file parsing logic |
| `lib/parse/` | Database calls, AI calls, HTTP handling |
| `lib/ai/` | File parsing, database calls, HTTP handling |
| `lib/export/` | AI calls, database calls, parsing |
| `app/api/` | Business logic (it calls lib/ functions, never reimplements them) |
| `app/(app)/` pages | Direct database queries (goes through API routes) |
