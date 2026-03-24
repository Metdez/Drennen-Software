export interface ThemeEvolutionEntry {
  sessionId: string
  speakerName: string
  date: string
  themes: string[]
}

export interface ClassInsights {
  narrative: string
  qualityTrend: {
    direction: 'improving' | 'declining' | 'stable'
    description: string
  }
  topThemes: Array<{
    title: string
    sessionCount: number
    isNew: boolean
  }>
  watchlist: Array<{
    studentName: string
    reason: string
  }>
  themeEvolution: ThemeEvolutionEntry[]
  generatedAt: string
}
