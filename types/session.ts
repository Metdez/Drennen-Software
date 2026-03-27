export interface SessionRow {
  id: string
  user_id: string
  speaker_name: string
  created_at: string
  output: string
  file_count: number
  semester_id: string | null
}

export interface Session {
  id: string
  userId: string
  speakerName: string
  createdAt: string
  output: string
  fileCount: number
  semesterId: string | null
}

export interface CreateSessionInput {
  userId: string
  speakerName: string
  output: string
  fileCount: number
  semesterId?: string | null
}

export interface SessionSummary {
  id: string
  speakerName: string
  createdAt: string
  fileCount: number
  semesterId: string | null
  debriefStatus: import('./debrief').DebriefStatus | null
  debriefRating: number | null
}

export interface SessionShareRow {
  id: string
  session_id: string
  user_id: string
  share_token: string
  created_at: string
}

export interface SessionShare {
  id: string
  sessionId: string
  shareToken: string
  createdAt: string
}
