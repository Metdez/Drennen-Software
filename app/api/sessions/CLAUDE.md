# app/api/sessions/ — Session Route Handlers

This directory contains all API route handlers scoped to sessions: the session list,
individual session retrieval, and all sub-routes that operate on a specific session
(analysis, debrief, download, sharing, speaker brief/portal, synthesis, reruns, and
student submission types).

---

## Purpose

Sessions are the central unit of data in this app. Each session represents one
processed ZIP upload — a professor's set of student question submissions for a
particular guest speaker. This route group exposes read, generation, export, and
sharing operations on sessions. Sessions themselves are immutable once created.

---

## Route Catalog

| Route | Method(s) | Auth | Purpose | DB Functions | AI Agents |
|-------|-----------|------|---------|--------------|-----------|
| `/api/sessions` | GET | Required | List sessions (optionally filter by semester); enriches each with debrief status and rating | `getSessionsByUser()`, `getDebriefStatusesBySessionIds()` | None |
| `/api/sessions/[id]` | GET | Required | Fetch single session + prompt version metadata | `getSessionById()`, `getPromptById()` | None |
| `/api/sessions/[id]/analysis` | GET | Required | Return (or lazily generate + cache) Gemini per-session analysis | `getSessionAnalysis()`, `insertSessionAnalysis()`, `student_submissions` (admin client) | `runSessionAnalysis()` — Gemini |
| `/api/sessions/[id]/brief` | GET, POST, PUT | Required | Read, generate, or professor-edit the speaker brief | `getSpeakerBrief()`, `insertSpeakerBrief()`, `updateSpeakerBriefEdits()`, `getSessionAnalysis()`, `getClassInsights()`, `session_themes` | `generateSpeakerBrief()` — Gemini (POST only) |
| `/api/sessions/[id]/brief/download` | GET | Required | Stream speaker brief as a PDF file attachment | `getSpeakerBrief()`, `getSessionById()` | None (local renderer) |
| `/api/sessions/[id]/debrief` | GET, POST | Required | Read or upsert the professor's post-session debrief (draft stage only) | `getDebrief()`, `upsertDebrief()`, `getStudentNamesForSession()` | None |
| `/api/sessions/[id]/debrief/complete` | POST | Required | Lock debrief, generate AI summary, trigger fire-and-forget jobs | `getDebrief()`, `completeDebrief()` | `generateDebriefSummary()`, `generateClassInsights()`, `generateAndPublishPostSessionFeedback()` — all Gemini |
| `/api/sessions/[id]/download` | GET | Required | Export session output as PDF or DOCX (`?format=pdf\|docx`) | `getSessionById()` | None (local renderers) |
| `/api/sessions/[id]/portal` | GET, POST, PUT | Required | Read, generate, or professor-edit the speaker portal | `getSpeakerPortal()`, `insertSpeakerPortal()`, `updateSpeakerPortalEdits()`, `getSessionAnalysis()`, `getClassInsights()`, `fetchInsightsInput()`, `session_themes` | `generateSpeakerPortalContent()` — Gemini (POST only) |
| `/api/sessions/[id]/portal/publish` | POST, DELETE | Required | Publish (assign share token) or unpublish the speaker portal | `getSpeakerPortal()`, `publishSpeakerPortal()`, `unpublishSpeakerPortal()` | None |
| `/api/sessions/[id]/rerun` | POST | Required + Subscription | Re-run xAI Grok generation on original submissions with current active prompt; inserts a new session | `getSessionById()`, `getSubmissionsBySession()`, `getActivePrompt()`, `insertSession()`, `insertStudentSubmissions()`, `insertSessionThemes()`, `checkSubscriptionAccess()`, `decrementFreeSession()` | `generateQuestionSheet()` — xAI (sync); `generateClassInsights()`, `generateAndCacheSessionAnalysis()`, `generateStudentProfiles()`, `classifyAndStoreTiers()` — Gemini (fire-and-forget) |
| `/api/sessions/[id]/share` | GET, POST, DELETE | Required | Read share status, enable public sharing, or revoke share token | `getSessionShare()`, `enableSessionShare()`, `revokeSessionShare()` | None |
| `/api/sessions/[id]/speaker-analyses` | GET, POST | Required | Read or ingest + AI-evaluate student speaker-analysis submissions (ZIP upload) | `hasStudentSpeakerAnalyses()`, `getStudentSpeakerAnalysis()`, `insertStudentSpeakerAnalysisSubmissions()`, `deleteStudentSpeakerAnalysisSubmissions()`, `upsertStudentSpeakerAnalysis()` | `runSpeakerAnalysisEvaluation()`, `generateClassInsights()`, `generateSpeakerRecommendations()` — all Gemini fire-and-forget |
| `/api/sessions/[id]/student-debriefs` | GET, POST | Required | Read or ingest + AI-analyse student debrief reflection submissions (ZIP upload) | `hasStudentDebriefs()`, `getStudentDebriefAnalysis()`, `insertStudentDebriefSubmissions()`, `deleteStudentDebriefSubmissions()`, `upsertStudentDebriefAnalysis()` | `runDebriefReflectionAnalysis()`, `generateClassInsights()`, `generateSpeakerRecommendations()` — all Gemini fire-and-forget |
| `/api/sessions/[id]/synthesis` | GET | Required | Return (or generate + cache) cross-data-type session synthesis | `getSessionSynthesis()`, `upsertSessionSynthesis()`, `getSessionAnalysis()`, `getStudentDebriefAnalysis()`, `getStudentSpeakerAnalysis()` | `runSessionSynthesis()` — Gemini |
| `/api/sessions/[id]/theme-analysis` | GET | Required | Deep-dive analysis for a specific theme cluster (`?theme=<name>`) | `getSessionAnalysis()`, `insertSessionAnalysis()`, `getSubmissionsBySession()` | `runSessionAnalysis()` (cache miss only), `runThemeAnalysis()` — both Gemini |

---

## Common Patterns

### Auth check

Every handler authenticates the caller with the same two-step pattern:

```ts
const user = await getCurrentUser()            // lib/db/users.ts — reads Supabase cookie
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

const session = await getSessionById(params.id)
if (!session || session.userId !== user.id) {
  return NextResponse.json({ error: 'Session not found' }, { status: 404 }) // not 403
}
```

**Why 404 instead of 403?** Returning 404 for sessions owned by other users avoids
confirming to unauthorized callers that a given session ID exists at all.

Some routes extract this into a local `authenticateAndGetSession(sessionId)` helper
(e.g., `debrief/route.ts`, `share/route.ts`) to avoid repeating the pattern across
multiple handlers in the same file.

### Error handling

Standard catch blocks use the raw error message:

```ts
} catch (err) {
  console.error('[/api/sessions/[id]/route-name]', err)
  return NextResponse.json({ error: 'Human-readable message' }, { status: 500 })
}
```

Routes that call Gemini use `extractErrorMessage()` from `lib/utils/errors.ts`
to unwrap AI SDK error JSON before returning it to the client:

```ts
import { extractErrorMessage } from '@/lib/utils/errors'
// ...
return NextResponse.json({ error: extractErrorMessage(err) }, { status: 500 })
```

Some routes also manually unwrap Gemini JSON via `JSON.parse(message)` in the
catch block for routes that predate `extractErrorMessage()`.

### Caching pattern (write-through)

Analysis endpoints check for a cached result first and return it instantly:

```
GET request
  → check DB cache (session_analyses / speaker_briefs / etc.)
  → cache hit: return immediately, no AI call
  → cache miss: call Gemini → persist result → return
```

`insertSessionAnalysis()` failures are non-fatal — the analysis is returned to
the client even if the write-through fails. The next request will regenerate.

### Fire-and-forget AI jobs

Heavy Gemini jobs kicked off from `rerun`, `debrief/complete`, `speaker-analyses`,
and `student-debriefs` run async after the response is sent:

```ts
generateClassInsights(user.id).catch(e =>
  console.error('[route-name] generateClassInsights failed (non-fatal):', e)
)
```

The client receives its response immediately; enriched data appears on the next
page load. All fire-and-forget calls use `.catch()` to log failures without
propagating them.

### ZIP upload pattern (speaker-analyses, student-debriefs)

Both ZIP-ingestion endpoints share the same pipeline:

1. Read `storagePath` from request body (path in `temp-uploads` Supabase bucket)
2. `downloadTempZip(storagePath)` — fetches ZIP from storage
3. `buildSubmissionsText(zipBuffer)` — parses all PDFs/DOCXs in the ZIP
4. Replace existing submissions if re-uploading (delete-then-insert)
5. Insert new submission rows
6. Fire-and-forget AI analysis jobs
7. `finally { deleteTempZip(storagePath) }` — always clean up the temp file

### Binary download responses

Download endpoints return `new Response(new Uint8Array(buffer), { headers })`
— **not** `NextResponse.json()`. The `Content-Disposition: attachment` header
triggers the browser's native file-save dialog.

---

## Session Immutability Note

**Sessions are immutable.** There are no UPDATE or DELETE RLS policies on the
`sessions` table by design. The AI output is a point-in-time artifact — mutations
would break shared links, debrief references, and the history page.

The `POST /api/sessions/[id]/rerun` endpoint respects this constraint by inserting
a **new** session row rather than modifying the original. The original session's ID
and output are preserved intact.

---

## Idempotency Notes

Several generation endpoints are idempotent — calling POST when data already exists
returns the existing record without re-calling the AI:

- `POST /api/sessions/[id]/brief` — returns existing brief if already generated
- `POST /api/sessions/[id]/portal` — returns existing portal if already generated
- `POST /api/sessions/[id]/share` — returns existing share token if already enabled
- `POST /api/sessions/[id]/debrief/complete` — returns existing debrief if already complete

---

## Related Files

- `lib/db/sessions.ts` — `getSessionById()`, `listSessions()`, `insertSession()`
- `lib/db/debriefs.ts` — all debrief CRUD
- `lib/db/sessionAnalyses.ts` — analysis read/write
- `lib/db/sessionShares.ts` — share token management
- `lib/db/speakerBriefs.ts` — speaker brief CRUD
- `lib/db/speakerPortals.ts` — speaker portal CRUD + publish/unpublish
- `lib/db/sessionSyntheses.ts` — synthesis CRUD
- `lib/db/studentDebriefs.ts` — student debrief submissions + AI analysis
- `lib/db/studentSpeakerAnalyses.ts` — student speaker-analysis submissions + AI evaluation
- `lib/ai/analysisAgent.ts` — `runSessionAnalysis()`, `runThemeAnalysis()`
- `lib/ai/speakerBrief.ts` — `generateSpeakerBrief()`
- `lib/ai/speakerPortal.ts` — `generateSpeakerPortalContent()`
- `lib/ai/speakerPortalPostSession.ts` — `generateAndPublishPostSessionFeedback()`
- `lib/ai/debriefSummary.ts` — `generateDebriefSummary()`
- `lib/ai/synthesisAgent.ts` — `runSessionSynthesis()`
- `lib/ai/debriefReflectionAnalysis.ts` — `runDebriefReflectionAnalysis()`
- `lib/ai/speakerAnalysisEvaluation.ts` — `runSpeakerAnalysisEvaluation()`
- `lib/utils/errors.ts` — `extractErrorMessage()`
- `lib/export/pdf.ts`, `lib/export/docx.ts` — session output export
- `lib/export/briefPdf.ts` — speaker brief PDF export
