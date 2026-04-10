# components/layout/ — App Shell and Shared Headers

## Purpose

Top-level shell components: the authenticated navigation header, the auth form, and utility panels rendered at account/settings scope.

## Component Catalog

| Component | Purpose | Used by pages | API routes called |
|-----------|---------|---------------|-------------------|
| `NavHeader.tsx` | Persistent top nav with logo, nav links, SemesterSelector, and account dropdown | `app/(app)/layout.tsx` | Supabase Auth (getSession) |
| `AuthForm.tsx` | Tabbed email/password + Google OAuth form | `app/(auth)/login/page.tsx` | Supabase Auth (signIn, signUp, signInWithOAuth) |
| `ClearDataButton.tsx` | Two-step confirmation button to wipe all session data (admin only) | `app/(app)/account/page.tsx` | `POST /api/admin/clear` |
| `PortfolioSharePanel.tsx` | Create, configure, toggle, and regenerate the professor's public portfolio share link | `app/(app)/account/page.tsx` (#portfolio anchor) | `GET/POST/PATCH/DELETE /api/portfolio` |
| `ReportConfigPanel.tsx` | Full-screen modal for composing and triggering semester report generation | `app/(app)/analytics/page.tsx` | `POST /api/reports/generate` |

## Key Patterns

- All components use `'use client'` (hooks, browser APIs, Supabase browser client).
- `NavHeader` embeds `SemesterSelector` from `components/semester/`.
- `PortfolioSharePanel` reads `SemesterContext` for the scope selector.
- Two-step confirmation pattern (used in `ClearDataButton` and `PortfolioSharePanel`) prevents accidental destructive actions.
- Errors are always rendered inline; `alert()` is never used.

## Brand Colors

Import `BRAND` from `@/lib/constants`. Never hardcode hex values.
