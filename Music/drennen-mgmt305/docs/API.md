# API.md — API Routes and Contracts
# Every server-side route in the application.
# Agent 10 builds these routes. All other agents reference this to know what to call.
# Route names and shapes are frozen. Do not rename, re-path, or reshape without updating this file.

---

## CONVENTIONS

- All routes live under `/api/`
- All responses are JSON unless the route returns a file buffer
- Auth is verified on every protected route via the Supabase server client
- Errors always return `{ error: string }` with the appropriate HTTP status
- Success always returns the shape documented below

---

## ROUTES

---

### POST /api/process

**Purpose:** Receives the ZIP file and speaker name. Orchestrates the full pipeline: extract → parse → prompt → AI → save → return output.

**Auth:** Required. Returns 401 if no valid session.

**Request:** `multipart/form-data`

| Field | Type | Required | Description |
|---|---|---|---|
| `speakerName` | string | YES | Guest speaker's name, injected into prompt |
| `file` | File (ZIP) | YES | The Canvas ZIP download |

**Response 200:**
```json
{
  "sessionId": "uuid",
  "output": "full AI-generated question sheet as string",
  "fileCount": 47
}
```

**Response 400:**
```json
{ "error": "Missing speakerName" }
{ "error": "Missing file" }
{ "error": "File must be a ZIP archive" }
```

**Response 401:**
```json
{ "error": "Unauthorized" }
```

**Response 500:**
```json
{ "error": "Failed to process files" }
{ "error": "AI generation failed" }
```

**Pipeline steps (in order):**
1. Validate auth (Supabase server client)
2. Validate request fields
3. Call `unzip(buffer)` → array of file entries
4. Call `parsePdf(buf)` or `parseDocx(buf)` on each entry
5. Call `buildPromptContent(entries)` → single string
6. Call `generateQuestionSheet(speakerName, content)` → output string
7. Call `insertSession({ userId, speakerName, output, fileCount })`
8. Return `{ sessionId, output, fileCount }`

---

### GET /api/sessions

**Purpose:** Returns all sessions for the currently logged-in user, sorted newest first.

**Auth:** Required. Returns 401 if no valid session.

**Request:** No body. No query params.

**Response 200:**
```json
{
  "sessions": [
    {
      "id": "uuid",
      "speakerName": "Jane Smith",
      "createdAt": "2024-03-15T14:32:00Z",
      "fileCount": 47
    }
  ]
}
```

Note: `output` is NOT included in the list response — only in the single session fetch. This keeps the list fast.

**Response 401:**
```json
{ "error": "Unauthorized" }
```

---

### GET /api/sessions/[id]

**Purpose:** Returns a single session including full output. Used when professor clicks a past session to reopen it.

**Auth:** Required. The session must belong to the logged-in user (enforced by RLS — if the session belongs to another user, Supabase returns null and we return 404).

**Request:** No body. Session ID is in the URL path.

**Response 200:**
```json
{
  "session": {
    "id": "uuid",
    "speakerName": "Jane Smith",
    "createdAt": "2024-03-15T14:32:00Z",
    "fileCount": 47,
    "output": "full AI-generated question sheet string"
  }
}
```

**Response 404:**
```json
{ "error": "Session not found" }
```

**Response 401:**
```json
{ "error": "Unauthorized" }
```

---

### GET /api/auth/callback

**Purpose:** Supabase OAuth redirect handler. After Google OAuth, Supabase redirects here with a code. This route exchanges the code for a session and redirects to /dashboard.

**Auth:** Not required (this route establishes auth).

**Request:** Query params set automatically by Supabase redirect:
- `code` — OAuth authorization code
- `next` — optional redirect path (defaults to /dashboard)

**Response:** Redirects to `/dashboard` on success, `/login?error=auth` on failure.

**Note:** This route is boilerplate from Supabase docs. Agent 05 implements it as documented at https://supabase.com/docs/guides/auth/server-side/nextjs

---

## ROUTE CONSTANTS

All routes are defined as constants in `lib/constants.ts` and imported from there. Never hardcode route strings in components.

```ts
export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  PREVIEW: '/preview',
  HISTORY: '/history',
  API_PROCESS: '/api/process',
  API_SESSIONS: '/api/sessions',
  API_AUTH_CALLBACK: '/api/auth/callback',
} as const
```

---

## CLIENT-SIDE CALLING PATTERN

UI components call these routes using standard `fetch`. No external HTTP library.

```ts
// Example: calling /api/process from the dashboard
const formData = new FormData()
formData.append('speakerName', speakerName)
formData.append('file', zipFile)

const res = await fetch(ROUTES.API_PROCESS, {
  method: 'POST',
  body: formData,
})

if (!res.ok) {
  const { error } = await res.json()
  // handle error
}

const { sessionId, output, fileCount } = await res.json()
```
