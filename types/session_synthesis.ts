// ── Session synthesis (cross-data-type intelligence) types ───────────────────

export interface SessionSynthesis {
  narrative: string

  curiosity_resolution: Array<{
    question_theme: string
    addressed: boolean
    evidence: string
  }>

  theme_evolution: Array<{
    theme: string
    pre_session: string | null
    post_session: string | null
    evolution: string
  }>

  emergent_themes: Array<{
    theme: string
    source: 'debriefs' | 'speaker_analyses'
    description: string
    student_count: number
  }>

  tone_shift: {
    pre: { dominant: string; description: string }
    post: { dominant: string; description: string }
    shift_narrative: string
  }

  gaps: Array<{
    theme: string
    present_in: string[]
    absent_from: string[]
    significance: string
  }>

  data_completeness: {
    has_questions: boolean
    has_debriefs: boolean
    has_speaker_analyses: boolean
    missing_note: string | null
  }
}
