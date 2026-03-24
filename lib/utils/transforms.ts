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
