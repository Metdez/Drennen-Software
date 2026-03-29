// ── Student speaker analysis (post-session evaluation) types ─────────────────

export interface StudentSpeakerAnalysisSubmissionRow {
  id: string
  session_id: string
  student_name: string
  filename: string
  submission_text: string
  created_at: string
}

export interface StudentSpeakerAnalysis {
  evaluation_themes: Array<{
    name: string
    description: string
    student_count: number
    quotes: Array<{ text: string; student_name: string }>
  }>
  leadership_qualities: Array<{
    quality: string
    description: string
    mentioned_by: number
    quotes: Array<{ text: string; student_name: string }>
  }>
  course_concept_connections: Array<{
    concept: string
    student_count: number
    examples: Array<{ text: string; student_name: string }>
  }>
  areas_of_agreement: Array<{
    point: string
    student_count: number
    sentiment: 'positive' | 'negative' | 'neutral'
  }>
  areas_of_disagreement: Array<{
    point: string
    perspectives: Array<{ position: string; student_name: string }>
  }>
  analytical_sophistication: {
    high: number
    moderate: number
    surface: number
    summary: string
  }
  notable_observations: Array<{
    text: string
    student_name: string
    why_notable: string
  }>
  summary: string
}
