export interface StudentSubmissionRow {
  id: string
  session_id: string
  student_name: string
  raw_text: string
  created_at: string
}

export interface StudentSubmission {
  id: string
  sessionId: string
  studentName: string
  rawText: string
  createdAt: string
}

export interface CreateStudentSubmissionsInput {
  sessionId: string
  students: Array<{ name: string; rawText: string }>
}
