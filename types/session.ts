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
