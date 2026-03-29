# MGMT 305 — Project Overview

## What Is This?

A private web tool built for a university professor teaching MGMT 305. Each semester, students submit written questions for an upcoming guest speaker through Canvas. The professor previously had to read through every submission manually before each session. This app automates that: upload the Canvas export ZIP, and AI synthesizes all student questions into a polished, moderator-ready interview sheet in seconds.

**Not a public product.** Only the professor (and any other accounts manually created via Supabase) can log in. Individual sessions can be shared via read-only public links. Professors can also publish a teaching portfolio or generate a speaker preparation portal — both accessible via token-based public URLs.

---

## Problem It Solves

| Before | After |
|---|---|
| Download ZIP from Canvas, open each file one by one | Upload ZIP directly in the browser |
| Read 20–40 student submissions manually | AI reads everything and groups questions by theme |
| Hand-write interview questions for the speaker session | Download a print-ready PDF or Word doc |
| No record of past sessions or student participation | Full history, roster, and analytics dashboard |
| No insight into individual student engagement patterns | AI-generated student profiles with interests, career direction, growth intelligence, and professor notes |
| No way to share session results with colleagues | One-click shareable public read-only links |
| No preparation material for guest speakers | AI-generated speaker portals with personalized briefing |
| No way to capture post-session student reflections | Upload debrief reflections and speaker analysis essays for AI analysis |
| No cross-data synthesis across pre/post session work | Session synthesis cross-references questions, reflections, and analyses |
| No semester-level narrative or storytelling | AI-generated magazine-style semester stories exportable as PDF/DOCX |
| No public teaching portfolio | Shareable portfolio page with configurable scope |

---

## Core Features

- **Session generation** — Upload a `.zip` of student PDFs/DOCXs + speaker name → AI produces a 10-section interview sheet with ranked questions and student attribution
- **Download** — Export the interview sheet as a formatted PDF or Word document
- **Session sharing** — Generate a public read-only link for any session; recipients see the same 3-tab interface (Questions / Analysis / Insights) and can download exports without needing an account
- **History** — Browse all past sessions; re-view or re-download any session
- **Student Roster** — See every student who has submitted across sessions, with participation rates and growth signals; click any student to see their full profile
- **Student Profiles** — Gemini-powered AI analysis of each student across all their submissions. Surfaces interests, predicted career direction, growth intelligence (thinking arc, theme evolution, critical thinking, engagement pattern), personality traits, and actionable professor notes. Generated automatically after each session upload.
- **Growth Intelligence** — Tracks intellectual growth trajectory across sessions with per-session snapshots (thinking phase, engagement, themes), AI recommendations, and semester highlights
- **Professor Notes** — Private per-student notes that survive AI profile regeneration, with follow-up flagging
- **Class Intelligence Report** — Gemini-powered AI analysis generated after every session upload. Surfaces question quality trends, theme evolution across speakers, and top recurring themes.
- **Natural language queries** — Ask plain-English questions about the data ("Which student submitted the most?") and get back AI-generated SQL + a readable answer
- **Session Analysis** — Per-session Gemini analysis accessible from the Preview page (Analysis + Insights tabs). Shows theme clusters with question counts, underlying tensions, interview suggestions, blind spots, and a sentiment breakdown across all student submissions. Results are pre-computed and cached in the database after each session upload.
- **Theme Deep-Dive** — Click any theme cluster on the Analysis tab to open a dedicated page with a Gemini narrative, 3 probe questions, missed angles, and behavioral patterns across that cluster's questions.
- **Analytics Theme Drill-Down** — Click any theme on the Analytics page to view a cross-session analysis: narrative synthesis, emerging patterns, missed angles, and related questions across all sessions containing that theme.
- **Speaker Portal** — AI-generated preparation page for guest speakers with personalized welcome, student interest summary, talking points, audience profile with sentiment breakdown, and past speaker insights. Professor can edit sections before publishing. Post-session feedback section appears automatically after debrief completion.
- **Student Debrief Reflections** — Upload a ZIP of post-session reflection essays. AI analyzes themes, key moments, surprises, career connections, and sentiment.
- **Student Speaker Analysis Evaluations** — Upload a ZIP of formal analytical essays evaluating the speaker. AI surfaces leadership qualities, course concept connections, agreement/disagreement patterns, and analytical sophistication levels.
- **Session Synthesis** — Cross-references pre-session questions with post-session reflections and speaker analyses. Shows curiosity resolution, theme evolution, tone shifts, emergent themes, and data gaps.
- **Semester Stories** — AI-generated magazine-style long-form narratives about an entire semester, drawing on all sessions, themes, engagement data, and reflections. Exportable as PDF or DOCX.
- **Teaching Portfolio** — Public shareable teaching portfolio page with configurable scope (all semesters or one). Shows sessions, analytics, student roster, and reports via a token-based URL.
- **Speaker Recommendations** — AI-powered "what speaker should I bring next?" analysis based on session history, debrief ratings, student reflections, and engagement patterns.
- **Semester Management** — Create, archive, and manage semesters. Assign sessions to semesters. Compare cohorts across semesters.
- **Subscription & Billing** — Stripe-powered subscription with free trial, monthly ($25/mo) and annual ($240/yr) plans. Paywall modal, subscription banner, and account management page.

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
| AI — analysis, profiles, synthesis, stories, portals, recommendations | Google Gemini (via `@google/genai`) |
| File parsing | unzipper, pdf-parse, mammoth |
| PDF export | @react-pdf/renderer |
| Word export | docx |
| Charts | recharts |
| Payments | Stripe (subscriptions, webhooks, billing portal) |
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
│   │   ├── layout.tsx                App shell with NavHeader + SubscriptionBanner; exports force-dynamic
│   │   ├── dashboard/page.tsx        Upload form — speaker name input + drag-and-drop ZIP
│   │   ├── preview/page.tsx          Tabbed output display: Questions / Analysis / Insights / Debrief + PDF/DOCX download + ShareButton
│   │   ├── preview/theme/page.tsx    Theme deep-dive — narrative, probe questions, missed angles, patterns
│   │   ├── preview/portal/page.tsx   Speaker portal editor — edit sections inline before publishing
│   │   ├── history/page.tsx          Table of all past sessions; click to re-view
│   │   ├── analytics/page.tsx        AI Class Intelligence Report — narrative banner, theme evolution, top themes
│   │   ├── analytics/theme/
│   │   │   └── [title]/page.tsx      Cross-session theme drill-down — Gemini narrative, patterns, missed angles
│   │   ├── roster/
│   │   │   ├── page.tsx              All students with session participation rates + growth signals
│   │   │   └── [studentName]/page.tsx  Per-student profile (AI analysis) + Growth + Submissions tabs
│   │   ├── compare/page.tsx          Semester cohort comparison view
│   │   ├── analytics/compare/page.tsx  Analytics-level comparison view
│   │   ├── reports/[id]/page.tsx     Individual semester report view
│   │   ├── semesters/page.tsx        Semester management — create, archive, assign sessions, generate stories
│   │   ├── stories/[id]/page.tsx     Semester story viewer/editor
│   │   └── account/page.tsx          Subscription management, billing, portfolio sharing
│   │
│   ├── (public)/                     Public routes — no authentication required
│   │   ├── layout.tsx                Minimal public layout (no NavHeader)
│   │   ├── shared/[token]/page.tsx   Read-only shared session view — same 3-tab interface as /preview
│   │   ├── shared/compare/[token]/page.tsx  Public shared semester comparison view
│   │   ├── speaker/[token]/page.tsx  Speaker-facing portal — personalized briefing + post-session feedback
│   │   └── portfolio/[token]/        Teaching portfolio — sessions, analytics, roster, reports
│   │       ├── page.tsx              Portfolio landing page
│   │       ├── sessions/             Session list and detail views
│   │       ├── analytics/            Analytics view
│   │       ├── roster/               Student roster and profiles
│   │       └── reports/              Semester reports
│   │
│   └── api/
│       ├── auth/callback/route.ts        Supabase PKCE OAuth callback → redirects to /dashboard
│       ├── process/route.ts              POST — main pipeline: ZIP → parse → AI → DB → { sessionId, output }
│       │                                 Also triggers: student profile generation + session analysis caching (fire-and-forget)
│       ├── sessions/route.ts             GET — list all sessions for the authenticated professor
│       ├── sessions/[id]/route.ts        GET — fetch a single session by ID
│       ├── sessions/[id]/download/route.ts       GET ?format=pdf|docx — generate and stream export file
│       ├── sessions/[id]/analysis/route.ts       GET — return cached Gemini session-level analysis
│       ├── sessions/[id]/theme-analysis/route.ts GET ?theme=… — run/return Gemini theme deep-dive
│       ├── sessions/[id]/share/route.ts          GET/POST/DELETE — manage session sharing
│       ├── sessions/[id]/debrief/route.ts        GET/POST — get/save session debrief
│       ├── sessions/[id]/debrief/complete/route.ts POST — mark debrief complete + AI summary
│       ├── sessions/[id]/portal/route.ts         GET/POST — fetch or generate speaker portal
│       ├── sessions/[id]/student-debriefs/route.ts GET/POST — upload & analyze student reflections
│       ├── sessions/[id]/speaker-analyses/route.ts GET/POST — upload & analyze speaker evaluation essays
│       ├── sessions/[id]/synthesis/route.ts      GET/POST — cross-data session synthesis
│       ├── shared/[token]/route.ts       GET — fetch session by share token (public)
│       ├── shared/[token]/analysis/route.ts      GET — fetch cached analysis by share token (public)
│       ├── shared/[token]/download/route.ts      GET ?format=pdf|docx — export shared session (public)
│       ├── shared/compare/[token]/route.ts       GET — fetch shared semester comparison by token (public)
│       ├── speaker/[token]/route.ts      GET — public speaker portal by token
│       ├── roster/route.ts               GET — student roster with participation + growth signals
│       ├── roster/[studentName]/profile/route.ts GET — fetch or generate student profile
│       ├── roster/[studentName]/notes/route.ts   GET/POST/DELETE — professor notes per student
│       ├── analytics/route.ts            GET — aggregated analytics (trends, leaderboard, drop-off)
│       ├── analytics/themes/route.ts     GET — theme frequency aggregated across all sessions
│       ├── analytics/insights/route.ts   GET — saved Gemini class analysis
│       ├── analytics/query/route.ts      POST { question } — NL → SQL → answer via Gemini
│       ├── analytics/recommendations/route.ts GET — AI speaker recommendations
│       ├── portfolio/route.ts            GET/POST — manage portfolio share settings
│       ├── portfolio/[token]/...         Public portfolio endpoints (sessions, analytics, roster, reports)
│       ├── stories/generate/route.ts     POST — generate semester story
│       ├── stories/[id]/route.ts         GET/PATCH — fetch/update story
│       ├── stories/[id]/download/route.ts GET ?format=pdf|docx — export story
│       ├── reports/generate/route.ts     POST — generate semester report
│       ├── reports/[id]/route.ts         GET — fetch a single report
│       ├── reports/[id]/download/route.ts GET ?format=pdf|docx — export report
│       ├── semesters/route.ts            GET/POST — list/create semesters
│       ├── semesters/[id]/route.ts       PATCH — update semester
│       ├── semesters/assign/route.ts     POST — assign sessions to semester
│       ├── semesters/compare/route.ts    GET — cohort comparison across semesters
│       ├── subscription/route.ts         GET — current user's subscription access status
│       ├── stripe/checkout/route.ts      POST — create Stripe Checkout session
│       ├── stripe/webhook/route.ts       POST — handle Stripe webhook events
│       ├── stripe/portal/route.ts        POST — create Stripe Billing Portal session
│       ├── stripe/invoices/route.ts      GET — list user's Stripe invoices
│       └── admin/clear/route.ts          POST — admin utility to clear data
│
├── components/
│   ├── session/                      Session-related components
│   ├── analytics/                    Analytics & synthesis components
│   │   └── SynthesisPanel.tsx        Cross-data session synthesis view
│   ├── student/                      Student profile & growth components
│   │   ├── GrowthIntelligencePanel.tsx  Thinking arc, theme evolution, engagement, snapshots
│   │   ├── StudentGrowthTab.tsx      Growth intelligence + professor notes
│   │   ├── ProfessorNotesEditor.tsx  Private per-student notes with follow-up flags
│   │   └── StudentDetailTabs.tsx     Profile / Growth / Submissions tabs
│   ├── speaker/                      Speaker portal components
│   │   ├── GeneratePortalButton.tsx  Generate or navigate to speaker portal
│   │   ├── SpeakerAnalysisPanel.tsx  Rendered speaker analysis evaluation results
│   │   ├── SpeakerAnalysisUploadZone.tsx Drag-drop ZIP for speaker analysis essays
│   │   ├── StudentDebriefUploadZone.tsx  Drag-drop ZIP for debrief reflections
│   │   └── StudentReflectionsPanel.tsx   Rendered debrief reflection results
│   ├── debrief/                      Post-session debrief components
│   ├── semester/                     Semester management components
│   ├── subscription/                 Subscription & billing components
│   │   ├── PaywallModal.tsx          In-app upgrade modal
│   │   └── SubscriptionBanner.tsx    Trial/expired state banner
│   ├── layout/                       Layout components
│   │   ├── NavHeader.tsx             Top nav — links, user email, sign-out
│   │   └── PortfolioSharePanel.tsx   Portfolio configuration & sharing
│   ├── report/                       Report components
│   ├── compare/                      Semester comparison components
│   ├── portfolio/                    Public portfolio page components
│   ├── AuthForm.tsx                  Email/password sign-in form (+ Google OAuth)
│   ├── RosterTable.tsx               Sortable table with growth signals + follow-up flags
│   └── ui/
│       ├── Badge.tsx                 Colored pill badge (default / success / warning / purple / orange)
│       ├── Button.tsx                Styled button with loading state
│       ├── Card.tsx                  Dark surface card wrapper
│       └── Spinner.tsx               Animated loading spinner
│
├── lib/
│   ├── constants/                    Split into modules (was a single file)
│   │   ├── routes.ts                 ROUTES object
│   │   ├── brand.ts                  BRAND colors, APP_NAME
│   │   ├── ai.ts                     AI_CONFIG
│   │   ├── validation.ts             Accepted file types
│   │   └── index.ts                  Re-exports all
│   ├── supabase/
│   │   ├── server.ts                 createClient() (cookie auth) + createAdminClient() (service role)
│   │   ├── client.ts                 Browser-side Supabase singleton
│   │   ├── storage.server.ts         downloadTempZip(), deleteTempZip()
│   │   └── storage.ts                uploadTempZip() — client-side ZIP upload
│   ├── db/
│   │   ├── users.ts                  getCurrentUser()
│   │   ├── sessions.ts               insertSession(), getSessionById(), listSessions(), etc.
│   │   ├── analytics.ts              getAnalytics()
│   │   ├── classInsights.ts          getClassInsights(), upsertClassInsights(), fetchInsightsInput()
│   │   ├── studentSubmissions.ts     getStudentsWithParticipation(), getStudentDetail()
│   │   ├── studentProfiles.ts        getStudentProfile(), upsertStudentProfile(), getGrowthSignalsForUser()
│   │   ├── professorNotes.ts         getProfessorNotes(), addProfessorNote(), deleteProfessorNote(), toggleFollowupFlag()
│   │   ├── studentDebriefs.ts        Student debrief submission and analysis CRUD
│   │   ├── studentSpeakerAnalyses.ts Speaker analysis submission and analysis CRUD
│   │   ├── sessionSyntheses.ts       getSessionSynthesis(), upsertSessionSynthesis()
│   │   ├── themes.ts                 getThemeFrequency(), getRecentThemeTitles()
│   │   ├── sessionAnalyses.ts        getSessionAnalysis(), insertSessionAnalysis()
│   │   ├── sessionShares.ts          Session sharing CRUD + public access
│   │   ├── semesters.ts              Semester CRUD, assignment, archiving
│   │   ├── semesterComparison.ts     getSemesterComparisonData()
│   │   ├── savedComparisons.ts       Saved comparison CRUD
│   │   ├── debriefs.ts               Debrief CRUD + completion
│   │   ├── subscription.ts           checkSubscriptionAccess(), Stripe subscription management
│   │   ├── stories.ts                Semester story CRUD
│   │   ├── speakerPortals.ts         Speaker portal CRUD + public access
│   │   └── portfolioShares.ts        Portfolio share CRUD + public access
│   ├── ai/
│   │   ├── geminiClient.ts           Lazy Gemini singleton — ALWAYS import from here
│   │   ├── client.ts                 Lazy OpenAI SDK client → xAI endpoint (session generation)
│   │   ├── prompt.ts                 System prompt template with {{SPEAKER_NAME}} placeholder
│   │   ├── analysisAgent.ts          runSessionAnalysis() + runThemeAnalysis() + runCrossSessionThemeAnalysis()
│   │   ├── generateSessionAnalysis.ts  Fire-and-forget session analysis caching
│   │   ├── classInsights.ts          generateClassInsights() — fire-and-forget after each session
│   │   ├── studentProfile.ts         generateStudentProfile(), generateStudentProfiles() — with growth intelligence
│   │   ├── debriefSummary.ts         generateDebriefSummary() — on debrief completion
│   │   ├── debriefReflectionAnalysis.ts  Analyze student post-session reflections
│   │   ├── speakerAnalysisEvaluation.ts  Analyze student speaker evaluation essays
│   │   ├── synthesisAgent.ts         Cross-data session synthesis (questions + reflections + analyses)
│   │   ├── speakerPortal.ts          Generate speaker preparation portal
│   │   ├── speakerPortalPostSession.ts  Generate post-session feedback for speaker portal
│   │   ├── speakerRecommendations.ts AI speaker recommendations based on history
│   │   ├── storyAgent.ts             Generate semester narrative stories
│   │   ├── sqlAgent.ts               NL→SQL→answer agent for analytics queries
│   │   ├── tierClassifier.ts         Question quality tier classification
│   │   ├── reportAgent.ts            Report generation
│   │   ├── semesterComparison.ts     Semester comparison analysis
│   │   ├── comparisonAgent.ts        Cohort comparison AI
│   │   └── speakerBrief.ts           Speaker brief generation
│   ├── parse/
│   │   ├── unzip.ts                  Extract ZIP buffer → [{ name, buffer }]
│   │   ├── pdf.ts                    Parse PDF buffer → plain text
│   │   ├── docx.ts                   Parse DOCX buffer → plain text
│   │   ├── builder.ts                Orchestrates unzip+parse; assembles submission block
│   │   ├── parseThemes.ts            parseThemesFromOutput(), themesOverlap()
│   │   └── parseQuestions.ts         parseSections(), parseQuestionsFromOutput()
│   ├── export/
│   │   ├── pdf.ts                    Build PDF from session output
│   │   ├── docx.ts                   Build DOCX from session output
│   │   ├── storyPdf.ts              Semester story PDF export (branded cover + sections)
│   │   └── storyDocx.ts             Semester story DOCX export
│   ├── stripe/
│   │   └── index.ts                  Stripe SDK singleton
│   └── utils/
│       ├── transforms.ts             rowToSession() / rowToSessionSummary() (snake → camelCase)
│       └── format.ts                 formatStudentName(), formatDate(), formatFileCount(), slugifySpeakerName()
│
├── types/
│   ├── index.ts                      Barrel re-export of all type modules
│   ├── session.ts                    SessionRow, Session, SessionSummary, CreateSessionInput, SessionShare
│   ├── analytics.ts                  AnalyticsData, SessionAnalyticsRow, LeaderboardEntry, DropoffEntry
│   ├── insights.ts                   ClassInsights, ThemeEvolutionEntry
│   ├── analysis.ts                   SessionAnalysis, ThemeAnalysis, CrossSessionThemeAnalysis
│   ├── student_submission.ts         StudentSubmission, StudentSummary (with growthSignal, flaggedForFollowup), StudentDetail, SessionWithSubmission (with debriefText, speakerAnalysisText)
│   ├── student_profile.ts            StudentProfile (with GrowthIntelligence), GrowthSignal, GrowthSnapshot, GrowthIntelligence, ProfessorNote
│   ├── student_debrief.ts            StudentDebriefSubmissionRow, StudentDebriefAnalysis
│   ├── student_speaker_analysis.ts   StudentSpeakerAnalysisSubmissionRow, StudentSpeakerAnalysis
│   ├── session_synthesis.ts          SessionSynthesis (narrative, curiosity resolution, theme evolution, tone shift, gaps)
│   ├── speaker_portal.ts             SpeakerPortalContent, PostSessionFeedback, SpeakerPortal, SpeakerPortalRow
│   ├── portfolio.ts                  PortfolioConfig, PortfolioShare, PortfolioShareRow
│   ├── story.ts                      SemesterStory, StorySection, StorySectionKey, SemesterStoryRow
│   ├── semester.ts                   Semester types
│   ├── comparison.ts                 Cohort comparison types
│   ├── report.ts                     Report types
│   ├── subscription.ts               Subscription types
│   ├── tier.ts                       Tier classification types
│   ├── debrief.ts                    Debrief types
│   ├── speaker_brief.ts              Speaker brief types
│   ├── api.ts                        ProcessResponse, ApiError, ApiResult<T>, DownloadFormat
│   └── user.ts                       AuthUser
│
├── supabase/migrations/
│   ├── 20240101000000_initial_schema.sql                   sessions table + RLS
│   ├── 20240102000000_fix_profiles_insert_policy.sql
│   ├── 20240103000000_create_profiles_table.sql            profiles table + auto-create trigger
│   ├── 20260324000003_analytics_query_fn.sql               execute_analytics_query() SECURITY DEFINER RPC
│   ├── 20260324000004_class_insights.sql                   class_insights table
│   ├── 20260324200902_create_temp_uploads_policies.sql     RLS for temp-uploads bucket
│   ├── 20260325000000_session_analyses.sql                 session_analyses table
│   ├── 20260327000000_fix_student_names_from_filenames.sql Student name parsing fix
│   ├── 20260328000000_student_profiles.sql                 student_profiles table
│   ├── 20260329000000_session_shares.sql                   session_shares table
│   ├── 20260402000000_create_student_debrief_submissions.sql    student_debrief_submissions table
│   ├── 20260402000001_create_student_debrief_analyses.sql       student_debrief_analyses table
│   ├── 20260402000002_create_student_speaker_analysis_submissions.sql student_speaker_analysis_submissions table
│   ├── 20260402000003_create_student_speaker_analyses.sql       student_speaker_analyses table
│   ├── 20260402000004_create_session_syntheses.sql              session_syntheses table
│   ├── 20260403000000_create_portfolio_shares.sql               portfolio_shares table
│   ├── 20260403000001_create_semester_stories.sql               semester_stories table
│   ├── 20260403000002_create_speaker_portals.sql                speaker_portals table
│   ├── 20260404000000_add_growth_signal_to_student_profiles.sql growth_signal column
│   ├── 20260404000001_create_professor_student_notes.sql        professor_student_notes table
│   └── 20260405000000_add_missing_email_column.sql              email column fix for profiles
│
├── middleware.ts                     Supabase auth guard — protects all (app) routes
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
| semester_id | UUID | FK → semesters(id), nullable (NULL = unassigned) |
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
| analysis | JSONB | Gemini-generated StudentProfile JSON (interests, career, growth intelligence, personality, notes) |
| session_count | INTEGER | Number of sessions analyzed at generation time |
| growth_signal | TEXT | Denormalized growth trajectory (Accelerating/Deepening/Emerging/Consistent/Plateauing/New) |
| updated_at | TIMESTAMPTZ | |

### `professor_student_notes`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID | FK → auth.users |
| student_name | TEXT | Indexed with user_id |
| note_text | TEXT | Professor's private note |
| flagged_for_followup | BOOLEAN | Follow-up flag, default false |
| created_at | TIMESTAMPTZ | |

### `session_shares`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| session_id | UUID | FK → sessions(id), unique |
| user_id | UUID | FK → auth.users |
| share_token | UUID | Randomly generated; used in public URL |
| created_at | TIMESTAMPTZ | |

### `session_debriefs`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| session_id | UUID | FK → sessions(id) |
| user_id | UUID | FK → auth.users |
| rating | INTEGER | Session rating |
| question_feedback | JSONB | Per-question feedback |
| observations | TEXT | Professor observations |
| summary | TEXT | AI-generated summary |
| created_at | TIMESTAMPTZ | |

### `student_debrief_submissions`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| session_id | UUID | FK → sessions(id), cascade |
| student_name | TEXT | Indexed |
| filename | TEXT | Original filename, default '' |
| submission_text | TEXT | Raw reflection text |
| created_at | TIMESTAMPTZ | |

### `student_debrief_analyses`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| session_id | UUID | FK → sessions(id), unique, cascade |
| user_id | UUID | FK → auth.users |
| analysis | JSONB | Gemini-generated StudentDebriefAnalysis |
| file_count | INTEGER | Number of files processed |
| created_at | TIMESTAMPTZ | |

### `student_speaker_analysis_submissions`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| session_id | UUID | FK → sessions(id), cascade |
| student_name | TEXT | Indexed |
| filename | TEXT | Original filename, default '' |
| submission_text | TEXT | Raw analysis essay text |
| created_at | TIMESTAMPTZ | |

### `student_speaker_analyses`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| session_id | UUID | FK → sessions(id), unique, cascade |
| user_id | UUID | FK → auth.users |
| analysis | JSONB | Gemini-generated StudentSpeakerAnalysis |
| file_count | INTEGER | Number of files processed |
| created_at | TIMESTAMPTZ | |

### `session_syntheses`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| session_id | UUID | FK → sessions(id), unique, cascade |
| user_id | UUID | FK → auth.users |
| synthesis | JSONB | Cross-data SessionSynthesis JSON |
| data_types | TEXT[] | Sources used (e.g. questions, reflections, analyses) |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### `speaker_portals`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| session_id | UUID | FK → sessions(id), unique, cascade |
| user_id | UUID | FK → auth.users |
| content | JSONB | AI-generated portal sections |
| edited_content | JSONB | Professor overrides (nullable) |
| post_session | JSONB | Post-session feedback (nullable) |
| share_token | UUID | Public access token |
| is_published | BOOLEAN | Default false |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### `portfolio_shares`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID | FK → auth.users, unique (one per professor) |
| share_token | UUID | Auto-generated, unique |
| enabled | BOOLEAN | Default true |
| config | JSONB | PortfolioConfig (scope, semesterId, flags) |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### `semester_stories`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID | FK → auth.users |
| semester_id | UUID | FK → semesters(id), unique, cascade |
| title | TEXT | AI-generated story title |
| sections | JSONB | Array of StorySection (5 sections) |
| session_ids | UUID[] | Sessions included in the story |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### `semesters`
| Column | Type | Notes |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID | FK → auth.users |
| name | TEXT | e.g. "Spring 2026" |
| start_date | DATE | Semester start |
| end_date | DATE | Semester end |
| status | TEXT | `active` or `archived` |
| created_at | TIMESTAMPTZ | |

### `profiles`
| Column | Type | Notes |
|---|---|---|
| id | UUID | FK → auth.users |
| email | TEXT | User email |
| stripe_customer_id | TEXT | Stripe customer ID |
| subscription_status | TEXT | Subscription state |
| stripe_subscription_id | TEXT | Stripe subscription ID |
| subscription_price_id | TEXT | Active price ID |
| subscription_current_period_end | TIMESTAMPTZ | Current billing period end |
| trial_ends_at | TIMESTAMPTZ | Trial expiry |
| free_sessions_remaining | INTEGER | Free session credits |

**RLS:** SELECT and INSERT on `sessions` (scoped to own user_id). Session analyses, student profiles, and session shares are readable by the owning user; writes go through the service role (admin client). New post-session tables (`student_debrief_*`, `student_speaker_analysis_*`, `session_syntheses`) follow the same SELECT-only RLS pattern. The `execute_analytics_query` RPC runs as SECURITY DEFINER. Public access (shared sessions, speaker portals, portfolio) uses the admin client after validating tokens.

---

## AI Architecture

| System | Model | Purpose |
|---|---|---|
| xAI Grok | via OpenAI SDK + `baseURL` override | Session generation — turns raw submissions into the 10-section interview sheet |
| Google Gemini (`classInsights.ts`) | `@google/genai` | Class-level analysis — narrative, theme evolution, quality trend; stored in `class_insights` table; triggered fire-and-forget after each session |
| Google Gemini (`analysisAgent.ts`) | `@google/genai` | Per-session analysis — theme clusters, tensions, suggestions, blind spots, sentiment; also powers theme deep-dive and cross-session theme analysis |
| Google Gemini (`studentProfile.ts`) | `@google/genai` | Per-student analysis with growth intelligence — interests, career, growth trajectory, personality; uses all 3 submission types (questions, reflections, analyses) |
| Google Gemini (`debriefSummary.ts`) | `@google/genai` | Post-session debrief summary — generated when professor marks debrief complete |
| Google Gemini (`debriefReflectionAnalysis.ts`) | `@google/genai` | Student post-session reflection analysis — themes, key moments, surprises, career connections, sentiment |
| Google Gemini (`speakerAnalysisEvaluation.ts`) | `@google/genai` | Student speaker evaluation analysis — leadership qualities, course concepts, agreement patterns, analytical sophistication |
| Google Gemini (`synthesisAgent.ts`) | `@google/genai` | Cross-data session synthesis — curiosity resolution, theme evolution, tone shift, gaps; requires ≥2 data types |
| Google Gemini (`speakerPortal.ts`) | `@google/genai` | Speaker preparation portal — welcome, student interests, talking points, audience profile, past speaker insights |
| Google Gemini (`speakerPortalPostSession.ts`) | `@google/genai` | Post-session speaker feedback — rating, resonating topics, student highlights |
| Google Gemini (`speakerRecommendations.ts`) | `@google/genai` | Future speaker recommendations — topic areas, interest signals, complementary speakers |
| Google Gemini (`storyAgent.ts`) | `@google/genai` | Semester narrative stories — 5-section magazine-style long-form document |
| Google Gemini (`sqlAgent.ts`) | `@google/genai` | NL→SQL→answer agent for analytics page queries |

Session analysis results are **persisted to the database** in `session_analyses` — pre-computed fire-and-forget during `/api/process`, then served from cache on subsequent requests. Theme deep-dive results are computed on demand and cached client-side in `sessionStorage`.

---

## Post-Upload Pipeline

When `/api/process` completes the main ZIP → AI → DB flow, three fire-and-forget background tasks are triggered:

1. **Class insights regeneration** — `generateClassInsights(userId)` re-analyzes all sessions for the professor
2. **Session analysis caching** — `generateAndCacheSessionAnalysis(sessionId, ...)` pre-computes the Gemini session analysis and stores it in `session_analyses`
3. **Student profile generation** — `generateStudentProfiles(userId, affectedStudents)` generates or updates AI profiles for all students in the uploaded session (chunked in batches of 5)

Additional background tasks are triggered after **student debrief** or **speaker analysis** uploads:
4. **Class insights regeneration** — re-triggered to incorporate new data
5. **Speaker recommendations regeneration** — updated with new engagement signals

After **debrief completion**, the speaker portal's post-session feedback section is also generated.

---

## Preview Page — Tab Structure

The `/preview` page has four tabs:

| Tab | Component | Content |
|---|---|---|
| Questions | `OutputPreview` | Rendered markdown interview sheet + overlapping-themes warning banner |
| Analysis | `AnalysisPanelLeft` | Theme clusters (bar chart, clickable → `/preview/theme`), underlying tensions |
| Insights | `AnalysisPanelRight` | Gemini interview suggestions, blind spots, student sentiment breakdown |
| Debrief | `DebriefPanel` | Post-session capture: rating, question feedback, observations, with auto-save |

The page also includes a `ShareButton` for generating/revoking public read-only links and a `GeneratePortalButton` for creating a speaker preparation portal.

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

## Speaker Portal

Guest speakers receive a personalized preparation page:

1. Professor clicks **Generate Portal** on the Preview page → AI creates a 5-section briefing
2. Professor can edit any section inline before publishing
3. Publishing generates a public URL: `{origin}/speaker/{shareToken}`
4. Speaker sees: personalized welcome, student interests, talking points, audience sentiment profile, and past speaker insights
5. After the session debrief is completed, a post-session feedback section automatically appears with the rating, resonating topics, and student highlights

---

## Teaching Portfolio

Professors can share a public teaching portfolio:

1. From the Account page, enable portfolio sharing and configure scope (all semesters or specific)
2. A token-based URL is generated: `{origin}/portfolio/{shareToken}`
3. Public viewers can browse sessions, analytics, student roster, and semester reports
4. The token can be regenerated or sharing disabled at any time

---

## Design System

**Brand colors** (`lib/constants/brand.ts`):
- `BRAND.ORANGE` `#f36f21` — CTAs, highlights
- `BRAND.PURPLE` `#542785` — secondary
- `BRAND.GREEN` `#0f6b37` — accent / success

**Dark theme** (CSS vars in `globals.css`): `--bg #0d0d11`, `--surface #15151d`, `--text-primary #f0ece4`

**Typography**: Playfair Display (headings) + DM Sans (body/UI)
