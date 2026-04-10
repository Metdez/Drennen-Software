# app/api/ — Route Handlers

This directory contains all Next.js App Router API route handlers. Each file
is a thin orchestration layer: it authenticates the caller, validates inputs,
delegates to `lib/db/` and `lib/ai/` helpers, and returns a typed JSON response.

---

## Purpose

API routes are the server boundary between the React client and:
- **Supabase** (auth, database, storage)
- **xAI Grok** (session generation — `lib/ai/client.ts`)
- **Google Gemini** (all other AI features — `lib/ai/geminiClient.ts`)
- **Stripe** (subscription and billing)

All handlers must be stateless and idempotent where possible. Business logic
belongs in `lib/`, not inside route handlers.

---

## Auth Pattern

Every protected route authenticates the caller with the same two-line pattern:

```ts
const user = await getCurrentUser()          // from lib/db/users.ts
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```

`getCurrentUser()` reads the Supabase cookie-based session via `createClient()`
(RLS-enforced). It returns `null` for unauthenticated or expired sessions.

**Never use `createAdminClient()` for user-scoped reads.** The admin client
bypasses RLS and is only permitted in:
- `app/api/admin/clear/route.ts` — deletes sessions (no DELETE RLS policy exists)
- Background AI jobs in `lib/ai/` that query across user boundaries

**Ownership checks** — after fetching a resource by ID, always verify
`resource.userId === user.id` before returning data or mutating it. Return 404
(not 403) to avoid leaking the existence of other professors' resources.

---

## Error Handling Pattern

### Standard catch block

All protected routes use a try/catch and return a 500 on unexpected errors:

```ts
} catch (err) {
  console.error('[/api/your-route]', err)
  const message = err instanceof Error ? err.message : 'Unknown error'
  return NextResponse.json({ error: message }, { status: 500 })
}
```

### Gemini / AI errors

Routes that call Gemini agents **must** use `extractErrorMessage()` from
`lib/utils/errors.ts` in their catch blocks. Raw Gemini error objects contain
API metadata that must not be sent to the client:

```ts
import { extractErrorMessage } from '@/lib/utils/errors'
// ...
} catch (err) {
  const message = extractErrorMessage(err)
  return NextResponse.json({ error: message }, { status: 500 })
}
```

### Validation errors

- **400** — missing required fields, invalid IDs, empty arrays
- **401** — unauthenticated (missing or expired session)
- **403** — authenticated but not authorized (e.g. subscription gate)
- **404** — resource not found or ownership check failed
- **422** — semantic validation failure (e.g. prompt too short, limit reached)
- **500** — unexpected server / AI error

---

## Fire-and-Forget Pattern

Several heavy Gemini jobs are intentionally non-blocking. The pattern looks like:

```ts
// The client already has its response — kick off background jobs without await
generateClassInsights(user.id).catch(e =>
  console.error('[/api/process] generateClassInsights failed (non-fatal):', e)
)
```

Jobs that use this pattern (all triggered from `POST /api/process`):
| Job | Function | File |
|-----|----------|------|
| Cross-session class insights | `generateClassInsights()` | `lib/ai/classInsights.ts` |
| Per-session Gemini analysis | `generateAndCacheSessionAnalysis()` | `lib/ai/generateSessionAnalysis.ts` |
| Student growth-intelligence profiles | `generateStudentProfiles()` | `lib/ai/studentProfile.ts` |
| Question quality tier classification | `classifyAndStoreTiers()` | `lib/ai/tierClassifier.ts` |

These jobs complete asynchronously in the same Node.js event loop. Results are
available on the next page load (not the current one). Each endpoint that reads
their results (`/api/analytics/insights`, `/api/analytics/recommendations`) has
a synchronous fallback that regenerates data if the cache is empty.

---

## Required Export

Every route file must export:

```ts
export const dynamic = 'force-dynamic'
```

This prevents Next.js from statically optimising (and caching) routes that
depend on per-request cookies for auth.

---

## Route Families

### `process/`
The core pipeline. See `app/api/process/route.ts` for the full orchestration
doc. Gated by `checkSubscriptionAccess()`. Most complex route in the codebase.

### `analytics/`
| Route | Handler | Purpose |
|-------|---------|---------|
| `GET /api/analytics` | `route.ts` | Session trends, leaderboard, drop-off |
| `GET /api/analytics/insights` | `insights/route.ts` | Gemini class insights (with fallback regen) |
| `POST /api/analytics/query` | `query/route.ts` | NL → SQL → answer via `lib/ai/sqlAgent.ts` |
| `GET /api/analytics/recommendations` | `recommendations/route.ts` | Speaker recommendations (with fallback regen) |
| `GET /api/analytics/themes` | `themes/route.ts` | Cross-session theme frequency |

### `compare/`
| Route | Handler | Purpose |
|-------|---------|---------|
| `GET /api/compare` | `route.ts` | Build full comparison payload (no AI call) |
| `POST /api/compare/analysis` | `analysis/route.ts` | Generate AI comparative analysis via Gemini |
| `POST /api/compare/share` | `share/route.ts` | Enable public share link for a comparison |
| `DELETE /api/compare/share` | `share/route.ts` | Revoke a comparison share link |

### `reports/`
| Route | Handler | Purpose |
|-------|---------|---------|
| `POST /api/reports/generate` | `generate/route.ts` | Generate semester report via Gemini (blocking, maxDuration=60) |
| `GET /api/reports/[id]` | `[id]/route.ts` | Fetch saved report by ID |
| `GET /api/reports/[id]/download` | `[id]/download/route.ts` | Export as PDF or DOCX binary |

### `stories/`
| Route | Handler | Purpose |
|-------|---------|---------|
| `POST /api/stories/generate` | `generate/route.ts` | Generate semester narrative story via Gemini (blocking, maxDuration=60) |
| `GET /api/stories/[id]` | `[id]/route.ts` | Fetch saved story by ID |
| `PATCH /api/stories/[id]` | `[id]/route.ts` | Update story sections (professor edits) |
| `GET /api/stories/[id]/download` | `[id]/download/route.ts` | Export as PDF or DOCX binary |

### `system-prompts/`
Manages the professor's custom AI prompt versions. The active version is
resolved at session-generation time in `POST /api/process`. When no version is
active, `sessions.prompt_version_id = NULL` and the built-in default from
`lib/ai/prompt.ts` is used.

| Route | Handler | Purpose |
|-------|---------|---------|
| `GET /api/system-prompts` | `route.ts` | List all versions + active version + default text |
| `POST /api/system-prompts` | `route.ts` | Create new prompt version (validates 50–10,000 chars) |
| `PATCH /api/system-prompts/[id]/activate` | `[id]/activate/route.ts` | Activate a saved version (deactivates all others) |
| `POST /api/system-prompts/reset` | `reset/route.ts` | Revert to built-in default (clears active flag) |

### `sessions/`
Session CRUD plus nested sub-routes for analysis, debrief, share, download,
speaker brief, speaker portal, synthesis, rerun, student submissions. See
`app/api/sessions/` for individual route docs.

### `auth/`
`GET /api/auth/callback` — Supabase PKCE callback. Exchanges the one-time code
for a session cookie and redirects to the dashboard (or a `next` param path).
This route is **not** protected — it IS the authentication step.

### `admin/`
`POST /api/admin/clear` — Deletes all sessions for the authenticated user via
the service-role client (bypasses RLS). Development/demo use only.

### Other families
- `roster/` — student participation, professor notes, AI profiles
- `semesters/` — semester CRUD, session assignment, cohort comparison
- `portfolio/` — public portfolio share tokens and configurable section reads
- `shared/` — public session and comparison share reads and downloads
- `speaker/` — public speaker portal reads
- `stripe/` — checkout, billing portal, invoice listing, and webhook handler
- `subscription/` — current user's subscription access status

---

## Key Conventions

- **Never add UPDATE or DELETE for `sessions`.** Sessions are immutable.
- **Never hardcode hex colors** — not applicable to API routes, but relevant if
  generating HTML responses.
- **Parallel fetches** — when multiple independent DB queries are needed, use
  `Promise.all([...])` rather than sequential awaits.
- **Route logging prefix** — all `console.error` calls must include the route
  path as a prefix: `'[/api/route-name]'` for easy log filtering.
- **Binary responses** — download endpoints return `new Response(Buffer.from(buffer), { headers })`,
  NOT `NextResponse.json()`. The `Content-Disposition: attachment` header
  triggers the browser's file-save dialog.
