# app/(app)/ — Protected Professor Experience

This route group is mounted only for signed-in users and shares the authenticated app shell (NavHeader, SemesterContext, SubscriptionContext).

## Purpose

All pages in this route group represent features available exclusively to authenticated professors. The `(app)/layout.tsx` performs the auth check on every request (`force-dynamic`) and provides the navigation header and shared contexts to all child pages.

## Auth Pattern

Authentication is enforced at the layout level. The `(app)/layout.tsx` calls `getCurrentUser()` from `lib/db/users.ts`. If no authenticated session exists, it redirects to `/login`. Individual pages do NOT need to re-check auth — they can assume the user is present.

For server component pages that need the user's ID (e.g., `/analytics/theme`), they call `getCurrentUser()` directly and redirect to `/login` if it returns null (belt-and-suspenders).

Client-component pages fetch data via API routes that enforce RLS via the cookie-based Supabase client (`createClient()` in `lib/supabase/server.ts`).

## Page Catalog

| Route | Page File | Purpose | Key Components | Rendering |
|-------|-----------|---------|----------------|-----------|
| `/dashboard` | `dashboard/page.tsx` | Upload form — ZIP upload + AI generation trigger | SpeakerInput, DropZone, ProcessingView, SystemPromptEditor, PaywallModal | Client |
| `/preview` | `preview/page.tsx` | Session output viewer with 6 tabs (Questions, Analysis, Insights, Debrief, Reflections, Speaker Analysis) | OutputPreview, AnalysisPanelLeft, AnalysisPanelRight, DebriefPanel, SpeakerAnalysisPanel, StudentReflectionsPanel | Client |
| `/preview/brief` | `preview/brief/page.tsx` | Speaker prep brief preview, inline editing, PDF/text export | SectionCard (inline), GenerateBriefButton | Client |
| `/preview/portal` | `preview/portal/page.tsx` | Speaker portal preview, inline editing, publish/unpublish | SectionCard (inline), GeneratePortalButton | Client |
| `/preview/theme` | `preview/theme/page.tsx` | Per-theme deep-dive with Gemini narrative, probe questions, and patterns | (inline layout) | Client |
| `/history` | `history/page.tsx` | Past sessions list with compare-mode selection | SessionsTable | Client |
| `/analytics` | `analytics/page.tsx` | Class Intelligence Report — AI narrative, theme explorer, leaderboard, drop-off | ReportConfigPanel, WhatChangedBanner, ThemeExplorer, CollapsiblePanel | Client |
| `/analytics/compare` | `analytics/compare/page.tsx` | Cross-semester cohort comparison — stats grid, theme persistence table, AI narrative | (inline: StatsGrid, ThemePersistenceTable, AINarrativeCard) | Client |
| `/analytics/theme` | `analytics/theme/page.tsx` | Cross-session theme drilldown — Gemini synthesis, relevant questions, patterns | (inline layout) | **Server** |
| `/compare` | `compare/page.tsx` | Side-by-side session comparison with 6 tabs (Overview, Themes, Quality, Sentiment, Participation, AI Analysis) | ComparisonHeader, ThemeVenn, QualityComparison, SentimentComparison, ParticipationDelta, ComparativeNarrative, ComparisonShareButton | Client |
| `/roster` | `roster/page.tsx` | All-students list with participation rates | RosterTable, ClearDataButton | Client |
| `/roster/[studentName]` | `roster/[studentName]/page.tsx` | Per-student view (Profile, Growth, Submissions tabs) | StudentDetailTabs, Badge | **Server** |
| `/reports/[id]` | `reports/[id]/page.tsx` | Semester report viewer with TOC and up to 10 section components | ExecutiveSummary, SemesterGlance, SessionSummaries, ThemeEvolution, StudentEngagement, StudentGrowth, QuestionQuality, BlindSpots, SpeakerEffectiveness, AppendixRoster | Client |
| `/stories/[id]` | `stories/[id]/page.tsx` | Semester narrative story viewer with inline section editing | (inline layout) | Client |
| `/semesters` | `semesters/page.tsx` | Semester management — create, edit, archive, generate story, assign sessions | SemesterManageModal, AssignSessionsModal | Client |
| `/account` | `account/page.tsx` | Subscription status, billing invoices, portfolio sharing, system prompt editor | PaywallModal, PortfolioSharePanel, SystemPromptEditor | Client |

## Key Conventions

- **Semester filtering:** Most list pages (`/history`, `/analytics`, `/roster`) accept a `?semester=...` query param and filter results accordingly. The active semester ID comes from `SemesterContext` (provided by the `(app)` layout).
- **sessionStorage caching:** The `/preview` page caches session output (`session_${sessionId}`), overlapping themes (`overlap_${sessionId}`), and analysis results (`analysis_${sessionId}`) in `sessionStorage` to avoid redundant API calls when switching tabs. The `/compare` page caches comparison data under `comparison_${sortedIds}`. The `/preview/theme` page caches per-theme analysis under `theme_${sessionId}_${encodedTheme}`.
- **Lazy data loading:** The debrief, student reflections, and speaker analysis tabs on `/preview` only fetch their data on the first tab selection — `debriefFetched`, `studentDebriefFetched`, and `speakerAnalysisFetched` guard flags prevent redundant fetches.
- **Export pattern:** PDF and DOCX exports are triggered by programmatic `<a>` element clicks against download API routes that return blobs. The download routes handle the actual rendering.
- **Subscription gating:** The `/dashboard` page reads from `SubscriptionContext` and renders `PaywallModal` when `canGenerate` is false. The `/account` page also reads subscription state for the billing status card.
- **Server vs Client pages:** Most pages are client components that fetch data via API routes. Server component pages (`/analytics/theme`, `/roster/[studentName]`) call DB functions directly, benefiting from server-side rendering and faster initial loads.

## Data Flow Summary

```
User uploads ZIP → POST /api/process
  → lib/parse/ (ZIP extract + text parse)
  → lib/ai/client (Grok) — generates 10-section output
  → DB: sessions, student_submissions, session_themes
  → client: sessionStorage[session_X] + sessionStorage[overlap_X]
  → navigate to /preview?sessionId=X

/preview tab: analysis/insights
  → GET /api/sessions/[id]/analysis
  → lib/ai/analysisAgent (Gemini) — if not cached
  → DB: session_analyses
  → sessionStorage[analysis_X]
```
