# Analytics Page Redesign — Design Spec

## Problem

The analytics page (`/analytics`) has two categories of issues:

1. **Visual mess**: The Theme Evolution section dumps full paragraph text (the raw AI output) instead of concise theme labels. With 10 themes × N sessions, the page becomes an unreadable wall of text. The page also fetches leaderboard and drop-off data but never displays it.

2. **Loading failures**: Some accounts can't load the page because:
   - `/analytics` and `/roster` are not in the middleware protected routes, so unauthenticated users reach the page, API returns 401, and the page shows a generic error
   - `insightsData.error` is never checked — if the insights API fails, the error is silently swallowed

## Design Goals

- Make themes the primary focus — professors want to understand what students are interested in
- Every theme should be clickable for AI-powered deep analysis (existing deep-dive page at `/analytics/theme/[title]/`)
- Content should be readable and skimmable at a glance
- Fix loading for all account states (no sessions, sessions but no insights, auth failures)

## Solution: 3-Tab Layout

Replace the current single-scroll page with 3 tabs: **Overview**, **Themes**, **AI Insights**.

### Tab 1: Overview
Quick snapshot dashboard:
- **Stats row**: 3 cards — Sessions count, Unique Themes count, Students count
- **AI Summary card**: Compact narrative from `ClassInsights.narrative` + quality trend indicator (improving/declining/stable)
- **Latest Session card**: Speaker name, date, submission count, theme pills (max 3 + "+N more")
- **Top 3 Themes**: Ranked list with frequency bars, each clickable → links to theme deep-dive. "View all themes →" link switches to Themes tab.

### Tab 2: Themes (the primary tab)
Everything about what students care about:
- **All Themes Ranked**: Clickable cards showing rank, theme title, one-line AI description, frequency bar, percentage of sessions, and → arrow. Each links to `/analytics/theme/[title]`. NEW badge for themes appearing only in the latest session.
- **Theme Evolution Timeline**: Compact timeline showing each session (speaker name + date + submission count) with small theme pills. Pills are also clickable → deep-dive. This replaces the current wall-of-text section.

### Tab 3: AI Insights
Cross-student analysis:
- **Class Narrative**: Full `ClassInsights.narrative` text with generation date
- **Quality Trend card**: Direction indicator (▲/▼/◆) + description
- **Cross-Session Patterns card**: Key pattern bullets (e.g., "Leadership in 80% of sessions")
- **Ask About Your Data**: The existing NL→SQL query box for ad-hoc questions

### Removed/Demoted
- Student leaderboard (still fetched but not displayed — low priority per user)
- Drop-off watchlist (same)
- Full-text theme content in evolution view (replaced with pills)

## Bug Fixes

### Fix 1: Middleware protection
Add `/analytics` and `/roster` to the protected routes in `middleware.ts`.

### Fix 2: Insights error handling
In the analytics page's `useEffect`, check `insightsData.error` alongside `analyticsData.error`. Also check `response.ok` before parsing JSON.

### Fix 3: Per-section resilience
If insights fail but analytics data loads, still show the Overview and Themes tabs with available data. Show a gentle "AI insights unavailable" message in the AI Insights tab instead of breaking the whole page.

## Tab State Management
- Use URL search param `?tab=overview|themes|insights` so tabs are bookmarkable/shareable
- Default to `overview` tab
- "View all themes →" on Overview sets `?tab=themes`

## Data Sources (no new APIs needed)
- **Overview + Themes**: `GET /api/analytics` (sessions, leaderboard, dropoff, meta) + `GET /api/analytics/insights` (ClassInsights with topThemes, themeEvolution, narrative, qualityTrend)
- **AI Insights**: Same insights data
- **Theme deep-dive**: Existing page at `/analytics/theme/[title]/`

## Types Used
- `AnalyticsData` from `types/analytics.ts` — sessions, leaderboard, dropoff, meta
- `ClassInsights` from `types/insights.ts` — narrative, qualityTrend, topThemes, themeEvolution, watchlist
- `ThemeEvolutionEntry` from `types/insights.ts` — sessionId, speakerName, date, themes[]

## Files to Modify
1. `middleware.ts` — add `/analytics` and `/roster` to protected routes
2. `app/(app)/analytics/page.tsx` — full rewrite with 3-tab layout
3. No new files needed — everything is in the existing page file

## Visual Reference
Mockups saved at `.superpowers/brainstorm/893-1774563562/content/revised-design.html`
