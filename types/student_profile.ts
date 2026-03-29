// ── Growth Intelligence types ─────────────────────────────────────────────────

export interface GrowthSnapshot {
  sessionId: string
  speakerName: string
  date: string
  phase: 'surface' | 'emerging' | 'developing' | 'sophisticated'
  thinkingLabel: string
  engagementLabel: string
  themes: string[]
  narrative: string
}

export interface ThinkingSophisticationArc {
  currentPhase: string
  observations: string[]
  evidenceHighlights: string[]
}

export interface ThemeEvolution {
  coherenceLabel: 'focused' | 'broadening' | 'scattered' | 'converging'
  recurringThreads: string[]
  observations: string[]
}

export interface CriticalThinkingDevelopment {
  currentLevel: string
  observations: string[]
  strongestArea: string
  growthEdge: string
}

export interface EngagementPattern {
  consistencyLabel: 'steady' | 'improving' | 'declining' | 'sporadic'
  depthTrend: 'deepening' | 'stable' | 'thinning'
  observations: string[]
}

export type GrowthSignal = 'Accelerating' | 'Deepening' | 'Emerging' | 'Consistent' | 'Plateauing' | 'New'

export interface GrowthIntelligence {
  overallSignal: GrowthSignal
  thinkingArc: ThinkingSophisticationArc
  themeEvolution: ThemeEvolution
  criticalThinking: CriticalThinkingDevelopment
  engagementPattern: EngagementPattern
  snapshots: GrowthSnapshot[]
  aiRecommendations: string[]
  semesterHighlight: string
}

// ── Professor notes ───────────────────────────────────────────────────────────

export interface ProfessorNote {
  id: string
  studentName: string
  noteText: string
  flaggedForFollowup: boolean
  createdAt: string
}

// ── Student profile ───────────────────────────────────────────────────────────

export interface StudentProfile {
  interests: {
    tags: string[]
    observations: string[]
  }
  careerDirection: {
    fields: string[]
    observations: string[]
  }
  growthTrajectory: {
    direction: 'improving' | 'declining' | 'stable' | 'insufficient_data'
    observations: string[]
  }
  personality: {
    traits: string[]
    observations: string[]
  }
  professorNotes: string[]
  growthIntelligence?: GrowthIntelligence
  generatedAt: string
  sessionCount: number
}
