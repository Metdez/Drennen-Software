// DB row shape (snake_case)
export interface StudentSubmissionRow {
  id: string
  session_id: string
  student_name: string
  submission_text: string
  score: number | null
  explanation: string | null
  scored_at: string | null
  created_at: string
}

// Application type (camelCase)
export interface StudentSubmission {
  id: string
  sessionId: string
  studentName: string
  submissionText: string
  score: number | null
  explanation: string | null
  scoredAt: string | null
  createdAt: string
}
