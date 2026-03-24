# MGMT 305 — Project Overview

## What Is This?

A private web tool built for a university professor teaching MGMT 305. Each semester, students submit written questions for an upcoming guest speaker through Canvas. The professor previously had to read through every submission manually before each session. This app automates that: upload the Canvas export ZIP, and AI synthesizes all student questions into a polished, moderator-ready interview sheet in seconds.

**Not a public product.** Only the professor (and any other accounts manually created via Supabase) can log in.

---

## Problem It Solves

| Before | After |
|---|---|
| Download ZIP from Canvas, open each file one by one | Upload ZIP directly in the browser |
| Read 20–40 student submissions manually | AI reads everything and groups questions by theme |
| Hand-write interview questions for the speaker session | Download a print-ready PDF or Word doc |
| No record of past sessions or student participation | Full history, roster, and analytics dashboard |

---

## Core Features

- **Session generation** — Upload a `.zip` of student PDFs/DOCXs + speaker name → AI produces a 10-section interview sheet with ranked questions and student attribution
- **Download** — Export the interview sheet as a formatted PDF or Word document
- **History** — Browse all past sessions; re-view or re-download any session
- **Student Roster** — See every student who has submitted across sessions, with participation rates; click any student to see their full submission history
- **Class Intelligence Report** — Gemini-powered AI analysis generated after every session upload. Surfaces question quality trends, theme evolution across speakers, top recurring themes, and a student watchlist. Replaces the old static charts with an AI-first narrative dashboard.
- **Natural language queries** — Ask plain-English questions about the data ("Which student submitted the most?") and get back AI-generated SQL + a readable answer

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS + CSS custom properties (dark theme) |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth (email/password) |
| AI — session generation | xAI Grok (via OpenAI SDK, `baseURL` override) |
| AI — class insights | Google Gemini (via `@google/genai`) — class analysis + NL queries |
| File parsing | unzipper, pdf-parse, mammoth |
| PDF export | @react-pdf/renderer |
| Word export | docx |
| Hosting | Vercel (60 s function timeout for `/api/process`) |

---

## Project File Tree

```
drennen-restore/
│
├── app/                              Next.js App Router
│   ├── layout.tsx                    Root layout — Playfair Display + DM Sans fonts, metadata
│   ├── page.tsx                      Root redirect → /dashboard or /login based on auth state
│   ├── globals.css                   Dark theme CSS variables + fadeUp/pulse-glow animations
│   │
│   ├── (auth)/
│   │   └── login/page.tsx            Two-panel login — branding left, email/password form right
│   │
│   └── (app)/                        All protected routes — require authentication
│       ├── layout.tsx                App shell with NavHeader; exports force-dynamic
│       ├── dashboard/page.tsx        Upload form — speaker name input + drag-and-drop ZIP
│       ├── preview/page.tsx          Output display — rendered markdown + PDF/DOCX download
│       ├── history/page.tsx          Table of all past sessions; click to re-view
│       ├── analytics/page.tsx        AI Class Intelligence Report — narrative banner, theme evolution, participation trend, watchlist
│       └── roster/
│           ├── page.tsx              All students with session participation rates
│           └── [studentName]/page.tsx  Per-student submission history (one card per session)
│
├── app/api/
│   ├── auth/callback/route.ts        Supabase PKCE OAuth callback → redirects to /dashboard
│   ├── process/route.ts              POST — main pipeline: ZIP → parse → AI → DB → { sessionId, output }
│   ├── sessions/route.ts             GET — list all sessions for the authenticated professor
│   ├── sessions/[id]/route.ts        GET — fetch a single session by ID
│   ├── sessions/[id]/download/       GET ?format=pdf|docx — generate and stream export file
│   │   └── route.ts
│   ├── analytics/route.ts            GET — aggregated analytics (trends, leaderboard, drop-off)
│   ├── analytics/themes/route.ts     GET — theme frequency aggregated across all sessions
│   ├── analytics/insights/route.ts   GET — saved Gemini class analysis (ClassInsights JSON)
│   └── analytics/query/route.ts     POST { question } — NL → SQL → answer via Gemini
│
├── components/
│   ├── AuthForm.tsx                  Email/password sign-in form
│   ├── NavHeader.tsx                 Top nav — app name, user email, sign-out button
│   ├── SpeakerInput.tsx              Controlled text input for guest speaker name
│   ├── DropZone.tsx                  Drag-and-drop or click-to-browse ZIP file input
│   ├── ProcessingView.tsx            Animated fake-progress bar while AI runs
│   ├── OutputPreview.tsx             Parses AI markdown output → styled section/question rows
│   ├── DownloadButtons.tsx           PDF + DOCX download buttons (blob fetch + save-as)
│   ├── SessionsTable.tsx             Clickable table of past sessions with metadata
│   ├── RosterTable.tsx               Sortable table of students with participation counts
│   ├── StudentSessionCard.tsx        Card showing one student's submission for a single session
│   ├── ThemeFrequencyPanel.tsx       Bar chart / list of recurring themes across sessions
│   └── ui/
│       ├── Badge.tsx                 Colored pill badge (used for tiers, counts)
│       ├── Button.tsx                Styled button (primary / secondary / ghost variants)
│       ├── Card.tsx                  Dark surface card wrapper
│       └── Spinner.tsx               Animated loading spinner
│
├── lib/
│   ├── constants.ts                  ROUTES, BRAND colors, APP_NAME, AI_CONFIG, accepted file types
│   ├── supabase/
│   │   ├── server.ts                 createClient() (cookie auth) + createAdminClient() (service role)
│   │   └── client.ts                 Browser-side Supabase singleton
│   ├── db/
│   │   ├── users.ts                  getCurrentUser() — returns AuthUser or null
│   │   ├── sessions.ts               insertSession(), getSessionById(), listSessions()
│   │   ├── analytics.ts              getAnalytics() — session rows, leaderboard, drop-off
│   │   ├── classInsights.ts          getClassInsights(), upsertClassInsights(), fetchInsightsInput()
│   │   ├── student_submissions.ts    getStudentsWithParticipation(), getStudentDetail()
│   │   └── themes.ts                 getThemeFrequency(), getRecentThemeTitles()
│   ├── ai/
│   │   ├── client.ts                 Lazy OpenAI SDK client → xAI endpoint (session generation)
│   │   ├── prompt.ts                 System prompt template with {{SPEAKER_NAME}} placeholder
│   │   ├── classInsights.ts          generateClassInsights() — Gemini class analysis, triggered after each session
│   │   └── sqlAgent.ts               Gemini NL→SQL→answer agent; calls execute_analytics_query RPC
│   ├── parse/
│   │   ├── unzip.ts                  Extract ZIP buffer → [{ name, buffer }]
│   │   ├── pdf.ts                    Parse PDF buffer → plain text
│   │   ├── docx.ts                   Parse DOCX buffer → plain text
│   │   └── builder.ts                Orchestrates unzip+parse; assembles submission block
│   ├── export/
│   │   ├── pdf.ts                    Build PDF Buffer from output markdown
│   │   └── docx.ts                   Build DOCX Buffer from output markdown
│   └── utils/
│       ├── transforms.ts             rowToSession() + rowToSessionSummary() (snake → camelCase)
│       └── format.ts                 Date and count formatting helpers
│
├── types/
│   ├── index.ts                      Re-exports all types
│   ├── session.ts                    SessionRow, Session, SessionSummary, CreateSessionInput
│   ├── analytics.ts                  AnalyticsData, SessionAnalyticsRow, LeaderboardEntry, DropoffEntry
│   ├── insights.ts                   ClassInsights, ThemeEvolutionEntry
│   ├── api.ts                        ProcessResponse, ApiError, DownloadFormat
│   └── user.ts                       AuthUser
│
├── supabase/migrations/
│   ├── 20240101000000_initial_schema.sql            sessions table + RLS policies
│   ├── 20240102000000_fix_profiles_insert_policy.sql
│   ├── 20240103000000_create_profiles_table.sql     profiles table + auto-create trigger
│   ├── 20260324000003_analytics_query_fn.sql        execute_analytics_query() SECURITY DEFINER RPC
│   └── 20260324000004_class_insights.sql            class_insights table (one row per professor)
│
├── middleware.ts                     Supabase auth guard — protects /dashboard, /preview, /history, /analytics, /roster
├── tailwind.config.ts                Extends with BRAND colors; scans app/, components/
├── tsconfig.json                     Strict mode; @/ alias → repo root
├── vercel.json                       Sets 60 s max duration for /api/process
└── package.json                      Dependencies and npm scripts
```

---

## Database Schema

### `sessions`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID | FK → auth.users |
| speaker_name | TEXT | Guest speaker name |
| output | TEXT | Full AI-generated markdown |
| file_count | INTEGER | Number of student files processed |
| created_at | TIMESTAMPTZ | Auto-set to NOW() |

### `student_submissions`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| session_id | UUID | FK → sessions(id) |
| student_name | TEXT | "FirstName L." format |
| submission_text | TEXT | Raw text of student's submission |
| filename | TEXT | Original filename from ZIP |
| created_at | TIMESTAMPTZ | |

### `session_themes`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| session_id | UUID | FK → sessions(id) |
| theme_number | INTEGER | 1-based rank within session |
| theme_title | TEXT | e.g. "Leadership Under Pressure" |
| created_at | TIMESTAMPTZ | |

**RLS:** SELECT and INSERT only (scoped to own user_id) on `sessions`. The `execute_analytics_query` RPC runs as SECURITY DEFINER and validates all queries are read-only SELECT before executing.

---

## Design System

**Brand colors** (`lib/constants.ts`):
- `BRAND.ORANGE` `#f36f21` — CTAs, highlights
- `BRAND.PURPLE` `#542785` — secondary
- `BRAND.GREEN` `#0f6b37` — accent / success

**Dark theme** (CSS vars in `globals.css`): `--bg #0d0d11`, `--surface #15151d`, `--text-primary #f0ece4`

**Typography**: Playfair Display (headings) + DM Sans (body/UI)
