// ── Student debrief (post-session reflection) types ─────────────────────────

export interface StudentDebriefSubmissionRow {
  id: string
  session_id: string
  student_name: string
  filename: string
  submission_text: string
  created_at: string
}

export interface StudentDebriefAnalysis {
  reflection_themes: Array<{
    name: string
    description: string
    student_count: number
    quotes: Array<{ text: string; student_name: string }>
  }>
  key_moments: Array<{
    moment: string
    mentioned_by: number
    sentiment: 'positive' | 'neutral' | 'mixed'
  }>
  surprises: Array<{ text: string; student_name: string }>
  career_connections: Array<{
    text: string
    student_name: string
    career_area: string
  }>
  sentiment: {
    inspired: number
    reflective: number
    challenged: number
    indifferent: number
  }
  summary: string
}
