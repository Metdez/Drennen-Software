export interface StudentSubmissionRow {
  id: string
  session_id: string
  student_name: string
  filename: string
  submission_text: string
  created_at: string
}

export interface StudentSubmission {
  id: string
  sessionId: string
  studentName: string
  filename: string
  submissionText: string
  createdAt: string
}

export interface CreateStudentSubmissionsInput {
  sessionId: string
  students: Array<{ name: string; filename: string; rawText: string }>
}

// ── Roster types ──────────────────────────────────────────────────────────────

export interface StudentSummary {
  studentName: string
  sessionCount: number    // sessions where this student submitted
  totalSessions: number   // total sessions for this professor
}

export interface SessionWithSubmission {
  sessionId: string
  speakerName: string
  createdAt: string
  submissionText: string
  filename: string
}

export interface StudentDetail {
  studentName: string
  sessions: SessionWithSubmission[]
  sessionCount: number
  totalSessions: number
}
