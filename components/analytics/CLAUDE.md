# components/analytics/ — Analysis and Insights Panels

## Purpose

Components that render Gemini-backed per-session analysis, class-level insights, synthesis, and theme trend visualization. Most are used on `/preview` (tabs) and `/analytics` (the class-level dashboard).

## Component Catalog

| Component | Purpose | Used by pages | API routes called |
|-----------|---------|---------------|-------------------|
| `AnalysisPanelLeft.tsx` | Theme clusters (with deep-dive nav) and underlying tensions | `app/(app)/preview/page.tsx` (analysis tab), `app/(public)/shared/[token]/page.tsx` | None (data passed as prop; navigates to `/preview/theme`) |
| `AnalysisPanelRight.tsx` | Suggestions, blind spots, and student sentiment breakdown | `app/(app)/preview/page.tsx` (insights tab), `app/(public)/shared/[token]/page.tsx` | None (data passed as prop) |
| `CollapsiblePanel.tsx` | Generic accordion shell with icon + title + preview text | `app/(app)/preview/page.tsx`, `app/(app)/analytics/page.tsx` | None (generic wrapper) |
| `SynthesisPanel.tsx` | Cross-data synthesis (questions + debriefs + analyses) with guard states | `app/(app)/preview/page.tsx` (synthesis tab) | None (data + state passed as props) |
| `ThemeExplorer.tsx` | Ranked theme list with expand-to-detail and link to full cross-session analysis | `app/(app)/analytics/page.tsx` | None (data from ClassInsights passed as prop) |
| `ThemeFrequencyPanel.tsx` | Self-fetching collapsible bar chart of theme recurrence across sessions | `app/(app)/analytics/page.tsx` | `GET /api/analytics/themes` |
| `WhatChangedBanner.tsx` | "What's new since last visit" diff banner using localStorage state | `app/(app)/analytics/page.tsx` | None (computes from `ClassInsights` prop + localStorage) |

## Key Patterns

- `AnalysisPanelLeft` accepts a `readOnly` prop: when true, clusters render as `div` instead of `button` (used in public shared views).
- `SynthesisPanel` has a four-state guard: `insufficient` → badge gate, `pending` → processing, `loading` → spinner, `error` → retry.
- `WhatChangedBanner` uses namespace-isolated localStorage keys per `semesterId` to avoid cross-semester diffs.
- `ThemeFrequencyPanel` is self-contained — it fetches its own data and manages its own loading state.
- All panels show a "Powered by Gemini" attribution footer.

## Brand Colors

Import `BRAND` from `@/lib/constants`. Never hardcode hex values.
