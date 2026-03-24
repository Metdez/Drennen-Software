# AGENT-TYPES.md — Agent 02: Types + Utils
# Wave 1 agent. Fires simultaneously with Agents 01, 03, and 04.
# Your output is imported by EVERY other agent. Get this right.

---

## MANDATORY PRE-READ

1. AGENTS.md
2. STRUCTURE.md
3. ERRORS.md
4. TYPES.md ← this is your entire spec. Implement it exactly.

---

## YOUR JOB

Create all shared TypeScript types and utility functions. You own these files and ONLY these files:

```
types/index.ts
types/session.ts
types/api.ts
types/user.ts
lib/constants.ts
lib/utils/transforms.ts
lib/utils/format.ts
```

Do not create any other files. Do not touch app/, components/, or any lib/ subdirectory other than lib/utils/.

---

## FILE 1: types/session.ts

Implement exactly as specified in TYPES.md. Copy it verbatim — this is a contract, not a suggestion.

```ts
export interface SessionRow {
  id: string
  user_id: string
  speaker_name: string
  created_at: string
  output: string
  file_count: number
}

export interface Session {
  id: string
  userId: string
  speakerName: string
  createdAt: string
  output: string
  fileCount: number
}

export interface CreateSessionInput {
  userId: string
  speakerName: string
  output: string
  fileCount: number
}

export interface SessionSummary {
  id: string
  speakerName: string
  createdAt: string
  fileCount: number
}
```

---

## FILE 2: types/user.ts

```ts
export interface AuthUser {
  id: string
  email: string
}
```

---

## FILE 3: types/api.ts

```ts
import type { Session, SessionSummary } from './session'

export interface ProcessResponse {
  sessionId: string
  output: string
  fileCount: number
}

export interface GetSessionsResponse {
  sessions: SessionSummary[]
}

export interface GetSessionResponse {
  session: Session
}

export interface ApiError {
  error: string
}

export type ApiResult<T> = T | ApiError

export function isApiError(res: unknown): res is ApiError {
  return typeof res === 'object' && res !== null && 'error' in res
}
```

---

## FILE 4: types/index.ts

Re-export everything. All imports in the app use `@/types`, never `@/types/session`.

```ts
export * from './session'
export * from './user'
export * from './api'
```

---

## FILE 5: lib/constants.ts

All magic strings live here. Nothing is hardcoded anywhere else.

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

export const BRAND = {
  ORANGE: '#f36f21',
  PURPLE: '#542785',
  GREEN: '#0f6b37',
} as const

export const APP_NAME = 'Drennen MGMT 305' as const

export const AI_CONFIG = {
  MAX_TOKENS: 4000,
  TEMPERATURE: 0.3,
} as const

export const ACCEPTED_FILE_TYPES = ['.pdf', '.docx'] as const
export const ACCEPTED_ZIP_MIME = 'application/zip' as const
```

---

## FILE 6: lib/utils/transforms.ts

Implement exactly as specified in TYPES.md.

```ts
import type { SessionRow, Session, SessionSummary } from '@/types'

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

## FILE 7: lib/utils/format.ts

Date and string formatting utilities used across the UI.

```ts
export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatFileCount(count: number): string {
  return `${count} ${count === 1 ? 'file' : 'files'}`
}

export function slugifySpeakerName(name: string): string {
  return name.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
}
```

---

## COMPLETION CHECKLIST

- [ ] `types/session.ts` — all 4 interfaces match TYPES.md exactly
- [ ] `types/user.ts` — AuthUser interface
- [ ] `types/api.ts` — all response types, isApiError guard
- [ ] `types/index.ts` — re-exports all types
- [ ] `lib/constants.ts` — ROUTES, BRAND, APP_NAME, AI_CONFIG
- [ ] `lib/utils/transforms.ts` — rowToSession, rowToSessionSummary
- [ ] `lib/utils/format.ts` — formatDate, formatFileCount, slugifySpeakerName
- [ ] Zero `any` types used anywhere
- [ ] `npx tsc --noEmit` passes clean
