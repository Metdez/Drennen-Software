export interface StudentProfile {
  interests: {
    tags: string[]
    narrative: string
  }
  careerDirection: {
    fields: string[]
    narrative: string
  }
  growthTrajectory: {
    direction: 'improving' | 'declining' | 'stable' | 'insufficient_data'
    narrative: string
  }
  personality: {
    traits: string[]
    narrative: string
  }
  professorNotes: string[]
  generatedAt: string
  sessionCount: number
}
