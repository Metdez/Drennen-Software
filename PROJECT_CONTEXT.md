# Drennen MGMT 305 — Project Context

## What It Is

A private Next.js 14 web app for university professors. Professors upload a Canvas ZIP of student question submissions for an upcoming guest speaker; the AI (xAI Grok) synthesizes all questions into a structured, moderator-ready interview sheet with 10 themes, ranked questions, and student attribution.

**Not a public product.** New professor accounts are created manually via the Supabase dashboard — self-signup is disabled.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS + CSS custom properties (dark theme) |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth (email/password + Google OAuth) |
| AI | xAI Grok via OpenAI SDK (baseURL override) |
| File Parsing | unzipper, pdf-parse, mammoth |
| PDF Export | @react-pdf/renderer |
| Word Export | docx |
| Hosting | Vercel (60s function timeout for /api/process) |

---

## Core Flow

```
Professor uploads speakerName + .zip
  → POST /api/process
    → Unzip → parse each .pdf/.docx → extract student names from filenames
    → Assemble submissions into single text block
    → xAI Grok: system prompt + student text → 10-section interview sheet
    → Insert session into Supabase
    → Return { sessionId, output }
  → Client stores output in sessionStorage (session_${sessionId})
  → Redirect to /preview?sessionId=X
    → Render markdown output
    → Download as PDF or DOCX
```

**Student name parsing:** Filename format `FirstName_LastName_...` → displayed as `"FirstName L."`

**AI output format:** 10 sections, each with:
- `***N. Theme Title***`
- `**Primary:** question *(StudentName)*`
- `**Backup:** question *(StudentName)*`

Questions are ranked by quality tier: tension > specific experience > strategic insight > generic advice.

---

## File Tree

```
drennen-restore/
│
├── app/                              Next.js App Router pages
│   ├── layout.tsx                    Root layout — Playfair Display + DM Sans fonts, metadata
│   ├── page.tsx                      Root — redirects to /dashboard or /login based on auth
│   ├── globals.css                   Dark theme CSS variables, fadeUp/pulse-glow animations
│   │
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx              Two-panel login page — branding left, AuthForm right
│   │
│   ├── (app)/                        Protected route group — all require authentication
│   │   ├── layout.tsx                App shell with NavHeader; exports force-dynamic
│   │   ├── dashboard/
│   │   │   └── page.tsx              Upload form — SpeakerInput + DropZone + ProcessingView
│   │   ├── preview/
│   │   │   └── page.tsx              Output display — OutputPreview + DownloadButtons
│   │   └── history/
│   │       └── page.tsx              Past sessions list — SessionsTable
│   │
│   └── api/
│       ├── auth/callback/
│       │   └── route.ts              Supabase PKCE OAuth callback → redirects to /dashboard
│       ├── process/
│       │   └── route.ts              POST — main pipeline: ZIP → parse → AI → DB → response
│       └── sessions/
│           ├── route.ts              GET — list all sessions for authenticated user
│           └── [id]/
│               ├── route.ts          GET — fetch single session by ID
│               └── download/
│                   └── route.ts      GET ?format=pdf|docx — generate and stream file
│
├── components/                       All UI components
│   ├── AuthForm.tsx                  Email/password sign-in/sign-up + Google OAuth toggle
│   ├── NavHeader.tsx                 Top nav bar with app name, user email, sign-out
│   ├── SpeakerInput.tsx              Controlled text input for guest speaker name
│   ├── DropZone.tsx                  Drag-and-drop or click-to-browse ZIP file upload
│   ├── ProcessingView.tsx            Animated fake-progress bar during AI generation
│   ├── OutputPreview.tsx             Parses markdown output → styled section/question rows
│   ├── DownloadButtons.tsx           PDF + DOCX download buttons (blob fetch + save)
│   ├── SessionsTable.tsx             Clickable table of past sessions with metadata
│   └── ui/
│       ├── Badge.tsx                 Colored pill badge
│       ├── Button.tsx                Styled button (primary / secondary / ghost variants)
│       ├── Card.tsx                  Dark surface card wrapper
│       └── Spinner.tsx               Animated loading spinner icon
│
├── lib/                              All business logic — no React
│   ├── constants.ts                  ROUTES, BRAND colors, APP_NAME, AI_CONFIG, file types
│   ├── supabase/
│   │   ├── server.ts                 createClient() (cookie auth) + createAdminClient() (service role)
│   │   └── client.ts                 Browser-side Supabase client (singleton)
│   ├── db/
│   │   ├── users.ts                  getCurrentUser() — returns AuthUser or null
│   │   └── sessions.ts               insertSession(), getSessionById(), listSessions()
│   ├── ai/
│   │   ├── client.ts                 Lazy OpenAI SDK client pointed at XAI_BASE_URL
│   │   └── prompt.ts                 System prompt template with {{SPEAKER_NAME}} placeholder
│   ├── parse/
│   │   ├── unzip.ts                  Extract ZIP buffer → array of { name, buffer } entries
│   │   ├── pdf.ts                    Parse PDF buffer → plain text string
│   │   ├── docx.ts                   Parse DOCX buffer → plain text string
│   │   └── builder.ts                Orchestrates unzip/parse; assembles submissions text block
│   ├── export/
│   │   ├── pdf.ts                    Build PDF Buffer from output markdown via @react-pdf/renderer
│   │   └── docx.ts                   Build DOCX Buffer from output markdown via docx library
│   └── utils/
│       ├── transforms.ts             rowToSession() + rowToSessionSummary() (snake → camelCase)
│       └── format.ts                 Date and count formatting helpers
│
├── types/
│   ├── index.ts                      Re-exports all types
│   ├── session.ts                    SessionRow, Session, SessionSummary, CreateSessionInput
│   ├── api.ts                        ProcessResponse, ApiError, DownloadFormat
│   └── user.ts                       AuthUser
│
├── supabase/
│   └── migrations/
│       ├── 20240101000000_initial_schema.sql           sessions table + RLS policies
│       ├── 20240102000000_fix_profiles_insert_policy.sql
│       └── 20240103000000_create_profiles_table.sql    profiles table + auto-create trigger
│
├── middleware.ts                     Auth guard — protects /dashboard, /preview, /history
├── next.config.js                    Next.js config (if present)
├── tailwind.config.ts                Extends with BRAND colors; scans app/, components/
├── tsconfig.json                     Strict mode; @/ alias → repo root
├── vercel.json                       Sets 60s max duration for /api/process function
├── package.json                      Dependencies and npm scripts
├── CLAUDE.md                         Claude Code instructions for this repo
└── README.md
```

---

## Database Schema

### `sessions` table
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID | FK → auth.users (CASCADE delete) |
| speaker_name | TEXT | Guest speaker name entered by professor |
| output | TEXT | Full AI-generated markdown output |
| file_count | INTEGER | Number of student files processed |
| created_at | TIMESTAMPTZ | Auto-set to NOW() |

**RLS:** SELECT and INSERT only (scoped to own user_id). No UPDATE or DELETE — sessions are **immutable by design** (audit trail).

### `profiles` table
| Column | Type |
|---|---|
| id | UUID (FK → auth.users) |
| email | TEXT |

Auto-created on user signup via DB trigger.

---

## Design System

### Brand Colors (`lib/constants.ts`)
```
BRAND.ORANGE  #f36f21   Primary / CTAs / highlights
BRAND.PURPLE  #542785   Secondary
BRAND.GREEN   #0f6b37   Accent / success states
```
Always use `BRAND.*` constants — never hardcode hex values.

### Dark Theme (CSS variables in `globals.css`)
```
--bg                  #0d0d11
--surface             #15151d
--surface-elevated    #1c1c27
--text-primary        #f0ece4
--text-secondary      rgba(240,236,228,0.62)
--text-muted          rgba(240,236,228,0.33)
--border              rgba(240,236,228,0.07)
--border-accent       rgba(240,236,228,0.14)
```

### Typography
- **Headings:** Playfair Display (serif)
- **Body/UI:** DM Sans (sans-serif)

### Animations
- `animate-fade-up` — fadeUp 400ms cubic-bezier, translateY 14px
- `animate-fade-up-delay-1/2/3/4` — staggered 80ms increments
- `pulse-glow` — breathing orange glow on speaker name during processing

---

## Key Conventions

- **Path alias:** `@/` → repo root (set in tsconfig.json)
- **Force dynamic:** All API routes and the `(app)` layout export `export const dynamic = 'force-dynamic'` so auth checks run per-request
- **SessionStorage cache:** After generation, output is stored as `session_${sessionId}` to avoid a redundant round-trip on the preview page
- **Sessions immutable:** No UPDATE/DELETE DB policies exist — this is intentional for auditability
- **No self-signup:** Professors must be created via the Supabase dashboard
- **Error resilience:** PDF/DOCX parse failures return empty string (processing continues for other files)

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=        Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   Supabase public anon key
SUPABASE_SERVICE_ROLE_KEY=       Supabase service role key (admin, server-only)
XAI_API_KEY=                     xAI API key
XAI_BASE_URL=                    Defaults to https://api.x.ai/v1
XAI_MODEL=                       Defaults to grok-4-1-fast-reasoning
```

---

## Local Development

```bash
npm run dev          # Start dev server on localhost:3000
npm run build        # Production build
npm run lint         # ESLint
npm run type-check   # tsc --noEmit (no test runner — this is the check)

supabase start       # Start local Supabase (DB :54322, Studio :54323)
supabase db reset    # Reset and re-run all migrations
supabase db push     # Push migrations to remote
```
