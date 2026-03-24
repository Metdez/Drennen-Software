export interface SessionAnalyticsRow {
  sessionId: string
  speakerName: string
  date: string
  submissionCount: number
  hasStudentData: boolean
  relativeSubmissionRate: number
}

export interface LeaderboardEntry {
  studentName: string
  submissionCount: number
}

export interface DropoffEntry {
  studentName: string
  lastSeenSpeaker: string
  lastSeenDate: string
  earlySessionCount: number
}

export interface AnalyticsData {
  sessions: SessionAnalyticsRow[]
  leaderboard: LeaderboardEntry[]
  dropoff: DropoffEntry[]
  meta: {
    totalSessions: number
    totalUniqueStudents: number
    hasAnyStudentData: boolean
    avgRelativeRate: number
  }
}
