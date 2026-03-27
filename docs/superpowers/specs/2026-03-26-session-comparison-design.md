# Session Comparison Feature — Design Spec

## Problem

Each session lives in its own silo. The professor can drill into any single session but cannot put two sessions side by side. Questions like "Which speaker drew better Tier 1 questions?" or "Did sentiment shift between the finance speaker and the social entrepreneurship speaker?" are unanswerable without manually cross-referencing two separate session views.

## Solution

A structured comparison view accessible from the History page. The professor selects any two sessions, opens a tabbed comparison page that shows theme overlap, tier quality distribution, sentiment delta, participation overlap, and an AI-generated comparative narrative. Comparisons are saved to the database and shareable via public links.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Entry point | History page only | Sessions are already listed there; simplest UX surface |
| Tier data | Gemini classifies questions during comparison | Tiers aren't in the output markdown; Gemini applies the tier framework to raw submissions |
| Persistence | Full save + share via `saved_comparisons` table | Professor wants to revisit and share comparisons |
| Layout | Tabbed sections | Matches existing Preview page pattern; full-width per tab |
| Architecture | Two-phase API | Data tabs render instantly; AI tabs lazy-load |

---

## 1. Data Model

### New table: `saved_comparisons`

```sql
CREATE TABLE saved_comparisons (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id),
  session_id_a  UUID NOT NULL REFERENCES sessions(id),
  session_id_b  UUID NOT NULL REFERENCES sessions(id),
  ai_comparison JSONB NOT NULL,
  share_token   UUID UNIQUE DEFAULT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One comparison per session pair per user (IDs normalized so session_id_a < session_id_b)
CREATE UNIQUE INDEX idx_saved_comparisons_pair
  ON saved_comparisons (user_id, session_id_a, session_id_b);

-- CHECK constraint: enforce a < b to prevent duplicate pairs in reverse order
ALTER TABLE saved_comparisons ADD CONSTRAINT chk_session_order CHECK (session_id_a < session_id_b);

-- Fast share token lookup
CREATE UNIQUE INDEX idx_saved_comparisons_token
  ON saved_comparisons (share_token) WHERE share_token IS NOT NULL;

-- RLS
ALTER TABLE saved_comparisons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own comparisons"
  ON saved_comparisons FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role inserts comparisons"
  ON saved_comparisons FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role updates comparisons"
  ON saved_comparisons FOR UPDATE
  USING (true);
```

### New types: `types/comparison.ts`

```typescript
export interface SessionComparisonSide {
  session: SessionSummary         // id, speakerName, createdAt, fileCount
  themes: string[]                // ordered theme titles from session_themes
  analysis: SessionAnalysis | null // cached Gemini analysis if available
  studentNames: string[]          // distinct student names from student_submissions
}

export interface ThemeOverlapResult {
  shared: Array<{ themeA: string; themeB: string }>   // matched pairs
  uniqueToA: string[]
  uniqueToB: string[]
}

export interface ParticipationDelta {
  bothSessions: string[]
  onlyA: string[]
  onlyB: string[]
  totalUnique: number
}

export interface ComparisonData {
  a: SessionComparisonSide
  b: SessionComparisonSide
  themeOverlap: ThemeOverlapResult
  participationDelta: ParticipationDelta
  savedComparison: SavedComparison | null  // included if AI analysis already exists
}

export interface TierDistribution {
  tier1: number
  tier2: number
  tier3: number
  tier4: number
}

export interface ComparativeAnalysis {
  tiers: {
    a: TierDistribution
    b: TierDistribution
  }
  narrative: string                // 2-3 paragraph synthesis
  key_differences: Array<{
    title: string
    description: string
    dimension: 'themes' | 'sentiment' | 'participation' | 'quality' | 'engagement'
  }>
  sentiment_shift: {
    summary: string
    notable_changes: Array<{
      dimension: string
      direction: 'up' | 'down' | 'stable'
      detail: string
    }>
  }
  recommendations: Array<{ text: string; reason: string }>
}

export interface SavedComparison {
  id: string
  userId: string
  sessionIdA: string
  sessionIdB: string
  aiComparison: ComparativeAnalysis
  shareToken: string | null
  createdAt: string
}
```

---

## 2. API Routes

### `GET /api/compare?a={sessionIdA}&b={sessionIdB}`

Data aggregation endpoint — no AI calls.

1. `getCurrentUser()` auth check
2. `getSessionById()` for both — verify ownership
3. Parallel fetch:
   - `getThemesBySessionId()` for both (new function in `lib/db/themes.ts`)
   - `getSessionAnalysis()` for both (existing in `lib/db/sessionAnalyses.ts`)
   - `getStudentNamesBySession()` for both (new function in `lib/db/student_submissions.ts`)
   - `getComparison()` to check for existing saved comparison
4. Compute `ThemeOverlapResult` using `themesOverlap()` from `lib/parse/parseThemes.ts`
5. Compute `ParticipationDelta` via set intersection/difference
6. Return `ComparisonData`

### `POST /api/compare/analysis`

Gemini AI call endpoint.

Request body: `{ sessionIdA: string, sessionIdB: string }`

1. Auth check
2. Fetch both sessions, cached analyses, themes, raw student submissions
3. Call `runComparativeAnalysis()` from `lib/ai/comparisonAgent.ts`
4. Upsert result to `saved_comparisons` table
5. Return `{ comparison: SavedComparison }`

### `POST /api/compare/share`

Request body: `{ comparisonId: string }`

- Generates UUID share_token, updates row
- Returns `{ shareToken: string, shareUrl: string }`

### `DELETE /api/compare/share`

Request body: `{ comparisonId: string }`

- Sets share_token to null

### `GET /api/shared/compare/[token]`

Public endpoint — uses admin client to bypass RLS.

- Fetches `saved_comparisons` by share_token
- Fetches both sessions' data (same aggregation as the main compare endpoint)
- Returns full `ComparisonData` with `aiComparison` included

---

## 3. AI Comparison Agent

### File: `lib/ai/comparisonAgent.ts`

Follows the exact pattern of `lib/ai/analysisAgent.ts`.

**Prompt structure:**
- Role: "You are an expert at comparative analysis of university guest speaker sessions"
- Context: Both speakers' names, dates, submission counts
- Both sessions' raw student submissions (for tier classification)
- The full tier framework definition (Tier 1: tension/trade-off, Tier 2: specific experience, Tier 3: strategic insight, Tier 4: generic advice)
- Theme overlap data (shared themes, unique themes)
- Sentiment data from cached `SessionAnalysis` (if available)
- Participation overlap counts
- Output: JSON matching `ComparativeAnalysis` type
- Rules: 3-5 key_differences, 2-3 recommendations, tier counts must match total questions, narrative must synthesize rather than restate

**Key prompt instructions:**
- Classify every raw student question into exactly one tier using the provided definitions
- Return tier counts per session
- The narrative must provide genuine insight about what the comparison reveals about pedagogical effectiveness
- Key differences should surface patterns not visible from viewing sessions individually

---

## 4. New DB Functions

### `lib/db/themes.ts` — add:

```typescript
getThemesBySessionId(sessionId: string): Promise<string[]>
```
Queries `session_themes` where `session_id = sessionId`, ordered by `theme_number`, returns array of `theme_title` strings.

### `lib/db/student_submissions.ts` — add:

```typescript
getStudentNamesBySession(sessionId: string): Promise<string[]>
```
Queries `student_submissions` where `session_id = sessionId`, returns distinct `student_name` values. Lighter than `getSubmissionsBySession()`.

### `lib/db/comparisons.ts` — new file:

```typescript
getComparison(userId: string, sessionIdA: string, sessionIdB: string): Promise<SavedComparison | null>  // normalizes a < b
upsertComparison(userId: string, sessionIdA: string, sessionIdB: string, analysis: ComparativeAnalysis): Promise<SavedComparison>  // normalizes a < b
enableComparisonShare(comparisonId: string, userId: string): Promise<string>  // returns token
revokeComparisonShare(comparisonId: string, userId: string): Promise<void>
getComparisonByShareToken(token: string): Promise<SavedComparison | null>  // admin client
```

---

## 5. UI — History Page Compare Mode

### Modified: `components/SessionsTable.tsx`

New props:
- `compareMode: boolean`
- `selectedIds: string[]`
- `onSelectionChange: (ids: string[]) => void`

When `compareMode = true`:
- Each row shows a circular checkbox (left side) instead of arrow (right side)
- Row click toggles selection instead of navigating
- Selected rows: orange left border + elevated background
- Max 2 selections — selecting a 3rd deselects the oldest (FIFO)
- All props are optional; when omitted, component behaves exactly as today

### Modified: `app/(app)/history/page.tsx`

- Server component stays for data fetch
- New `HistoryContent` client component wraps header + table
- Header gets a "Compare" pill button (orange outline toggle)
- When 2 sessions selected: floating bottom bar appears with "Compare [Speaker A] vs [Speaker B]" button
- Button navigates to `/compare?a={id}&b={id}`

---

## 6. UI — Comparison Page

### Route: `app/(app)/compare/page.tsx`

Client component with `useSearchParams()`, wrapped in `Suspense`.

### Header

- "← Back to History" link (top left)
- Two-panel VS layout:
  - Left: Speaker A name (Playfair Display), date, "N files" badge
  - Center: "VS" divider with decorative orange rule
  - Right: Speaker B name, date, badge
- Share button (only visible after AI analysis has been generated and saved)

### Tab Bar (6 tabs)

Orange bottom border for active tab. Matches existing Preview page pattern.

#### Tab 1: Overview
- 2x3 grid of stat comparison cards:
  - Submissions count (A vs B)
  - Theme count with shared count
  - Student overlap count
  - Dominant sentiment for each
- Quick "Key Differences" preview (from AI — shows skeleton until loaded)

#### Tab 2: Themes
Three-column layout:
- **Left**: "Only in [Speaker A]" — orange-tinted theme pills
- **Center**: "Shared Themes" — purple-tinted, showing matched pairs (theme A name ↔ theme B name)
- **Right**: "Only in [Speaker B]" — green-tinted theme pills
- Question count badges from `SessionAnalysis.theme_clusters` when available

#### Tab 3: Quality (requires AI analysis)
- If no saved comparison exists: shows a "Generate Comparative Analysis" button (same button appears on AI Analysis tab)
- Clicking the button triggers `POST /api/compare/analysis` and shows a loading skeleton
- Grouped bar chart (recharts `BarChart`):
  - X-axis: Tier 1, Tier 2, Tier 3, Tier 4
  - Two bars per tier: orange (Session A), purple (Session B)
- Summary text: "Speaker A produced N more Tier 1 questions"
- Tier definitions shown as a collapsible reference

#### Tab 4: Sentiment
- Side-by-side horizontal bar chart (recharts):
  - 4 rows: Aspirational, Curious, Personal, Critical
  - Orange bars (A) vs purple bars (B) with percentage labels
- Delta indicators: up/down arrows showing shift direction
- Renders instantly from cached `SessionAnalysis.sentiment`

#### Tab 5: Participation
- Summary line: "32 of 38 students submitted for both sessions"
- Three sections with count badges:
  - "In Both Sessions" — student name list (expandable if >10)
  - "Only in [Speaker A]" — student names
  - "Only in [Speaker B]" — student names

#### Tab 6: AI Analysis (requires AI analysis)
- If no saved comparison: shows "Generate Comparative Analysis" button (shared with Quality tab — triggering from either tab generates both)
- While generating: loading skeleton
- **Comparative Narrative** — 2-3 paragraph card
- **Key Differences** — 3-5 cards with title, description, dimension badge
- **Recommendations** — 2-3 suggestion cards with reason
- "Powered by Gemini" footer with pulse dot

### Sub-components in `components/compare/`

| Component | Purpose |
|-----------|---------|
| `ComparisonHeader.tsx` | VS header with both sessions' metadata |
| `ThemeVenn.tsx` | Three-column theme overlap visualization |
| `QualityComparison.tsx` | Tier distribution recharts bar chart |
| `SentimentComparison.tsx` | Side-by-side sentiment bars |
| `ParticipationDelta.tsx` | Student overlap lists |
| `ComparativeNarrative.tsx` | AI narrative + key differences + recommendations |
| `ComparisonShareButton.tsx` | Share button adapted for comparisons |

### Public comparison page: `app/(public)/shared/compare/[token]/page.tsx`

- Same tab layout but read-only
- No share button, no navigation links
- Footer: "Generated with Drennen MGMT 305"

---

## 7. Data Flow

```
History Page
  ├── Professor clicks "Compare" toggle
  ├── SessionsTable enters checkbox mode
  ├── Professor selects 2 sessions
  ├── Clicks "Compare [A] vs [B]" floating bar
  └── router.push('/compare?a=id1&b=id2')

Compare Page (mount)
  ├── GET /api/compare?a=&b= → ComparisonData
  ├── Renders: Overview, Themes, Sentiment, Participation tabs instantly
  ├── If savedComparison exists → Quality and AI Analysis tabs also ready
  └── If not saved yet → Quality/AI tabs show "Generate Analysis" button

Compare Page (AI trigger)
  ├── User clicks Quality or AI Analysis tab
  ├── POST /api/compare/analysis → Gemini call
  ├── Result saved to saved_comparisons table
  ├── sessionStorage cache: comparison_${idA}_${idB}
  └── Quality + AI Analysis tabs render

Share Flow
  ├── Professor clicks share button
  ├── POST /api/compare/share → generates token
  ├── Copy URL: /shared/compare/{token}
  └── Public viewer sees full comparison (read-only)
```

---

## 8. Files to Create/Modify

### New files
| File | Purpose |
|------|---------|
| `types/comparison.ts` | All comparison type definitions |
| `lib/db/comparisons.ts` | DB access for saved_comparisons |
| `lib/ai/comparisonAgent.ts` | Gemini comparative analysis |
| `app/api/compare/route.ts` | Data aggregation API |
| `app/api/compare/analysis/route.ts` | AI analysis API |
| `app/api/compare/share/route.ts` | Share enable/revoke API |
| `app/api/shared/compare/[token]/route.ts` | Public comparison API |
| `app/(app)/compare/page.tsx` | Comparison page |
| `app/(public)/shared/compare/[token]/page.tsx` | Public comparison view |
| `components/compare/ComparisonHeader.tsx` | VS header |
| `components/compare/ThemeVenn.tsx` | Theme overlap visualization |
| `components/compare/QualityComparison.tsx` | Tier bar charts |
| `components/compare/SentimentComparison.tsx` | Sentiment bars |
| `components/compare/ParticipationDelta.tsx` | Student lists |
| `components/compare/ComparativeNarrative.tsx` | AI narrative display |
| `components/compare/ComparisonShareButton.tsx` | Share button |
| `supabase/migrations/20260326000000_saved_comparisons.sql` | Migration |

### Modified files
| File | Change |
|------|--------|
| `types/index.ts` | Add `export * from './comparison'` |
| `lib/constants.ts` | Add comparison routes |
| `lib/db/themes.ts` | Add `getThemesBySessionId()` |
| `lib/db/student_submissions.ts` | Add `getStudentNamesBySession()` |
| `lib/utils/transforms.ts` | Add `rowToComparison()` transform |
| `components/SessionsTable.tsx` | Add compare mode |
| `app/(app)/history/page.tsx` | Add compare toggle + client wrapper |
| `middleware.ts` | Add `/compare` to protected routes |

---

## 9. Existing Code to Reuse

| What | File | Usage |
|------|------|-------|
| `themesOverlap()` | `lib/parse/parseThemes.ts` | Theme matching in comparison API |
| `getSessionById()` | `lib/db/sessions.ts` | Fetch both sessions |
| `getSessionAnalysis()` | `lib/db/sessionAnalyses.ts` | Get cached sentiment/theme data |
| `getSubmissionsBySession()` | `lib/db/student_submissions.ts` | Raw submissions for AI prompt |
| `createAdminClient()` | `lib/supabase/server.ts` | Public share access |
| `getCurrentUser()` | `lib/db/users.ts` | Auth in API routes |
| `rowToSessionSummary()` | `lib/utils/transforms.ts` | Transform session rows |
| `ShareButton` pattern | `components/ShareButton.tsx` | Adapt for comparison sharing |
| Gemini client pattern | `lib/ai/analysisAgent.ts` | Template for comparisonAgent |

---

## 10. Verification

1. **Compare mode on History**: Toggle compare, select 2 sessions, verify floating bar appears, click navigates to `/compare?a=&b=`
2. **Data tabs render fast**: Overview, Themes, Sentiment, Participation should render in <2 seconds from cached data
3. **AI analysis**: Click Quality or AI Analysis tab, verify loading skeleton appears, Gemini call completes in <15 seconds, results display correctly
4. **Tier chart**: Verify grouped bar chart shows correct tier counts, bars are orange/purple
5. **Persistence**: Revisit the same comparison — AI analysis loads from DB, no re-generation
6. **Share flow**: Enable sharing, copy URL, open in incognito, verify public view renders all tabs
7. **Revoke sharing**: Click "Stop sharing", verify public URL returns error
8. **Edge cases**: Session with no cached analysis (sentiment tab shows "Analysis not available"), session with no student_submissions (participation shows empty)
9. **Auth**: Verify non-owner cannot access another user's comparison via direct URL
10. **Type check**: `npm run type-check` passes
11. **Build**: `npm run build` succeeds
