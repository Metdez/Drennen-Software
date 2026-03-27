# End-of-Semester Report — Design Spec & Implementation Plan

## Context

Professor Drennen accumulates 10–15 guest speaker sessions, 200–600 student submissions, and dozens of theme clusters per semester. All this data lives in the system but there's no way to see it as a single, coherent story. The semester report synthesizes everything into a professionally formatted document for self-reflection, departmental presentations, tenure cases, and future course planning.

This feature also introduces two prerequisites: **session debriefs** (post-session professor reflections) and **tier parsing** (structured extraction of question quality tiers from AI output).

---

## Design Decisions (User-Approved)

- **Architecture:** Parallelized batch generation — single API call, parallel data fetch + parallel Gemini calls, ~30-45s
- **Debrief capture:** Simple post-session form (1-5 stars, highlights, improvements, optional notes)
- **Tier data:** Parse from existing AI markdown output into structured DB records
- **PDF charts:** React-PDF SVG primitives (vector, no extra dependencies)
- **Report access:** "Generate Report" button on analytics page with date range picker
- **Report storage:** Persisted in `semester_reports` table for re-download

---

## 1. Database Schema

### 1.1 `session_debriefs` table

```sql
CREATE TABLE session_debriefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  highlights TEXT NOT NULL DEFAULT '',
  improvements TEXT NOT NULL DEFAULT '',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id)
);

-- RLS: professors can read/write their own debriefs
ALTER TABLE session_debriefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own debriefs" ON session_debriefs
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own debriefs" ON session_debriefs
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own debriefs" ON session_debriefs
  FOR UPDATE USING (user_id = auth.uid());
```

### 1.2 `session_tier_data` table

```sql
CREATE TABLE session_tier_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  tier_counts JSONB NOT NULL DEFAULT '{}',
  tier_assignments JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id)
);

ALTER TABLE session_tier_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own tier data" ON session_tier_data
  FOR SELECT USING (
    session_id IN (SELECT id FROM sessions WHERE user_id = auth.uid())
  );
```

### 1.3 `semester_reports` table

```sql
CREATE TABLE semester_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  content JSONB NOT NULL DEFAULT '{}',
  session_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE semester_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own reports" ON semester_reports
  FOR SELECT USING (user_id = auth.uid());
```

---

## 2. Tier Classification

### 2.1 Why not regex parsing?

The AI prompt (`lib/ai/prompt.ts`, line 51) explicitly instructs: **"Do not include tier labels"** in the output. The tier ranking system (Tier 1–4) is an internal quality guide the AI uses when selecting Primary/Backup questions, but no tier markers appear in the generated markdown. Regex parsing cannot extract tiers.

### 2.2 Approach: Gemini Tier Classifier — `lib/ai/tierClassifier.ts`

A lightweight Gemini call that takes the generated interview sheet + the original tier definitions and classifies each of the 20 questions (10 Primary + 10 Backup) into Tier 1–4.

```typescript
async function classifyQuestionTiers(
  speakerName: string,
  output: string  // the generated markdown interview sheet
): Promise<TierData>
```

**Prompt strategy:**
- System instruction: "You are an expert at evaluating student interview questions. Given the tier definitions and an interview sheet, classify each question."
- Includes the 4 tier definitions from the original system prompt
- Asks Gemini to return JSON with tier assignment per question
- Uses `responseMimeType: 'application/json'` (same pattern as all other Gemini calls)

**Output type:**
```typescript
interface TierData {
  tierCounts: Record<string, number>  // { "1": 3, "2": 5, "3": 8, "4": 2 }
  tierAssignments: Array<{
    tier: number
    themeNumber: number
    themeTitle: string
    questionType: 'primary' | 'backup'
    studentName: string
  }>
}
```

### 2.3 Integration

- **New sessions:** Classifier runs fire-and-forget in `POST /api/process` after session save (same pattern as `generateClassInsights()`), saves to `session_tier_data` via admin client
- **Existing sessions:** One-time backfill script (`scripts/backfill-tiers.ts`) that fetches all sessions and runs the classifier on each
- **DB functions:** `lib/db/tierData.ts` — `upsertTierData(sessionId, tierData)`, `getTierData(sessionId)`, `getTierDataBySessionIds(sessionIds)`
- **Cost/speed:** Single Gemini call per session with small input (~2KB of markdown). Fast and cheap.

---

## 3. Debrief Capture

### 3.1 UI: Preview page debrief button

On `/preview` page header (next to download buttons):
- "Add Debrief" button (or "Edit Debrief" if one exists)
- Opens a modal with:
  - 5 clickable stars for rating
  - "What went well?" textarea (highlights)
  - "What would you improve?" textarea (improvements)
  - "Additional notes" collapsible textarea (optional)
  - Save / Cancel buttons
- On save, POST to API; on success, show success toast and update button text to "Edit Debrief"

### 3.2 API Routes

- `POST /api/sessions/[id]/debrief` — upsert debrief (create or update)
  - Body: `{ rating, highlights, improvements, notes? }`
  - Auth + ownership check
  - Uses admin client to upsert

- `GET /api/sessions/[id]/debrief` — fetch debrief for a session
  - Returns `{ debrief: SessionDebrief | null }`

### 3.3 DB Functions: `lib/db/debriefs.ts`

```typescript
upsertDebrief(sessionId: string, userId: string, data: DebriefInput): Promise<void>
getDebrief(sessionId: string): Promise<SessionDebrief | null>
getDebriefsByUser(userId: string): Promise<SessionDebrief[]>
getDebriefsBySessionIds(sessionIds: string[]): Promise<Map<string, SessionDebrief>>
```

### 3.4 History page integration

Sessions with debriefs show a small star rating (e.g., "★ 4/5") next to the speaker name in the sessions list.

### 3.5 Types: `types/debrief.ts`

```typescript
interface SessionDebrief {
  id: string
  sessionId: string
  userId: string
  rating: number
  highlights: string
  improvements: string
  notes: string | null
  createdAt: string
}

interface DebriefInput {
  rating: number
  highlights: string
  improvements: string
  notes?: string
}
```

---

## 4. Report Generation Pipeline

### 4.1 Report Agent: `lib/ai/reportAgent.ts`

**Orchestrator:**
```typescript
async function generateSemesterReport(
  userId: string,
  config: ReportConfig
): Promise<ReportContent>
```

**Step 1 — Data aggregation (parallel):**
```typescript
const [analytics, themes, insightsInput, classInsights, debriefs, tierData, roster] =
  await Promise.all([
    getAnalytics(userId),
    getThemeFrequency(userId),
    fetchInsightsInput(userId),
    getClassInsights(userId),
    getDebriefsByUser(userId),
    getTierDataBySessionIds(sessionIds),
    getStudentsWithParticipation(),
  ])
```

Filter all data by `config.dateRange` (start/end dates) and `config.sessionIds`.

**Step 2 — AI generation (parallel, only included sections):**

Each AI function receives the relevant data subset and returns structured JSON:

| Function | Input | Output |
|---|---|---|
| `generateExecutiveSummary()` | All aggregated data | `{ narrative: string, highlights: string[], keyMetrics: {...} }` |
| `generateThemeEvolution()` | Theme frequency + evolution timeline | `{ narrative: string, timeline: [...], dominantThemes: [...] }` |
| `generateStudentGrowthHighlights()` | Submission data + tier trends | `{ highlights: StudentGrowthHighlight[], narrative: string }` |
| `generateBlindSpotsAndRecs()` | All themes + session data | `{ blindSpots: [...], recommendations: [...] }` |
| `generateSpeakerEffectiveness()` | Debriefs + tier data + engagement | `{ rankings: [...], narrative: string }` (only if debriefs exist) |
| `generateQualityTrendNarrative()` | Tier data across sessions | `{ narrative: string, trend: 'improving'|'declining'|'stable' }` |

```typescript
const aiSections = await Promise.all(
  includedAISections.map(section => section.generator(data))
)
```

**Step 3 — Assembly:**

Combine AI outputs with pure-data sections (semester_at_a_glance, session_summaries, student_engagement, appendix_roster) into a single `ReportContent` JSON object keyed by section ID.

**Step 4 — Save and return:**

Insert into `semester_reports` table, return report ID.

### 4.2 Gemini prompt patterns

Each AI function follows the existing codebase pattern:
- `@google/genai` client with `GEMINI_API_KEY`
- `responseMimeType: 'application/json'` for structured output
- System instruction: role-specific (e.g., "You are an expert educational analyst writing a semester report for a university course...")
- Strip markdown fences from response (same sanitization as `classInsights.ts`)

### 4.3 Report Config: `types/report.ts`

```typescript
interface ReportConfig {
  title: string
  dateRange: { start: string; end: string } | null  // null = all sessions
  includedSections: string[]  // section keys to include
  customNotes?: string  // optional professor notes for exec summary
}

interface ReportContent {
  executive_summary?: ExecutiveSummarySection
  semester_at_a_glance?: SemesterGlanceSection
  session_summaries?: SessionSummariesSection
  theme_evolution?: ThemeEvolutionSection
  student_engagement?: StudentEngagementSection
  student_growth?: StudentGrowthSection
  question_quality?: QuestionQualitySection
  blind_spots?: BlindSpotsSection
  speaker_effectiveness?: SpeakerEffectivenessSection
  appendix_roster?: AppendixRosterSection
  generatedAt: string
  config: ReportConfig
}
```

---

## 5. Report Configuration UI

### 5.1 Analytics page integration

New "Generate Semester Report" button in the analytics page header area. Clicking opens a config panel/modal:

- **Title:** Pre-filled text input ("MGMT 305 — Spring 2026")
- **Date range:** Two date pickers (start, end). Default: earliest session → latest session.
- **Sections:** Checkboxes for all 10 sections, all checked by default. Professor unchecks sections to exclude.
  - Sections that require debrief data are visually marked if no debriefs exist (e.g., grayed out with "No debrief data" note)
  - Sections that require tier data are visually marked if no tier data exists
- **Generate button:** Triggers API call, shows loading state with "Generating report..." message

### 5.2 Post-generation

On success, redirect to `/reports/[id]` to view the generated report.

---

## 6. Report Viewing

### 6.1 Route: `app/(app)/reports/[id]/page.tsx`

A print-optimized web page that renders the full report:

- Clean layout with brand colors (BRAND.ORANGE, BRAND.PURPLE, BRAND.GREEN)
- Each section as a visually distinct block with clear headings
- Charts rendered using **recharts** (for web view — interactive, responsive)
- Print CSS (`@media print`) for clean browser-native print output
- Header: report title, date range, generation date
- Navigation: table of contents with anchor links to each section

### 6.2 Section renderers

Each section has a dedicated React component:
- `ExecutiveSummarySection` — narrative text + key metrics cards
- `SemesterGlanceSection` — stat cards + bar charts (sessions over time, tier distribution)
- `SessionSummariesSection` — chronological card list with speaker, date, themes, debrief rating
- `ThemeEvolutionSection` — narrative + visual timeline (horizontal, sessions as columns, theme pills)
- `StudentEngagementSection` — participation stats + tier breakdown table
- `StudentGrowthSection` — growth highlight cards with anonymized student names
- `QuestionQualitySection` — tier distribution chart over time + narrative
- `BlindSpotsSection` — blindspot cards + recommendation list
- `SpeakerEffectivenessSection` — ranked speaker table with ratings + tier data
- `AppendixRosterSection` — full roster table with checkmarks per session

### 6.3 Download buttons

Header area has "Download PDF" and "Download DOCX" buttons, same pattern as existing session downloads.

---

## 7. Report PDF Export

### 7.1 File: `lib/export/reportPdf.ts`

Uses `@react-pdf/renderer` with the existing styling patterns from `lib/export/pdf.ts`.

**Chart rendering:** React-PDF's built-in `<Svg>`, `<Rect>`, `<Line>`, `<Text>` (SVG), `<Circle>` components to draw:
- **Bar charts** (tier distribution, submissions per session): Horizontal or vertical bars using `<Rect>` with brand colors
- **Trend lines** (participation over time): `<Line>` elements connecting data points
- **Percentage bars** (theme frequency): Colored `<Rect>` bars with percentage labels
- **Tables** (roster, session summaries): `<View>` rows with `<Text>` cells and border styles

**Layout:**
- Professional header with title, date range, generation date
- Page breaks between major sections
- Table of contents on page 2
- Page numbers in footer
- Brand colors for accents (BRAND.ORANGE for headers, BRAND.PURPLE for data highlights)

### 7.2 File: `lib/export/reportDocx.ts`

Uses `docx` library with existing patterns from `lib/export/docx.ts`. Tables instead of charts. Same content structure as PDF but editable.

### 7.3 API Route: `GET /api/reports/[id]/download`

- Query param: `?format=pdf|docx`
- Auth + ownership check
- Fetch report from `semester_reports` table
- Generate PDF or DOCX from `content` JSONB
- Return as attachment with appropriate MIME type

---

## 8. Route & Navigation Updates

### 8.1 New routes

```
app/(app)/reports/[id]/page.tsx    → report viewer
app/api/reports/generate/route.ts  → POST: generate report
app/api/reports/[id]/route.ts      → GET: fetch report data
app/api/reports/[id]/download/route.ts → GET: download PDF/DOCX
app/api/sessions/[id]/debrief/route.ts → GET/POST: debrief CRUD
```

### 8.2 Navigation

Add route constants to `lib/constants.ts`:
- `ROUTES.REPORT`: `(id) => /reports/${id}`
- `ROUTES.API_REPORT_GENERATE`: `/api/reports/generate`
- `ROUTES.API_REPORT_DOWNLOAD`: `(id) => /api/reports/${id}/download`
- `ROUTES.API_SESSION_DEBRIEF`: `(id) => /api/sessions/${id}/debrief`

### 8.3 Middleware

Add `/reports` to the protected routes list in `middleware.ts`.

---

## 9. Edge Cases

- **Few sessions (< 3):** Executive summary adapts language. Theme evolution and dropoff sections show limited data with explanation. Student growth section may be skipped.
- **No debriefs:** Speaker Effectiveness section auto-excluded (or shows "No debrief data" message). Session summaries omit rating.
- **No tier data (legacy sessions):** Quality trends section shows "Tier data not available for sessions before [date]" for un-backfilled sessions.
- **Single student:** Engagement and growth sections still render but with appropriate framing.
- **Very large semesters (15+ sessions, 600+ submissions):** Data aggregation may be slow — `Promise.all` parallelization handles this. Gemini prompts are truncated if they exceed token limits (summarize submission data rather than sending raw text).

---

## 10. File Map

### New files
| File | Purpose |
|---|---|
| `supabase/migrations/XXXXXX_add_debriefs.sql` | session_debriefs table + RLS |
| `supabase/migrations/XXXXXX_add_tier_data.sql` | session_tier_data table + RLS |
| `supabase/migrations/XXXXXX_add_semester_reports.sql` | semester_reports table + RLS |
| `types/debrief.ts` | SessionDebrief, DebriefInput types |
| `types/report.ts` | ReportConfig, ReportContent, section types |
| `types/tier.ts` | TierData, TierAssignment types |
| `lib/db/debriefs.ts` | Debrief CRUD functions |
| `lib/db/tierData.ts` | Tier data CRUD functions |
| `lib/db/reports.ts` | Report CRUD functions |
| `lib/ai/tierClassifier.ts` | Gemini-powered tier classifier for questions |
| `scripts/backfill-tiers.ts` | One-time backfill script for existing sessions |
| `lib/ai/reportAgent.ts` | Report AI generation orchestrator + section generators |
| `lib/export/reportPdf.ts` | Semester report PDF renderer with SVG charts |
| `lib/export/reportDocx.ts` | Semester report DOCX renderer |
| `app/api/sessions/[id]/debrief/route.ts` | Debrief API (GET/POST) |
| `app/api/reports/generate/route.ts` | Report generation API (POST) |
| `app/api/reports/[id]/route.ts` | Fetch report data (GET) |
| `app/api/reports/[id]/download/route.ts` | Download report PDF/DOCX (GET) |
| `app/(app)/reports/[id]/page.tsx` | Report viewer page |
| `components/DebriefModal.tsx` | Debrief capture modal component |
| `components/ReportConfigPanel.tsx` | Report configuration panel |
| `components/report/` | Report section renderer components |

### Modified files
| File | Change |
|---|---|
| `app/(app)/preview/page.tsx` | Add "Add Debrief" button |
| `app/(app)/history/page.tsx` | Show debrief rating badge |
| `app/(app)/analytics/page.tsx` | Add "Generate Report" button + config panel |
| `app/api/process/route.ts` | Add tier parsing step after theme parsing |
| `lib/constants.ts` | Add new route constants |
| `middleware.ts` | Add `/reports` to protected routes |
| `types/index.ts` | Re-export new types |

---

## 11. Verification Plan

### Unit-level
- Tier parser: test with sample AI output markdown, verify correct tier extraction
- Report section generators: test each AI function with mock data, verify JSON structure

### Integration
- Run `npm run type-check` after all changes
- Run `npm run build` to verify no build errors
- Run `npm run lint` to check linting

### End-to-end manual testing
1. **Debrief flow:** Open a session preview → click "Add Debrief" → fill form → save → verify badge appears in history
2. **Tier parsing:** Upload a new ZIP → verify `session_tier_data` row created → verify tier counts are reasonable
3. **Report generation:** Go to analytics → click "Generate Report" → configure sections → generate → verify report renders with all sections
4. **Report download:** On report page → click "Download PDF" → verify PDF opens with charts and formatted content → same for DOCX
5. **Edge cases:** Generate report with only 1-2 sessions → verify graceful degradation. Generate report with no debriefs → verify speaker effectiveness section is excluded.

### Database
- Run `supabase db reset` to verify migrations apply cleanly
- Verify RLS policies work (professor can only see own data)

---

## 12. Implementation Order

**Phase 1: Foundation (DB + Types + Parsing)**
1. Create all 3 migration files (debriefs, tier_data, semester_reports)
2. Create type files (debrief.ts, tier.ts, report.ts)
3. Create tier classifier (lib/ai/tierClassifier.ts)
4. Create DB functions (debriefs.ts, tierData.ts, reports.ts)
5. Integrate tier classification into POST /api/process (fire-and-forget)
6. Run type-check

**Phase 2: Debrief Capture**
7. Create debrief API route (GET/POST)
8. Create Debrief modal component
9. Integrate debrief button into preview page
10. Add debrief rating badge to history page
11. Test debrief flow end-to-end

**Phase 3: Report Generation**
12. Create report AI agent (lib/ai/reportAgent.ts) with all section generators
13. Create report generation API route (POST /api/reports/generate)
14. Create report fetch API route (GET /api/reports/[id])
15. Test generation pipeline with real data

**Phase 4: Report Viewing**
16. Create report viewer page (app/(app)/reports/[id]/page.tsx)
17. Create report section renderer components
18. Add report config panel to analytics page
19. Update middleware, constants, navigation
20. Test web viewing end-to-end

**Phase 5: Report Export**
21. Create report PDF renderer with SVG charts
22. Create report DOCX renderer
23. Create report download API route
24. Test PDF/DOCX output

**Phase 6: Polish**
25. Tier data backfill for existing sessions
26. Edge case handling (few sessions, no debriefs, no tier data)
27. Full end-to-end testing
28. Type-check + build + lint
