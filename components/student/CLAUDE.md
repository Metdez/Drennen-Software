# components/student/ — Roster and Student Detail UI

## Purpose

Components for the professor's roster view and the per-student detail page — showing participation, AI-generated growth profiles, professor notes, and submission history.

## Component Catalog

| Component | Purpose | Used by pages | API routes called |
|-----------|---------|---------------|-------------------|
| `RosterTable.tsx` | Clickable roster table with participation rate, growth signal pill, and follow-up flag indicator | `app/(app)/roster/page.tsx`, `app/(public)/portfolio/[token]/roster/page.tsx` | None (data passed as prop) |
| `StudentDetailTabs.tsx` | Three-tab shell (Profile / Growth / Submissions) for the per-student detail page | `app/(app)/roster/[studentName]/page.tsx` | None (delegates to child tab components) |
| `StudentProfileTab.tsx` | AI profile overview with narrative summary, strengths, growth areas, and engagement tags | `app/(app)/roster/[studentName]/page.tsx` (Profile tab) | `GET /api/roster/[studentName]/profile` |
| `StudentGrowthTab.tsx` | Growth intelligence panel with `GrowthIntelligencePanel` + `ProfessorNotesEditor` | `app/(app)/roster/[studentName]/page.tsx` (Growth tab) | `GET /api/roster/[studentName]/profile` |
| `GrowthIntelligencePanel.tsx` | 2×2 card grid for thinking sophistication, theme evolution, critical thinking, and engagement pattern | Used by `StudentGrowthTab` | None (data passed as prop) |
| `ProfessorNotesEditor.tsx` | Add, delete, and flag-for-followup note cards; optimistic UI on delete/toggle | `StudentGrowthTab`, `StudentProfileTab` | `GET/POST/PATCH/DELETE /api/roster/[studentName]/notes` |
| `StudentReflectionsPanel.tsx` | Lists the student's debrief reflections and speaker analyses per session | `app/(app)/roster/[studentName]/page.tsx` | `GET /api/roster/[studentName]` (reflections in detail response) |

## Key Patterns

- `RosterTable` separates "flagged for follow-up" students into a highlighted section above the main table.
- `ProfessorNotesEditor` uses optimistic UI for deletes and flag toggles; reverts via `fetchNotes()` on API failure.
- `GrowthIntelligencePanel` maps `coherenceLabel`, `consistencyLabel`, and `depthTrend` strings to variant colors — keep those mappings in the component (not in the API layer).
- `StudentDetailTabs` lazy-renders tab content; only the active tab is mounted.
- `Cmd+Enter` submits notes in `ProfessorNotesEditor` (keydown handler).

## Brand Colors

Import `BRAND` from `@/lib/constants`. Never hardcode hex values.
