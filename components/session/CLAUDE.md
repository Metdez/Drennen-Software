# components/session/ — Session Workflow UI

## Purpose

Upload, preview, sharing, and prompt-customization components for the core session processing flow.

## Component Catalog

| Component | Purpose | Used by pages | API routes called |
|-----------|---------|---------------|-------------------|
| `DropZone.tsx` | Drag-and-drop + click-to-browse ZIP file selector | `app/(app)/dashboard/page.tsx` | None (validates locally; parent submits) |
| `SpeakerInput.tsx` | Controlled text input for the guest speaker's name | `app/(app)/dashboard/page.tsx` | None (pure controlled input) |
| `ProcessingView.tsx` | Animated progress screen during ZIP → AI pipeline | `app/(app)/dashboard/page.tsx` | None (receives `done`/`error` props from parent) |
| `OutputPreview.tsx` | Structured 10-section interview sheet display | `app/(app)/preview/page.tsx` (questions tab) | None (parses `output` prop via `parseSections()`) |
| `DownloadButtons.tsx` | PDF and DOCX download action buttons | `app/(app)/preview/page.tsx`, `app/(public)/shared/[token]/page.tsx` | `GET /api/sessions/[id]/download?format=pdf\|docx` |
| `ShareButton.tsx` | Toggle share link panel (create / copy / revoke) | `app/(app)/preview/page.tsx` | `GET/POST/DELETE /api/sessions/[id]/share` |
| `SessionsTable.tsx` | Sortable session list with optional compare-mode checkbox selection | `app/(app)/history/page.tsx`, `app/(app)/compare/page.tsx` | None (data passed as prop) |
| `StudentSessionCard.tsx` | Per-student submission card showing questions, reflection, and analysis | `app/(app)/roster/[studentName]/page.tsx` | None (data passed as prop) |
| `SystemPromptEditor.tsx` | Collapsible prompt editor with version history, activate, and re-run actions | `app/(app)/dashboard/page.tsx`, `app/(app)/preview/page.tsx` | `GET/POST /api/system-prompts`, `PATCH /api/system-prompts/[id]/activate`, `POST /api/system-prompts/reset`, `POST /api/sessions/[id]/rerun` |

## Key Patterns

- `DropZone` and `SpeakerInput` are purely controlled; state lives in the parent dashboard page.
- `ProcessingView` uses staged fake progress timers (`useRef` for cancellation) to signal forward motion during unpredictable AI latency.
- `OutputPreview` delegates all parsing to `parseSections()` from `lib/parse/parseQuestions`.
- `DownloadButtons` uses the Blob URL pattern: ephemeral object URL + programmatic anchor click + immediate revoke.
- `ShareButton` and `SystemPromptEditor` each manage a dropdown/panel with outside-click `mousedown` listeners.
- `SessionsTable` supports a `compareMode` prop with FIFO selection capped at 2 sessions.
- `sessionStorage` cache keys on `/preview`: `session_${sessionId}` (AI output), `analysis_${sessionId}` (Gemini analysis).

## Brand Colors

Import `BRAND` from `@/lib/constants`. Never hardcode hex values.
