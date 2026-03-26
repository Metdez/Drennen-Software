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
