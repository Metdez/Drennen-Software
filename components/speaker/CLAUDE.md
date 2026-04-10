# components/speaker/ — Speaker Portal UI

## Purpose

Components for speaker brief generation, portal publishing, and student submission uploads (speaker analyses and post-session debrief ZIPs).

## Component Catalog

| Component | Purpose | Used by pages | API routes called |
|-----------|---------|---------------|-------------------|
| `GenerateBriefButton.tsx` | Generates (or navigates to) a speaker brief; checks existence on mount | `app/(app)/preview/page.tsx` | `GET/POST /api/sessions/[id]/brief` |
| `GeneratePortalButton.tsx` | Creates (or navigates to) a speaker portal; checks existence on mount | `app/(app)/preview/page.tsx` | `GET/POST /api/sessions/[id]/portal` |
| `SpeakerAnalysisPanel.tsx` | Renders the full Gemini speaker analysis: themes, leadership qualities, sophistication bars | `app/(app)/preview/page.tsx` (speaker-analyses tab) | None (data passed as prop) |
| `SpeakerAnalysisUploadZone.tsx` | Drag-and-drop ZIP upload for student speaker evaluation files | `app/(app)/preview/page.tsx` (speaker-analyses tab empty state) | `POST /api/sessions/[id]/speaker-analyses` |
| `StudentDebriefUploadZone.tsx` | Drag-and-drop ZIP upload for student post-session reflection files | `app/(app)/preview/page.tsx` (student-debriefs tab empty state) | `POST /api/sessions/[id]/student-debriefs` |

## Key Patterns

- Both generate buttons use the same state machine: `checking` (renders null) → `exists=false` (generate) → `exists=true` (view).
- Upload zones use the two-step Supabase storage flow: `uploadTempZip()` first, then POST the storage path to the API.
- `SpeakerAnalysisUploadZone` uses BRAND.GREEN accents; `StudentDebriefUploadZone` uses BRAND.PURPLE accents — keep them visually distinct.
- `SpeakerAnalysisPanel` expands quote evidence inline (single expanded index per section).

## Brand Colors

Import `BRAND` from `@/lib/constants`. Never hardcode hex values.
