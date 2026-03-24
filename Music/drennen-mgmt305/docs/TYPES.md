# TYPES.md — Shared TypeScript Interfaces
# Every shared type used across the application is defined here first.
# Agent 02 implements these in the types/ directory.
# All other agents import from types/ — never redefine locally.

---

## FILE LOCATIONS

```
types/
  ├── index.ts       ← re-exports everything (import from 'types/' not 'types/session.ts')
  ├── session.ts     ← Session types
  ├── api.ts         ← API request/response types
  └── user.ts        ← User types
```

---

## types/session.ts

```ts
// The database row shape exactly as returned by Supabase
export interface SessionRow {
  id: string
  user_id: string
  speaker_name: string
  created_at: string
  output: string
  file_count: number
}

// Camelcase version for use throughout the app
export interface Session {
  id: string
  userId: string
  speakerName: string
  createdAt: string
  output: string
  fileCount: number
}

// What you pass to insertSession()
export interface CreateSessionInput {
  userId: string
  speakerName: string
  output: string
  fileCount: number
}

// List item (no output — used in history table)
export interface SessionSummary {
  id: string
  speakerName: string
  createdAt: string
  fileCount: number
}
```

---

## types/user.ts

```ts
// Minimal user shape we care about (from Supabase auth)
export interface AuthUser {
  id: string
  email: string
}
```

---

## types/api.ts

```ts
// POST /api/process
export interface ProcessRequestBody {
  speakerName: string
  // file comes as FormData, not JSON
}

export interface ProcessResponse {
  sessionId: string
  output: string
  fileCount: number
}

// GET /api/sessions
export interface GetSessionsResponse {
  sessions: SessionSummary[]
}

// GET /api/sessions/[id]
export interface GetSessionResponse {
  session: Session
}

// Generic error response
export interface ApiError {
  error: string
}

// Union for typed fetch results
export type ApiResult<T> = T | ApiError

// Type guard
export function isApiError(res: unknown): res is ApiError {
  return typeof res === 'object' && res !== null && 'error' in res
}
```

---

## types/index.ts

```ts
export * from './session'
export * from './user'
export * from './api'
```

---

## lib/parse INTERNAL TYPES (defined in lib/parse/unzip.ts, not shared)

These are internal to the parse pipeline and not exported outside lib/parse/:

```ts
// One extracted file from the ZIP
interface ParsedFile {
  filename: string
  studentName: string  // extracted from filename
  text: string         // extracted text content
}
```

---

## HELPER: converting SessionRow → Session

This utility lives in `lib/utils/transforms.ts`:

```ts
export function rowToSession(row: SessionRow): Session {
  return {
    id: row.id,
    userId: row.user_id,
    speakerName: row.speaker_name,
    createdAt: row.created_at,
    output: row.output,
    fileCount: row.file_count,
  }
}

export function rowToSessionSummary(row: SessionRow): SessionSummary {
  return {
    id: row.id,
    speakerName: row.speaker_name,
    createdAt: row.created_at,
    fileCount: row.file_count,
  }
}
```

---

## NAMING CONVENTIONS

- Database columns: `snake_case` (PostgreSQL convention)
- TypeScript interfaces: `PascalCase`
- Interface properties: `camelCase`
- All DB → app transformations happen in `lib/utils/transforms.ts`
- Never use `snake_case` property names in TypeScript code
