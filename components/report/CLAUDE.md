# components/report/ — Semester Report Sections

## Purpose

Pure-display section components that compose the semester report page. Each component receives a typed data slice from the `SemesterReport` type and renders one section. No components here make API calls or manage shared state — they are driven entirely by props.

## Component Catalog

| Component | Purpose | Used by pages | API routes called |
|-----------|---------|---------------|-------------------|
| `ExecutiveSummary.tsx` | Narrative + 5 stat cards (sessions, submissions, students, avg/session, participation rate) + highlighted bullets | `app/(app)/reports/[id]/page.tsx`, `app/(public)/portfolio/[token]/reports/[reportId]/page.tsx` | None (data passed as prop) |
| `ThemeEvolution.tsx` | Session-by-session theme timeline with deterministic hash-assigned colors + dominant themes table (count, first seen, last seen) | `app/(app)/reports/[id]/page.tsx` | None (data passed as prop) |
| `StudentGrowth.tsx` | Narrative + growth highlight cards (student name, growth signal badge, sessions count, narrative, thinking progression quote) | `app/(app)/reports/[id]/page.tsx` | None (data passed as prop) |
| `StudentEngagement.tsx` | Three participation-tier stat cards (High/Medium/Low) + top-contributors table + drop-off list with last-seen session | `app/(app)/reports/[id]/page.tsx` | None (data passed as prop) |
| `SpeakerEffectiveness.tsx` | Narrative + speaker rankings table (submission count, avg tier in BRAND.PURPLE, debrief rating in BRAND.ORANGE; missing data shows `—`) | `app/(app)/reports/[id]/page.tsx` | None (data passed as prop) |
| `SessionSummaries.tsx` | One card per session with speaker name, date, file count, optional debrief rating, theme pills, and debrief highlights text | `app/(app)/reports/[id]/page.tsx` | None (data passed as prop) |
| `SemesterGlance.tsx` | 4 stat cards + `recharts` bar chart of submissions over time (BRAND.ORANGE bars) + tier distribution progress bars (BRAND.PURPLE) | `app/(app)/reports/[id]/page.tsx` | None (data passed as prop) |
| `QuestionQuality.tsx` | Trend indicator (▲/▼/◆) + `recharts` stacked bar chart of tier distribution per session + overall-distribution card grid | `app/(app)/reports/[id]/page.tsx` | None (data passed as prop) |
| `BlindSpots.tsx` | Grid of blind-spot warning cards (BRAND.PURPLE icon) + numbered recommendations list (BRAND.GREEN numbering) | `app/(app)/reports/[id]/page.tsx` | None (data passed as prop) |
| `AppendixRoster.tsx` | Scrollable attendance grid — one row per student, one column per session; sticky name column + header; rate color-coded by threshold | `app/(app)/reports/[id]/page.tsx` | None (data passed as prop) |

## Key Patterns

- All components are client components (`'use client'`) because the report page is client-rendered.
- Every component receives exactly one typed prop (`data`) that maps to a named section type from `SemesterReport` (e.g. `ExecutiveSummarySection`, `ThemeEvolutionSection`). No additional state is needed.
- Sections are conditionally rendered — if an array is empty (e.g. `data.highlights.length === 0`), the sub-section is omitted entirely; no empty containers are left visible.
- `ThemeEvolution` uses a `hashString()` helper to assign consistent colors from `THEME_COLORS` to theme pills across render cycles — the same theme title always gets the same color.
- `SemesterGlance` and `QuestionQuality` use `recharts` (`BarChart`, `ResponsiveContainer`, `Tooltip`) for interactive charts. Tooltip label formatters expose the full speaker name and formatted date, since X-axis labels are truncated for space.
- `AppendixRoster` builds `Map<studentName, Set<sessionId>>` lookups before rendering so attendance checks in the table body are O(1).
- `StudentEngagement` and `AppendixRoster` use a three-threshold color pattern for participation rates: ≥ 80% → `BRAND.GREEN`, ≥ 50% → `BRAND.ORANGE`, below 50% → `#ef4444`.
- Each section has an `id` attribute matching its anchor in the report nav (e.g. `id="executive-summary"`, `id="appendix-roster"`).

## Brand Colors

Import `BRAND` from `@/lib/constants`. Never hardcode hex values for brand colors. `BRAND.ORANGE` is used for section underline accents and primary data highlights; `BRAND.PURPLE` for quality-tier data; `BRAND.GREEN` for positive participation signals and recommendations.
