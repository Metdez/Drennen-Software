# Preview Page — AI Analysis Panels

**Date:** 2026-03-24
**Status:** Approved (rev 2)

## Problem

The preview page shows the AI-generated interview sheet but gives the professor no meta-level understanding of *what his students are collectively thinking*. He sees the output but lacks insight into question patterns, underlying tensions, blind spots, and how to adapt his interview approach.

## Goal

Add Gemini-powered analysis panels to the preview page so professors get richer context on their students' questions — theme clusters (with per-theme deep-dive pages), underlying tensions, suggested interview angles, blind spots, and student sentiment — all generated automatically on page load.

---

## Layout

### Overriding the `(app)` layout container

The `(app)` layout wraps all children in `max-w-4xl mx-auto px-6 py-10`. The preview page must escape this to support a 3-column layout. The solution: **the preview page renders its own full-width wrapper** by overriding at the page level using `className="w-full"` and negative/reset margins, or by the `(app)` layout accepting a `fullWidth` flag via a layout context.

**Chosen approach:** Add an `AnalysisLayout` wrapper in `app/(app)/preview/page.tsx` that renders outside the normal center column using `mx-[-1.5rem] w-[calc(100%+3rem)]` to break out of the `px-6` padding. The 3-column grid sits inside this wider wrapper.

```
[ Left Panel 230px ] [ Main Content 1fr ] [ Right Panel 230px ]
```

On screens narrower than 1024px the panels hide and the main content remains at full width (single column).

---

## Left Panel — "Question Analysis"

Generated automatically from a single Gemini call on page load (see API section for sequencing).

### Theme Clusters
- Clickable cards — one per AI-identified theme
- Each card shows: theme name, question count, mini bar chart, preview of top question, arrow icon on hover
- **Clicking navigates to a new Theme Deep-Dive page** — no inline expand
- Card shows a skeleton shimmer while analysis is loading

### Underlying Tensions
- Gemini identifies 2–3 deep contradictions running through the student questions
- Each tension is a one-liner pairing two opposing framings (e.g. "Passion vs Pragmatism")

---

## Right Panel — "Class Insights"

Same Gemini call as left panel.

### Gemini Suggests
- 3 suggested interview angles based on question patterns
- Each includes a *why* line (e.g. "→ 9 questions in Career Pivots cluster")

### Blind Spots
- Topics students didn't ask about that Gemini knows are relevant to the speaker
- Gives the professor proactive angles to introduce

### Student Sentiment
- Breakdown of question emotional register: Aspirational / Curious / Personal / Critical (percentages)

---

## Loading & Empty States

**Loading:** Both panels render a skeleton shimmer (3 placeholder cards, gray animated background) while the Gemini call is in flight. Shimmer uses the same `animate-pulse` Tailwind utility used elsewhere in the app.

**Empty state (no submissions):** If the session has zero rows in `student_submissions` (e.g. sessions created before submissions were tracked), both panels render a single card: *"No submission data available for this session."* The theme clusters section is hidden entirely.

---

## Theme Deep-Dive Page

**Route:** `app/(app)/preview/theme/page.tsx`
**URL:** `/preview/theme?sessionId=<id>&theme=<url-encoded-theme-name>`

A separate page reached by clicking a theme card. Breadcrumb: `← SpeakerName / ThemeName`.

**Layout:** 2-column — main content (1fr) + right sidebar (~280px). No left panel here.

**Main content:**
- Theme name + heading bar
- Gemini narrative analysis block — what students are *really* asking, key patterns
- All student questions for this theme, sorted by position in the AI output, each showing question text and student name (no tier badges — tier data lives only in the markdown output, not structured DB fields)

**Sidebar:**
- **Probe Questions** — Gemini-generated follow-ups with a *why* note for each
- **What Students Missed** — angles within this theme students didn't ask about
- **Patterns** — 2–3 behavioral/linguistic patterns, each prefixed with a single emoji that Gemini is prompted to produce

**Direct navigation (no sessionStorage):** The theme deep-dive page is self-contained. It does **not** rely on `sessionStorage`. The `theme-analysis` API endpoint independently fetches submissions from the DB and filters by theme name. This means the page works correctly from bookmarks or shared links.

---

## Data & API Design

### Fetch sequencing on preview page load

The analysis call starts **immediately** from `sessionId` (available synchronously from `useSearchParams`) — it does not wait for `fetchSession()` to complete. The speaker name is not needed for the main analysis endpoint. The two fetches (`fetchSession` and `fetchAnalysis`) run in parallel.

### New DB helper

Add `getSubmissionsBySession(sessionId: string)` to `lib/db/student_submissions.ts`. Returns `{ student_name: string; submission_text: string; filename: string }[]`. Used by both API endpoints.

### Session Analysis — `GET /api/sessions/[id]/analysis`

Auth-gated. Fetches:
- `sessions` row (for `output` field and `speaker_name`)
- All `student_submissions` rows for this session via `getSubmissionsBySession`

Sends to Gemini (via new `lib/ai/analysisAgent.ts`):
- Speaker name + session output (to identify which themes exist and what questions map to them)
- All raw student submission texts with student names

Returns structured JSON:
```ts
{
  theme_clusters: Array<{
    name: string
    question_count: number
    top_question: string
    questions: Array<{ text: string; student_name: string }>  // no tier — not in DB
  }>
  tensions: Array<{ label: string; description: string }>
  suggestions: Array<{ text: string; reason: string }>
  blind_spots: Array<{ title: string; description: string }>
  sentiment: { aspirational: number; curious: number; personal: number; critical: number }
}
```

Cached in `sessionStorage` as `analysis_${sessionId}` to avoid re-calling Gemini on revisit.

**Empty submissions:** If `getSubmissionsBySession` returns an empty array, return `{ empty: true }` — the front end renders the empty state panels.

### Theme Deep-Dive — `GET /api/sessions/[id]/theme-analysis?theme=<name>`

Auth-gated. Standalone — does not read from `sessionStorage`. Fetches:
- All `student_submissions` for this session via `getSubmissionsBySession`
- Filters client-side (in the route handler) to questions mentioning the theme, or uses Gemini to identify which submissions belong to the theme if no pre-filtered list is available

Sends to Gemini: theme name, filtered question texts + student names, speaker name.

Returns:
```ts
{
  narrative: string                               // 2-paragraph analysis
  probe_questions: Array<{ question: string; why: string }>
  missed_angles: string[]
  patterns: Array<{ emoji: string; text: string }>  // single emoji, Gemini-generated
}
```

Cached in `sessionStorage` as `theme_${sessionId}_${encodeURIComponent(theme)}`.

---

## Files Affected

### New files
| File | Purpose |
|---|---|
| `app/(app)/preview/theme/page.tsx` | Theme deep-dive page |
| `app/api/sessions/[id]/analysis/route.ts` | Session analysis endpoint |
| `app/api/sessions/[id]/theme-analysis/route.ts` | Theme deep-dive endpoint |
| `lib/ai/analysisAgent.ts` | Gemini calls for both analysis endpoints |
| `components/AnalysisPanelLeft.tsx` | Left panel UI (theme clusters + tensions) |
| `components/AnalysisPanelRight.tsx` | Right panel UI (suggestions + blind spots + sentiment) |
| `types/analysis.ts` | `SessionAnalysis` and `ThemeAnalysis` TypeScript types |

### Modified files
| File | Change |
|---|---|
| `app/(app)/preview/page.tsx` | 3-column layout, parallel fetch for analysis, passes data to panels |
| `lib/db/student_submissions.ts` | Add `getSubmissionsBySession(sessionId)` |
| `lib/constants.ts` | Add `ROUTES.API_SESSION_ANALYSIS` and `ROUTES.API_SESSION_THEME_ANALYSIS` and `ROUTES.PREVIEW_THEME` |
| `types/index.ts` | Re-export from `types/analysis.ts` |

### Reused patterns
- `lib/ai/sqlAgent.ts` — model for Gemini `generateContent` calls with system instructions and JSON output
- `lib/supabase/server.ts` — `createClient()` for auth checks, `createAdminClient()` for DB reads in API routes
- `BRAND` colors from `lib/constants.ts`
- `export const dynamic = 'force-dynamic'` on all new API routes
- No new environment variables needed — reuses `GOOGLE_API_KEY` / `GEMINI_API_KEY` already in use by `sqlAgent.ts`

---

## Verification

1. `npm run dev` — navigate to an existing preview page
2. Both panels appear alongside the existing main content (3-column on wide screen, hidden panels on narrow)
3. Panels show shimmer loading state while Gemini runs, then populate with analysis data
4. `fetchSession` and analysis fetch run in parallel — neither blocks the other
5. Click a theme card → navigates to `/preview/theme?sessionId=...&theme=...`
6. Theme deep-dive shows all questions for that theme + sidebar analysis
7. Navigate directly to the theme URL (no prior preview visit) — page loads correctly without `sessionStorage`
8. Breadcrumb `← SpeakerName` returns to the preview page
9. Revisit the same preview — panels load instantly from `sessionStorage` cache (no new Gemini call)
10. Open a pre-submissions-era session — panels show "No submission data available" empty state
11. `npm run type-check` passes
12. `npm run lint` passes
