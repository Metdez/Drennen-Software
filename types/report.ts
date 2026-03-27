export interface ReportConfig {
  title: string
  dateRange: { start: string; end: string } | null
  includedSections: string[]
  customNotes?: string
}

// ── Section data types ──

export interface ExecutiveSummarySection {
  narrative: string
  highlights: string[]
  keyMetrics: {
    totalSessions: number
    totalSubmissions: number
    totalStudents: number
    avgSubmissionsPerSession: number
    participationRate: number
  }
}

export interface SemesterGlanceSection {
  totalSessions: number
  totalSubmissions: number
  totalStudents: number
  avgSubmissionsPerSession: number
  sessionsOverTime: Array<{
    speakerName: string
    date: string
    submissionCount: number
  }>
  tierDistribution: Record<string, number>
}

export interface SessionSummaryEntry {
  sessionId: string
  speakerName: string
  date: string
  fileCount: number
  themes: string[]
  debriefRating: number | null
  debriefHighlights: string | null
}

export interface SessionSummariesSection {
  sessions: SessionSummaryEntry[]
}

export interface ThemeEvolutionSection {
  narrative: string
  timeline: Array<{
    sessionId: string
    speakerName: string
    date: string
    themes: string[]
  }>
  dominantThemes: Array<{
    title: string
    totalCount: number
    firstSeen: string
    lastSeen: string
  }>
}

export interface StudentEngagementSection {
  totalStudents: number
  participationTiers: {
    high: number    // 80%+
    medium: number  // 50-80%
    low: number     // below 50%
  }
  topContributors: Array<{
    studentName: string
    sessionCount: number
    totalSessions: number
    rate: number
  }>
  dropoff: Array<{
    studentName: string
    lastSeenSpeaker: string
    lastSeenDate: string
  }>
}

export interface StudentGrowthHighlight {
  studentName: string
  narrative: string
  sessionsParticipated: number
}

export interface StudentGrowthSection {
  narrative: string
  highlights: StudentGrowthHighlight[]
}

export interface QuestionQualitySection {
  narrative: string
  trend: 'improving' | 'declining' | 'stable'
  perSessionTiers: Array<{
    sessionId: string
    speakerName: string
    date: string
    tierCounts: Record<string, number>
  }>
  overallDistribution: Record<string, number>
}

export interface BlindSpotsSection {
  blindSpots: Array<{
    title: string
    description: string
  }>
  recommendations: Array<{
    text: string
    reason: string
  }>
}

export interface SpeakerRanking {
  speakerName: string
  sessionId: string
  date: string
  debriefRating: number | null
  avgTier: number | null
  submissionCount: number
}

export interface SpeakerEffectivenessSection {
  narrative: string
  rankings: SpeakerRanking[]
}

export interface RosterEntry {
  studentName: string
  participationRate: number
  sessionsAttended: string[]   // session IDs
  totalSessions: number
}

export interface AppendixRosterSection {
  students: RosterEntry[]
  sessionOrder: Array<{ sessionId: string; speakerName: string; date: string }>
}

// ── Full report content ──

export interface ReportContent {
  executive_summary?: ExecutiveSummarySection
  semester_at_a_glance?: SemesterGlanceSection
  session_summaries?: SessionSummariesSection
  theme_evolution?: ThemeEvolutionSection
  student_engagement?: StudentEngagementSection
  student_growth?: StudentGrowthSection
  question_quality?: QuestionQualitySection
  blind_spots?: BlindSpotsSection
  speaker_effectiveness?: SpeakerEffectivenessSection
  appendix_roster?: AppendixRosterSection
  generatedAt: string
  config: ReportConfig
}

// ── DB row types ──

export interface SemesterReportRow {
  id: string
  user_id: string
  title: string
  config: ReportConfig
  content: ReportContent
  session_ids: string[]
  created_at: string
}

export interface SemesterReport {
  id: string
  userId: string
  title: string
  config: ReportConfig
  content: ReportContent
  sessionIds: string[]
  createdAt: string
}
