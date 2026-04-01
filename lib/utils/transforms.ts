import type { SessionRow, Session, SessionSummary, SessionDebriefRow, SessionDebrief } from '@/types'

export function rowToSession(row: SessionRow): Session {
  return {
    id: row.id,
    userId: row.user_id,
    speakerName: row.speaker_name,
    createdAt: row.created_at,
    output: row.output,
    fileCount: row.file_count,
    semesterId: row.semester_id ?? null,
    promptVersionId: row.prompt_version_id ?? null,
  }
}

export function rowToSessionSummary(row: SessionRow): SessionSummary {
  return {
    id: row.id,
    speakerName: row.speaker_name,
    createdAt: row.created_at,
    fileCount: row.file_count,
    semesterId: row.semester_id ?? null,
    debriefStatus: null,
    debriefRating: null,
  }
}

export function rowToDebrief(row: SessionDebriefRow): SessionDebrief {
  return {
    id: row.id,
    sessionId: row.session_id,
    userId: row.user_id,
    overallRating: row.overall_rating,
    questionsFeedback: row.questions_feedback,
    surpriseMoments: row.surprise_moments,
    speakerFeedback: row.speaker_feedback,
    studentObservations: row.student_observations,
    followupTopics: row.followup_topics,
    privateNotes: row.private_notes,
    aiSummary: row.ai_summary,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
