export interface ThemeQuestion {
  text: string
  student_name: string
}

export interface ThemeCluster {
  name: string
  question_count: number
  top_question: string
  questions: ThemeQuestion[]
}

export interface SessionAnalysis {
  theme_clusters: ThemeCluster[]
  tensions: Array<{ label: string; description: string }>
  suggestions: Array<{ text: string; reason: string }>
  blind_spots: Array<{ title: string; description: string }>
  sentiment: {
    aspirational: number
    curious: number
    personal: number
    critical: number
  }
}

export interface ThemeAnalysis {
  narrative: string
  probe_questions: Array<{ question: string; why: string }>
  missed_angles: string[]
  patterns: Array<{ emoji: string; text: string }>
}
