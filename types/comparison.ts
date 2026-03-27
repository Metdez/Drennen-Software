import type { SessionSummary, SessionAnalysis } from './'
import type { SessionTierData } from './tier'

// ---------------------------------------------------------------------------
// Session comparison types
// ---------------------------------------------------------------------------

export interface SessionComparisonSide {
  session: SessionSummary
  themes: string[]
  analysis: SessionAnalysis | null
  tierData: SessionTierData | null
  studentNames: string[]
}

export interface ThemeOverlapResult {
  shared: Array<{ themeA: string; themeB: string }>
  uniqueToA: string[]
  uniqueToB: string[]
}

export interface ParticipationDelta {
  bothSessions: string[]
  onlyA: string[]
  onlyB: string[]
  totalUnique: number
}

export interface SessionComparisonData {
  a: SessionComparisonSide
  b: SessionComparisonSide
  themeOverlap: ThemeOverlapResult
  participationDelta: ParticipationDelta
  savedComparison: SavedComparison | null
}

export interface ComparativeAnalysis {
  narrative: string
  key_differences: Array<{
    title: string
    description: string
    dimension: 'themes' | 'sentiment' | 'participation' | 'quality' | 'engagement'
  }>
  sentiment_shift: {
    summary: string
    notable_changes: Array<{
      dimension: string
      direction: 'up' | 'down' | 'stable'
      detail: string
    }>
  }
  recommendations: Array<{ text: string; reason: string }>
}

export interface SavedComparisonRow {
  id: string
  user_id: string
  session_id_a: string
  session_id_b: string
  ai_comparison: ComparativeAnalysis
  share_token: string | null
  created_at: string
}

export interface SavedComparison {
  id: string
  userId: string
  sessionIdA: string
  sessionIdB: string
  aiComparison: ComparativeAnalysis
  shareToken: string | null
  createdAt: string
}

// ---------------------------------------------------------------------------
// Cohort/semester comparison types (existing)
// ---------------------------------------------------------------------------

export interface SemesterComparisonStats {
  id: string
  name: string
  sessionCount: number
  studentCount: number
  avgSubmissions: number
  topThemes: string[]
}

export interface ThemePersistence {
  theme: string
  semesterIds: string[]
  totalOccurrences: number
}

export interface CohortComparisonData {
  semesters: SemesterComparisonStats[]
  aiNarrative?: string
  themePersistence: ThemePersistence[]
}

export interface CohortComparisonRow {
  id: string
  user_id: string
  semester_ids: string[]
  analysis: CohortComparisonData
  created_at: string
}

export interface CohortComparison {
  id: string
  userId: string
  semesterIds: string[]
  analysis: CohortComparisonData
  createdAt: string
}
