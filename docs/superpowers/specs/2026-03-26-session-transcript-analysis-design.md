# Session Transcript Analysis — Design Spec

## Problem

The system currently only analyzes what students submitted *before* the guest speaker session. The richest content — what actually happened during the session — is captured in recordings/transcripts but sits unused. Professors need a way to upload a session transcript and see how preparation compared to reality.

## Solution

Add transcript upload and AI analysis to the Preview page. Professors upload a transcript file (or paste text) and get a structured comparison of their prepared interview sheet vs. what actually occurred, plus a narrative summary of the session.

---

## Architecture

### Data Flow

```
Professor on /preview → clicks "Transcript" or "Summary" tab
    ↓
Empty state: TranscriptUpload component (drop zone + paste textarea)
    ↓  (professor drops file or pastes text)
POST /api/sessions/[id]/transcript (FormData or JSON)
    ↓
API route:
  1. Auth check (getCurrentUser + session ownership)
  2. Parse file → clean text (VTT/SRT/TXT/DOCX/PDF)
  3. Fetch session context (output, themes, submissions)
  4. Two parallel Gemini calls → structured analysis JSON
  5. Insert into session_transcripts table
  6. Return analysis JSON
    ↓
Client: cache in sessionStorage as transcript_${sessionId}, display results
```

Repeat visits: check `sessionStorage` first, then `GET /api/sessions/[id]/transcript` (DB read, no Gemini call).

### Tab Structure

Preview page tabs become: **Questions | Analysis | Insights | Transcript | Summary**

- **Transcript** tab: analytical content (coverage map, theme reconciliation, question performance)
- **Summary** tab: narrative content (key quotes, unexpected topics, follow-ups, session narrative)

When no transcript exists, both tabs show the same `TranscriptUpload` empty state.

---

## Database

### New Table: `session_transcripts`

```sql
CREATE TABLE session_transcripts (
  id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID            NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id         UUID            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  raw_transcript  TEXT            NOT NULL,
  source_format   TEXT            NOT NULL CHECK (source_format IN ('txt','vtt','srt','docx','pdf','paste')),
  analysis        JSONB           NOT NULL,
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX session_transcripts_session_id_idx ON session_transcripts(session_id);
ALTER TABLE session_transcripts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own session transcripts"
  ON session_transcripts FOR SELECT
  USING (auth.uid() = user_id);
```

One transcript per session (UNIQUE on `session_id`). Writes via `createAdminClient()`. Raw transcript stored for future re-analysis and debrief integration. Re-uploading replaces the existing transcript (DELETE + INSERT).

---

## TypeScript Interfaces

### Analysis JSONB Structure

```typescript
// types/transcript.ts

export type CoverageDepth = 'none' | 'brief' | 'moderate' | 'deep'
export type TranscriptSourceFormat = 'txt' | 'vtt' | 'srt' | 'docx' | 'pdf' | 'paste'

export interface SectionCoverage {
  section_number: number
  section_title: string
  depth: CoverageDepth
  evidence: string  // brief transcript excerpt supporting the rating
}

export interface ThemeReconciliation {
  prepared_theme: string
  was_discussed: boolean
  transcript_treatment: string  // how it appeared in conversation
  surprise_level: 'expected' | 'shifted' | 'absent'
}

export interface QuestionPerformance {
  question_text: string
  student_name: string  // "FirstName L." format
  was_asked: boolean
  response_richness: 'rich' | 'moderate' | 'thin' | 'not_asked'
  speaker_quote: string | null
}

export interface KeyQuote {
  text: string       // verbatim from transcript
  context: string    // what prompted this quote
  theme: string      // related theme
}

export interface UnexpectedTopic {
  title: string
  description: string
  transcript_excerpt: string
}

export interface FollowUpOpportunity {
  topic: string
  what_was_said: string
  suggested_followup: string
}

export interface TranscriptAnalysis {
  // Transcript tab (analytical)
  coverage_map: SectionCoverage[]
  theme_reconciliation: ThemeReconciliation[]
  question_performance: QuestionPerformance[]
  // Summary tab (narrative)
  key_quotes: KeyQuote[]
  unexpected_topics: UnexpectedTopic[]
  followup_opportunities: FollowUpOpportunity[]
  session_narrative: string  // 3-5 paragraphs markdown
}

// DB row (snake_case)
export interface SessionTranscriptRow {
  id: string
  session_id: string
  user_id: string
  raw_transcript: string
  source_format: TranscriptSourceFormat
  analysis: TranscriptAnalysis
  created_at: string
}

// App type (camelCase)
export interface SessionTranscript {
  id: string
  sessionId: string
  userId: string
  rawTranscript: string
  sourceFormat: TranscriptSourceFormat
  analysis: TranscriptAnalysis
  createdAt: string
}
```

### Transcript Parser Types

```typescript
// lib/parse/transcript.ts

export interface TranscriptLine {
  speaker: string | null  // e.g. "Speaker 1", null if no label detected
  text: string
}

export interface TranscriptResult {
  lines: TranscriptLine[]
  format: 'vtt' | 'srt' | 'txt' | 'docx' | 'pdf'
}
```

---

## Transcript Parsing

### Strategy

Custom parsers for VTT/SRT (no npm deps — simple text formats). Reuse existing `pdf.ts` and `docx.ts`. All parsers follow the existing fail-safe pattern: `try/catch → return empty on failure`.

Parsers return structured `TranscriptLine[]` (preserving speaker attribution), then `transcriptToPlainText()` flattens for Gemini consumption.

### VTT Parser (`lib/parse/vtt.ts`)

1. Strip BOM, normalize line endings
2. Validate `WEBVTT` header, strip header block
3. Split on double-newline into cue blocks
4. Per block: skip sequence numbers + timestamp lines, join remaining lines
5. Detect speaker labels via regex: `/^([^:.,?!]{1,50}):\s+(.+)$/s`
6. Handle Zoom quirks: strip `<v>` voice tags, deduplicate consecutive identical cues, skip NOTE/STYLE blocks

### SRT Parser (`lib/parse/srt.ts`)

1. Strip BOM, normalize line endings
2. Split on double-newline into blocks
3. Per block: skip sequence number line + timestamp line, join text lines
4. Detect optional speaker labels (same regex as VTT)

### TXT Parser (`lib/parse/txt.ts`)

1. Decode UTF-8, trim, split lines, detect speaker labels

### Unified Entry Point (`lib/parse/transcript.ts`)

```typescript
export async function parseTranscript(buffer: Buffer, format: string): Promise<TranscriptResult>
export function transcriptToPlainText(result: TranscriptResult, options?: { includeSpeakers?: boolean }): string
```

Routes to format-specific parsers. For DOCX/PDF, wraps existing parser output as a single `TranscriptLine`.

---

## AI Analysis

### Gemini Strategy: Two Parallel Calls

Using `Promise.all()` for two focused prompts. Better output quality, no latency penalty, partial failure resilience.

**Call 1 — Transcript Analysis (Tab 1):**
- Input: session output (interview sheet), themes, student submissions, transcript
- Output: `{ coverage_map, theme_reconciliation, question_performance }`
- System instruction: "You are an expert post-session analyst for university guest speaker events. Compare what was prepared with what actually happened. Always respond with valid JSON only."
- Key instructions: rate coverage depth by dialogue devoted to each section, use "FirstName L." format for student names

**Call 2 — Session Summary (Tab 2):**
- Input: transcript, speaker name, themes
- Output: `{ key_quotes, unexpected_topics, followup_opportunities, session_narrative }`
- System instruction: "You are an expert at summarizing university guest speaker sessions. Extract the most valuable insights for the professor. Always respond with valid JSON only."
- Key instructions: select 5-10 most impactful verbatim quotes, identify organic topics not in prepared themes, suggest 3-5 follow-up threads

Both calls use `responseMimeType: 'application/json'` and the `getGeminiClient()` pattern from `analysisAgent.ts`.

### Implementation: `lib/ai/transcriptAnalysis.ts`

```typescript
export async function runTranscriptAnalysis(
  speakerName: string,
  sessionOutput: string,
  themes: string[],
  submissions: Array<{ student_name: string; submission_text: string }>,
  transcript: string
): Promise<TranscriptAnalysis>
```

---

## Components

### TranscriptUpload (`components/TranscriptUpload.tsx`)

Empty-state upload component shown when no transcript exists. Follows `DropZone.tsx` visual patterns.

**Props:** `{ sessionId: string, onUploadComplete: (analysis: TranscriptAnalysis) => void }`

**Layout:**
- Drag-and-drop zone accepting .txt, .vtt, .srt, .docx, .pdf
- "— or paste below —" divider
- Textarea with placeholder "Paste your transcript here..."
- "Analyze Transcript" button (orange, disabled until file selected or text pasted)
- Supported formats hint text

**States:** idle → file selected (shows name/size) → processing (progress animation) → done (calls onUploadComplete)

Processing messages cycle: "Parsing transcript..." → "Comparing against prepared questions..." → "Analyzing coverage and themes..." → "Generating session summary..." (cosmetic timing, matching `ProcessingView` pattern)

### CoverageMap (`components/CoverageMap.tsx`)

Horizontal bar chart for the 10 interview sheet sections.

**Props:** `{ sections: SectionCoverage[] }`

- Bar width: none=0%, brief=25%, moderate=60%, deep=100%
- Colors: deep = green (`BRAND.GREEN`), moderate = orange (`BRAND.ORANGE`), brief = purple (`BRAND.PURPLE`), none = empty with "Not discussed" text
- Section title on left (180px), depth badge label inside bar
- Legend row below

### TranscriptAnalysisPanel (`components/TranscriptAnalysisPanel.tsx`)

Renders coverage map + theme reconciliation + question performance. Follows `AnalysisPanelLeft.tsx` patterns (layout, skeleton loading, error states, "Powered by Gemini" footer).

- **Coverage Map:** CoverageMap component
- **Theme Reconciliation:** List with status icons — checkmark (discussed), warning (shifted), X (absent). Shows `transcript_treatment` text.
- **Question Performance:** List of questions with student name, richness badge, and speaker quote excerpt

### TranscriptSummaryPanel (`components/TranscriptSummaryPanel.tsx`)

Renders key quotes + unexpected topics + follow-ups + narrative. Follows `AnalysisPanelRight.tsx` patterns.

- **Key Quotes:** Quote cards with teal/green accent (matching "Gemini Suggests" style)
- **Unexpected Topics:** Cards with orange accent, includes transcript excerpt
- **Follow-Up Opportunities:** Cards with green accent
- **Session Narrative:** Rendered markdown paragraphs

---

## Error Handling

| Scenario | Handling |
|---|---|
| Transcript too short (<100 chars) | 400 error: "Transcript appears too short for meaningful analysis" |
| Transcript too long (>200K chars) | Truncate to 180K + "[TRANSCRIPT TRUNCATED]" note; log warning |
| Re-upload | DELETE existing + INSERT new (professor can replace a transcript; "Replace Transcript" link shown in results view) |
| Parse failure | Returns empty string → triggers "too short" check |
| One Gemini call fails | Store partial results; show error banner on failed tab with retry |
| Both Gemini calls fail | 500 with Gemini error message |
| File size >10MB | Rejected client-side and server-side |
| Missing session data (no themes/submissions) | Analysis still runs; prompt notes "No prepared themes available" |

### Privacy

Student names in transcript analysis output use "FirstName L." format (matching existing convention). Gemini prompt explicitly instructs: "When referencing any student by name, always use 'FirstName L.' format."

Raw transcript is stored as-is in `raw_transcript` column (may contain full names from spoken conversation).

---

## New Files

| File | Purpose |
|---|---|
| `types/transcript.ts` | TypeScript interfaces for transcript analysis |
| `lib/parse/vtt.ts` | WebVTT parser |
| `lib/parse/srt.ts` | SRT parser |
| `lib/parse/txt.ts` | Plain text parser |
| `lib/parse/transcript.ts` | Unified entry point + TranscriptLine types + toPlainText |
| `lib/ai/transcriptAnalysis.ts` | Gemini prompts and runner |
| `lib/db/sessionTranscripts.ts` | DB CRUD functions |
| `app/api/sessions/[id]/transcript/route.ts` | POST (upload+analyze) and GET (retrieve cached) |
| `components/TranscriptUpload.tsx` | Upload empty state component |
| `components/CoverageMap.tsx` | Horizontal bar chart visualization |
| `components/TranscriptAnalysisPanel.tsx` | Tab 1 display component |
| `components/TranscriptSummaryPanel.tsx` | Tab 2 display component |
| `supabase/migrations/20260326000001_session_transcripts.sql` | DB migration |

## Modified Files

| File | Change |
|---|---|
| `types/index.ts` | Add `export * from './transcript'` |
| `lib/constants.ts` | Add `API_SESSION_TRANSCRIPT` route, `ACCEPTED_TRANSCRIPT_TYPES` |
| `lib/utils/transforms.ts` | Add `rowToSessionTranscript()` |
| `app/(app)/preview/page.tsx` | Add two new tabs, wire transcript state, integrate components |

---

## Debrief Integration Hooks

The `session_transcripts` table uses `session_id` as FK, making it trivially joinable with a future `session_debriefs` table on the same key. The raw transcript is stored, enabling future re-analysis that combines professor debrief notes with objective transcript content.

---

## Verification

1. Upload a `.vtt` file from a Zoom recording → analysis appears within 60 seconds
2. Upload a `.txt` file with pasted text → same result
3. Refresh the page → analysis loads from DB cache (no Gemini call)
4. Coverage map shows clear depth differentiation across sections
5. Key quotes are verbatim from the transcript, not paraphrased
6. Student names in analysis use "FirstName L." format
7. `npm run type-check` passes
8. `npm run build` succeeds
