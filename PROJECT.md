# MGMT 305 — Project Overview

## What Is This?

A private web tool built for a university professor teaching MGMT 305. Each semester, students submit written questions for an upcoming guest speaker through Canvas. The professor previously had to read through every submission manually before each session. This app automates that: upload the Canvas export ZIP, and AI synthesizes all student questions into a polished, moderator-ready interview sheet in seconds.

**Not a public product.** Only the professor (and any other accounts manually created via Supabase) can log in. Individual sessions can be shared via read-only public links.

---

## Problem It Solves

| Before | After |
|---|---|
| Download ZIP from Canvas, open each file one by one | Upload ZIP directly in the browser |
| Read 20–40 student submissions manually | AI reads everything and groups questions by theme |
| Hand-write interview questions for the speaker session | Download a print-ready PDF or Word doc |
| No record of past sessions or student participation | Full history, roster, and analytics dashboard |
| No insight into individual student engagement patterns | AI-generated student profiles with interests, career direction, and growth trajectory |
| No way to share session results with colleagues | One-click shareable public read-only links |

---

## Core Features

- **Session generation** — Upload a `.zip` of student PDFs/DOCXs + speaker name → AI produces a 10-section interview sheet with ranked questions and student attribution
- **Download** — Export the interview sheet as a formatted PDF or Word document
- **Session sharing** — Generate a public read-only link for any session; recipients see the same 3-tab interface (Questions / Analysis / Insights) and can download exports without needing an account
- **History** — Browse all past sessions; re-view or re-download any session
- **Student Roster** — See every student who has submitted across sessions, with participation rates; click any student to see their full submission history
- **Student Profiles** — Gemini-powered AI analysis of each student across all their submissions. Surfaces interests, predicted career direction, growth trajectory (improving/declining/stable), personality traits, and actionable professor notes. Generated automatically after each session upload.
- **Class Intelligence Report** — Gemini-powered AI analysis generated after every session upload. Surfaces question quality trends, theme evolution across speakers, and top recurring themes.
- **Natural language queries** — Ask plain-English questions about the data ("Which student submitted the most?") and get back AI-generated SQL + a readable answer
- **Session Analysis** — Per-session Gemini analysis accessible from the Preview page (Analysis + Insights tabs). Shows theme clusters with question counts, underlying tensions, interview suggestions, blind spots, and a sentiment breakdown across all student submissions. Results are pre-computed and cached in the database after each session upload.
- **Theme Deep-Dive** — Click any theme cluster on the Analysis tab to open a dedicated page with a Gemini narrative, 3 probe questions, missed angles, and behavioral patterns across that cluster's questions.
- **Analytics Theme Drill-Down** — Click any theme on the Analytics page to view a cross-session analysis: narrative synthesis, emerging patterns, missed angles, and related questions across all sessions containing that theme.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS + CSS custom properties (dark theme) |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth (email/password + Google OAuth) |
| Storage | Supabase Storage (`temp-uploads` bucket for ZIP processing) |
| AI — session generation | xAI Grok (via OpenAI SDK, `baseURL` override) |
| AI — class insights, session analysis, student profiles | Google Gemini (via `@google/genai`) — class analysis, NL queries, session analysis, theme deep-dives, student profiles |
| File parsing | unzipper, pdf-parse, mammoth |
| PDF export | @react-pdf/renderer |
| Word export | docx |
| Charts | recharts |
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
│   ├── (app)/                        All protected routes — require authentication
│   │   ├── layout.tsx                App shell with NavHeader; exports force-dynamic
│   │   ├── dashboard/page.tsx        Upload form — speaker name input + drag-and-drop ZIP
│   │   ├── preview/page.tsx          Tabbed output display: Questions / Analysis / Insights + PDF/DOCX download + ShareButton
│   │   ├── preview/theme/page.tsx    Theme deep-dive — narrative, probe questions, missed angles, patterns
│   │   ├── history/page.tsx          Table of all past sessions; click to re-view
│   │   ├── analytics/page.tsx        AI Class Intelligence Report — narrative banner, theme evolution, top themes
│   │   ├── analytics/theme/
│   │   │   └── [title]/page.tsx      Cross-session theme drill-down — Gemini narrative, patterns, missed angles
│   │   └── roster/
│   │       ├── page.tsx              All students with session participation rates
│   │       └── [studentName]/page.tsx  Per-student profile (AI analysis) + submission history tabs
│   │
│   └── (public)/                     Public routes — no authentication required
│       ├── layout.tsx                Minimal public layout (no NavHeader)
│       └── shared/[token]/page.tsx   Read-only shared session view — same 3-tab interface as /preview
│
├── app/api/
│   ├── auth/callback/route.ts        Supabase PKCE OAuth callback → redirects to /dashboard
│   ├── process/route.ts              POST — main pipeline: ZIP → parse → AI → DB → { sessionId, output }
│   │                                 Also triggers: student profile generation + session analysis caching (fire-and-forget)
│   ├── sessions/route.ts             GET — list all sessions for the authenticated professor
│   ├── sessions/[id]/route.ts        GET — fetch a single session by ID
│   ├── sessions/[id]/download/       GET ?format=pdf|docx — generate and stream export file
│   │   └── route.ts
│   ├── sessions/[id]/analysis/       GET — return cached Gemini session-level analysis (SessionAnalysis JSON)
│   │   └── route.ts
│   ├── sessions/[id]/theme-analysis/ GET ?theme=… — run/return Gemini theme deep-dive (ThemeAnalysis JSON)
│   │   └── route.ts
│   ├── sessions/[id]/share/          GET — check share status; POST — enable sharing; DELETE — revoke sharing
│   │   └── route.ts
│   ├── shared/[token]/route.ts       GET — fetch session by share token (public, no auth required)
│   ├── shared/[token]/analysis/      GET — fetch cached analysis by share token (public)
│   │   └── route.ts
│   ├── shared/[token]/download/      GET ?format=pdf|docx — export shared session (public)
│   │   └── route.ts
│   ├── roster/[studentName]/profile/ GET — fetch or generate Gemini student profile
│   │   └── route.ts
│   ├── analytics/route.ts            GET — aggregated analytics (trends, leaderboard, drop-off)
│   ├── analytics/themes/route.ts     GET — theme frequency aggregated across all sessions
│   ├── analytics/insights/route.ts   GET — saved Gemini class analysis (ClassInsights JSON)
│   ├── analytics/query/route.ts      POST { question } — NL → SQL → answer via Gemini
│   └── admin/clear/route.ts          POST — admin utility to clear data
│
├── components/
│   ├── AuthForm.tsx                  Email/password sign-in form (+ Google OAuth)
│   ├── NavHeader.tsx                 Top nav — app name, nav links, user email, sign-out button
│   ├── SpeakerInput.tsx              Controlled text input for guest speaker name
│   ├── DropZone.tsx                  Drag-and-drop or click-to-browse ZIP file input
│   ├── ProcessingView.tsx            Animated fake-progress bar while AI runs
│   ├── OutputPreview.tsx             Parses AI markdown output → styled section/question rows
│   ├── DownloadButtons.tsx           PDF + DOCX download buttons (blob fetch + save-as)
│   ├── ShareButton.tsx               Toggle public sharing for a session — generates/revokes share link with copy button
│   ├── SessionsTable.tsx             Clickable table of past sessions with metadata
│   ├── RosterTable.tsx               Sortable table of students with participation counts
│   ├── StudentSessionCard.tsx        Card showing one student's submission for a single session
│   ├── StudentDetailTabs.tsx         Tab interface for student detail page — Profile / Submissions tabs
│   ├── StudentProfileTab.tsx         Gemini-powered student profile: interests, career direction, growth, personality, notes
│   ├── ThemeFrequencyPanel.tsx       Bar chart / list of recurring themes across sessions
│   ├── AnalysisPanelLeft.tsx         Preview "Analysis" tab — theme clusters + underlying tensions; clusters link to /preview/theme
│   ├── AnalysisPanelRight.tsx        Preview "Insights" tab — Gemini suggestions, blind spots, student sentiment bars
│   ├── ClearDataButton.tsx           Admin data reset with two-step confirmation
│   └── ui/
│       ├── Badge.tsx                 Colored pill badge (default / success / warning / purple / orange variants)
│       ├── Button.tsx                Styled button (primary / secondary / outline / ghost variants) with loading state
│       ├── Card.tsx                  Dark surface card wrapper with elevation option
│       └── Spinner.tsx               Animated loading spinner
│
├── lib/
│   ├── constants.ts                  ROUTES, BRAND colors, APP_NAME, AI_CONFIG, accepted file types
│   ├── supabase/
│   │   ├── server.ts                 createClient() (cookie auth) + createAdminClient() (service role)
│   │   ├── client.ts                 Browser-side Supabase singleton
│   │   ├── storage.server.ts         downloadTempZip(), deleteTempZip() — server-side Supabase Storage
│   │   └── storage.ts                uploadTempZip() — client-side ZIP upload to temp-uploads bucket
│   ├── db/
│   │   ├── users.ts                  getCurrentUser() — returns AuthUser or null
│   │   ├── sessions.ts               insertSession(), getSessionById(), listSessions(), insertStudentSubmissions(), insertSessionThemes()
│   │   ├── analytics.ts              getAnalytics() — session rows, leaderboard, drop-off
│   │   ├── classInsights.ts          getClassInsights(), upsertClassInsights(), fetchInsightsInput()
│   │   ├── student_submissions.ts    getStudentsWithParticipation(), getStudentDetail(), getSubmissionsBySession()
│   │   ├── themes.ts                 getThemeFrequency(), getRecentThemeTitles()
│   │   ├── sessionAnalyses.ts        getSessionAnalysis(), insertSessionAnalysis() — cached Gemini analysis
│   │   ├── sessionShares.ts          getSessionShare(), enableSessionShare(), revokeSessionShare(), getSessionByShareToken(), getSessionAnalysisByShareToken()
│   │   └── studentProfiles.ts        getStudentProfile(), upsertStudentProfile()
│   ├── ai/
│   │   ├── client.ts                 Lazy OpenAI SDK client → xAI endpoint (session generation)
│   │   ├── prompt.ts                 System prompt template with {{SPEAKER_NAME}} placeholder
│   │   ├── analysisAgent.ts          runSessionAnalysis() + runThemeAnalysis() + runCrossSessionThemeAnalysis() — Gemini analysis
│   │   ├── generateSessionAnalysis.ts  generateAndCacheSessionAnalysis() — runs analysis and persists to DB (fire-and-forget)
│   │   ├── classInsights.ts          generateClassInsights() — Gemini class analysis, triggered after each session
│   │   ├── studentProfile.ts         generateStudentProfile(), generateStudentProfiles() — Gemini per-student analysis (chunked batches of 5)
│   │   └── sqlAgent.ts               Gemini NL→SQL→answer agent; calls execute_analytics_query RPC
│   ├── parse/
│   │   ├── unzip.ts                  Extract ZIP buffer → [{ name, buffer }]
│   │   ├── pdf.ts                    Parse PDF buffer → plain text
│   │   ├── docx.ts                   Parse DOCX buffer → plain text
│   │   ├── builder.ts                Orchestrates unzip+parse; assembles submission block
│   │   └── parseThemes.ts            parseThemesFromOutput(), themesOverlap() — extract and detect overlapping themes
│   ├── export/
│   │   ├── pdf.ts                    Build PDF Buffer from output markdown
│   │   └── docx.ts                   Build DOCX Buffer from output markdown
│   └── utils/
│       ├── transforms.ts             rowToSession() + rowToSessionSummary() (snake → camelCase)
│       └── format.ts                 formatStudentName(), formatDate(), formatFileCount(), slugifySpeakerName()
│
├── types/
│   ├── index.ts                      Re-exports all types
│   ├── session.ts                    SessionRow, Session, SessionSummary, CreateSessionInput, SessionShareRow, SessionShare
│   ├── analytics.ts                  AnalyticsData, SessionAnalyticsRow, LeaderboardEntry, DropoffEntry
│   ├── insights.ts                   ClassInsights, ThemeEvolutionEntry
│   ├── analysis.ts                   SessionAnalysis, ThemeAnalysis, CrossSessionThemeAnalysis, ThemeCluster, ThemeQuestion
│   ├── student_submission.ts         StudentSubmission, StudentSummary, StudentDetail, SessionWithSubmission
│   ├── student_profile.ts            StudentProfile (interests, careerDirection, growthTrajectory, personality, professorNotes)
│   ├── api.ts                        ProcessResponse, ApiError, ApiResult<T>, DownloadFormat, isApiError()
│   └── user.ts                       AuthUser
│
├── supabase/migrations/
│   ├── 20240101000000_initial_schema.sql            sessions table + RLS policies
│   ├── 20240102000000_fix_profiles_insert_policy.sql
│   ├── 20240103000000_create_profiles_table.sql     profiles table + auto-create trigger
│   ├── 20260324000003_analytics_query_fn.sql        execute_analytics_query() SECURITY DEFINER RPC
│   ├── 20260324000004_class_insights.sql            class_insights table (one row per professor)
│   ├── 20260324200902_create_temp_uploads_policies.sql  RLS policies for temp-uploads storage bucket
│   ├── 20260325000000_session_analyses.sql          session_analyses table — cached Gemini analysis per session
│   ├── 20260327000000_fix_student_names_from_filenames.sql  Batch fix for student name parsing from filenames
│   ├── 20260328000000_student_profiles.sql          student_profiles table — AI-generated per-student analysis
│   └── 20260329000000_session_shares.sql            session_shares table — public read-only sharing tokens
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

### `class_insights`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID | FK → auth.users (one row per professor) |
| insights | JSONB | Gemini-generated ClassInsights JSON |
| created_at | TIMESTAMPTZ | |

### `session_analyses`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| session_id | UUID | FK → sessions(id), unique |
| user_id | UUID | FK → auth.users |
| analysis | JSONB | Cached Gemini SessionAnalysis JSON |
| created_at | TIMESTAMPTZ | |

### `student_profiles`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID | FK → auth.users |
| student_name | TEXT | Unique per (user_id, student_name) |
| analysis | JSONB | Gemini-generated StudentProfile JSON (interests, career, growth, personality, notes) |
| session_count | INTEGER | Number of sessions analyzed at generation time |
| updated_at | TIMESTAMPTZ | |

### `session_shares`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| session_id | UUID | FK → sessions(id), unique |
| user_id | UUID | FK → auth.users |
| share_token | UUID | Randomly generated; used in public URL |
| created_at | TIMESTAMPTZ | |

**RLS:** SELECT and INSERT only (scoped to own user_id) on `sessions`. Session analyses, student profiles, and session shares are readable by the owning user; writes go through the service role (admin client). The `execute_analytics_query` RPC runs as SECURITY DEFINER and validates all queries are read-only SELECT before executing. Public shared access uses the admin client to bypass RLS after validating the share token.

---

## AI Architecture

| System | Model | Purpose |
|---|---|---|
| xAI Grok | via OpenAI SDK + `baseURL` override | Session generation — turns raw submissions into the 10-section interview sheet |
| Google Gemini (`classInsights.ts`) | `@google/genai` | Class-level analysis — narrative, theme evolution, quality trend; stored in `class_insights` table; triggered fire-and-forget after each session |
| Google Gemini (`analysisAgent.ts`) | `@google/genai` | Per-session analysis — `runSessionAnalysis()` maps submissions to theme clusters, tensions, suggestions, blind spots, sentiment; `runThemeAnalysis()` does a deep-dive on a single cluster; `runCrossSessionThemeAnalysis()` analyzes a theme across all sessions |
| Google Gemini (`studentProfile.ts`) | `@google/genai` | Per-student analysis — analyzes all submissions across sessions to generate interests, career direction, growth trajectory, personality traits, and professor notes; triggered fire-and-forget after each session for affected students |

Session analysis results are **persisted to the database** in `session_analyses` — pre-computed fire-and-forget during `/api/process`, then served from cache on subsequent requests. Theme deep-dive results are computed on demand and cached client-side in `sessionStorage`.

---

## Post-Upload Pipeline

When `/api/process` completes the main ZIP → AI → DB flow, three fire-and-forget background tasks are triggered:

1. **Class insights regeneration** — `generateClassInsights(userId)` re-analyzes all sessions for the professor
2. **Session analysis caching** — `generateAndCacheSessionAnalysis(sessionId, ...)` pre-computes the Gemini session analysis and stores it in `session_analyses`
3. **Student profile generation** — `generateStudentProfiles(userId, affectedStudents)` generates or updates AI profiles for all students in the uploaded session (chunked in batches of 5)

---

## Preview Page — Tab Structure

The `/preview` page has three tabs:

| Tab | Component | Content |
|---|---|---|
| Questions | `OutputPreview` | Rendered markdown interview sheet + overlapping-themes warning banner |
| Analysis | `AnalysisPanelLeft` | Theme clusters (bar chart, clickable → `/preview/theme`), underlying tensions |
| Insights | `AnalysisPanelRight` | Gemini interview suggestions, blind spots, student sentiment breakdown |

The page also includes a `ShareButton` for generating/revoking public read-only links.

`sessionStorage` keys used on this page:
- `session_${sessionId}` — raw AI output markdown (set by `/api/process`)
- `overlap_${sessionId}` — array of theme titles that appeared in recent sessions
- `analysis_${sessionId}` — `SessionAnalysis` JSON (cached after first fetch)
- `theme_${sessionId}_${encodedTheme}` — `ThemeAnalysis` JSON per theme (cached on the theme page)

---

## Session Sharing

Sessions can be shared via public read-only links. The flow:

1. Professor clicks **Share** on the Preview page → `POST /api/sessions/[id]/share` generates a `share_token` UUID
2. A shareable URL is displayed: `{origin}/shared/{shareToken}` — professor copies it
3. Anyone with the link visits `/shared/[token]` — a public page (no auth required) that renders the same 3-tab interface
4. Public viewers can also download PDF/DOCX exports via `/api/shared/[token]/download`
5. Professor can revoke sharing at any time → `DELETE /api/sessions/[id]/share` removes the token

All public API routes (`/api/shared/[token]/*`) use the admin client to bypass RLS after validating the share token exists.

---

## Design System

**Brand colors** (`lib/constants.ts`):
- `BRAND.ORANGE` `#f36f21` — CTAs, highlights
- `BRAND.PURPLE` `#542785` — secondary
- `BRAND.GREEN` `#0f6b37` — accent / success

**Dark theme** (CSS vars in `globals.css`): `--bg #0d0d11`, `--surface #15151d`, `--text-primary #f0ece4`

**Typography**: Playfair Display (headings) + DM Sans (body/UI)
