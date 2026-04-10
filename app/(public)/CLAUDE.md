# app/(public)/ — Shareable Read-Only Views

This route group renders public pages that are accessed via tokens, not login sessions. No authentication is required to view any page in this group.

## Purpose

Public sharing is a core feature of the app. Professors can share sessions, comparisons, speaker portals, and portfolios with people who do not have accounts. Each share type generates a unique opaque token stored in the database. The token is the sole access boundary.

## Token-Based Access Pattern

1. Professor triggers a share action (e.g. "Share Session", "Publish Portal", "Create Portfolio").
2. The API route generates an opaque token and stores it alongside the share data (e.g. `session_shares.share_token`, `speaker_portals.share_token`, `portfolio_shares.share_token`).
3. The professor copies a URL of the form `/shared/[token]`, `/speaker/[token]`, or `/portfolio/[token]`.
4. The recipient opens the URL — no login required.
5. The public API route (e.g. `GET /api/shared/[token]`) looks up the token, enforces that it is still valid, and returns the public data.
6. If the token does not exist or the share has been revoked, the API returns 404 and the page shows a "not available" error state.

**Important:** Public routes must NOT depend on a Supabase auth session. They use the `createAdminClient()` (service role) or un-authed queries scoped to the token lookup. They must never expose non-public data.

## Page Catalog

| Route | Page File | Purpose | Key Components | Token Source |
|-------|-----------|---------|----------------|--------------|
| `/shared/[token]` | `shared/[token]/page.tsx` | Read-only view of a single session — Questions, Analysis, Insights tabs + download | OutputPreview, DownloadButtons, AnalysisPanelLeft, AnalysisPanelRight | `session_shares.share_token` |
| `/shared/compare/[token]` | `shared/compare/[token]/page.tsx` | Read-only side-by-side comparison — Overview, Themes, Quality, Sentiment, Participation, AI Analysis tabs | ComparisonHeader, ThemeVenn, QualityComparison, SentimentComparison, ParticipationDelta, ComparativeNarrative | `saved_comparisons.share_token` |
| `/speaker/[token]` | `speaker/[token]/page.tsx` | Guest speaker portal — pre-session context + optional post-session feedback | (inline: SentimentBar, StarRating, section layout) | `speaker_portals.share_token` |
| `/portfolio/[token]` | `portfolio/[token]/page.tsx` | Portfolio landing — summary metrics + section navigation | PortfolioContext, (inline section cards) | `portfolio_shares.share_token` |
| `/portfolio/[token]/analytics` | `portfolio/[token]/analytics/page.tsx` | Portfolio analytics — class insights narrative, theme frequency, quality trend | (inline layout consuming PortfolioContext) | `portfolio_shares.share_token` |
| `/portfolio/[token]/reports` | `portfolio/[token]/reports/page.tsx` | Portfolio reports list — links to generated semester reports | (inline layout consuming PortfolioContext) | `portfolio_shares.share_token` |
| `/portfolio/[token]/reports/[reportId]` | `portfolio/[token]/reports/[reportId]/page.tsx` | Public report detail — read-only view of a semester report | Report section components | `portfolio_shares.share_token` |
| `/portfolio/[token]/roster` | `portfolio/[token]/roster/page.tsx` | Public student roster — shown only when `includeStudentProfiles` is true in `PortfolioConfig` | (inline layout consuming PortfolioContext) | `portfolio_shares.share_token` |
| `/portfolio/[token]/roster/[studentName]` | `portfolio/[token]/roster/[studentName]/page.tsx` | Public per-student detail page — available only when roster is included in the portfolio | (inline layout) | `portfolio_shares.share_token` |
| `/portfolio/[token]/sessions` | `portfolio/[token]/sessions/page.tsx` | Public sessions list for the portfolio | (inline layout consuming PortfolioContext) | `portfolio_shares.share_token` |
| `/portfolio/[token]/sessions/[sessionId]` | `portfolio/[token]/sessions/[sessionId]/page.tsx` | Public session detail — questions output in a portfolio context | (inline layout) | `portfolio_shares.share_token` |

## Portfolio-Specific Pattern

Portfolio pages are nested under a `[token]` dynamic segment and share data loaded once by a `PortfolioContext` provider in the portfolio layout (`portfolio/[token]/layout.tsx`). Child pages consume `usePortfolio()` rather than fetching the token validation independently.

The `PortfolioConfig` object on each portfolio share controls which sections are visible:
- `scope: 'all' | 'semester'` — which sessions to include
- `includeStudentProfiles: boolean` — whether to expose the roster pages
- `includeReports: boolean` — whether to expose the reports list

If a section is excluded from the config, its corresponding route returns 404 or is hidden from the navigation.

## Key Conventions

- **No auth dependency:** Do not call `getCurrentUser()` or reference the Supabase auth session in any public route. Token lookup is the only access check.
- **Read-only everywhere:** Public pages never allow mutations. The speaker portal page is read-only; it does not provide a form for the speaker to submit feedback.
- **Graceful 404 handling:** All public pages display a clear "not available" message (not a crash or redirect) when the token is invalid or the share has been revoked.
- **Branding:** Public pages include a minimal `APP_NAME` footer branding element so external viewers can identify the tool.
- **Download support:** The `/shared/[token]` page passes a custom `downloadUrl` prop to `DownloadButtons` that points to the unauthenticated download route (`GET /api/shared/[token]/download`).
