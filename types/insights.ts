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
    summary: string
    sessions: string[]
    sampleQuestions: string[]
  }>
  watchlist: Array<{
    studentName: string
    reason: string
  }>
  themeEvolution: ThemeEvolutionEntry[]
  sessionEffectiveness?: Array<{
    speakerName: string
    rating: number
    homeRunCount: number
    flatCount: number
  }>
  speakerRecommendations?: SpeakerRecommendations
  generatedAt: string
}

export interface SpeakerPatternAnalysis {
  bestEngagementTypes: string
  topResonatingTopics: Array<{
    topic: string
    avgRating: number
    homeRunPct: number
  }>
  successPatterns: string[]
  cautionPatterns: string[]
  dataConfidence: 'low' | 'moderate' | 'high'
  insufficientDataNote: string | null
}

export interface SpeakerRecommendations {
  recommendations: Array<{
    topicArea: string
    whyRecommended: string
    studentInterestSignals: string[]
    complementsContrasts: string
    idealSpeakerProfile: string
  }>
  patternAnalysis: SpeakerPatternAnalysis
  generatedAt: string
}
