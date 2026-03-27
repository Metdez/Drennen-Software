export interface TierAssignment {
  tier: number
  themeNumber: number
  themeTitle: string
  questionType: 'primary' | 'backup'
  studentName: string
}

export interface TierData {
  tierCounts: Record<string, number>
  tierAssignments: TierAssignment[]
}

export interface SessionTierDataRow {
  id: string
  session_id: string
  tier_counts: Record<string, number>
  tier_assignments: TierAssignment[]
  created_at: string
}

export interface SessionTierData {
  id: string
  sessionId: string
  tierCounts: Record<string, number>
  tierAssignments: TierAssignment[]
  createdAt: string
}
