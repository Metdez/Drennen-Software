# components/debrief/ — Post-Session Debrief Capture

## Purpose

Post-session debrief form where professors rate the session, tag each AI question as home_run/solid/flat/unused, log surprise moments, speaker feedback, student observations, and follow-up topics.

## Component Catalog

| Component | Purpose | Used by pages | API routes called |
|-----------|---------|---------------|-------------------|
| `DebriefPanel.tsx` | 7-section debrief form with 1500 ms debounced auto-save and "Mark Complete" AI summary trigger | `app/(app)/preview/page.tsx` (debrief tab) | `POST /api/sessions/[id]/debrief`, `POST /api/sessions/[id]/debrief/complete` |

## Key Patterns

- Auto-save uses a debounce ref + save-queue pattern (`savingRef` + `pendingRef`) to prevent concurrent POSTs and guarantee the last change is always persisted.
- Questions are initialized from the AI output string via `parseQuestionsFromOutput()` and merged with any existing feedback stored on the server.
- Questions are grouped by theme title for display; the grouping is computed at render time from the flat `questionsFeedback` array.
- Once `completedStatus` is true, all inputs are disabled and an AI summary card is shown above the form.
- Student name autocomplete uses native `<datalist>` fed from the `studentNames` prop (parsed from the session's student submissions).

## Brand Colors

Import `BRAND` from `@/lib/constants`. Never hardcode hex values.
