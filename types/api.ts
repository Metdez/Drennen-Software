import type { Session, SessionSummary } from './session'

export interface ProcessResponse {
  sessionId: string
  output: string
  fileCount: number
  overlappingThemes?: string[]
}

export interface GetSessionsResponse {
  sessions: SessionSummary[]
}

export interface GetSessionResponse {
  session: Session
  promptVersion?: {
    id: string
    version: number
    label: string | null
  } | null
}

export interface ApiError {
  error: string
}

export type ApiResult<T> = T | ApiError

export function isApiError(res: unknown): res is ApiError {
  return typeof res === 'object' && res !== null && 'error' in res
}
