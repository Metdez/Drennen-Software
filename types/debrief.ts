export type QuestionStatus = 'home_run' | 'solid' | 'flat' | 'unused'
export type DebriefStatus = 'draft' | 'complete'

export interface QuestionFeedback {
  questionText: string
  attribution: string
  themeTitle: string
  role: 'primary' | 'backup'
  status: QuestionStatus
}

export interface StudentObservation {
  studentName: string
  note: string
}

export interface SessionDebriefRow {
  id: string
  session_id: string
  user_id: string
  overall_rating: number | null
  questions_feedback: QuestionFeedback[]
  surprise_moments: string
  speaker_feedback: string
  student_observations: StudentObservation[]
  followup_topics: string
  private_notes: string
  ai_summary: string | null
  status: DebriefStatus
  created_at: string
  updated_at: string
}

export interface SessionDebrief {
  id: string
  sessionId: string
  userId: string
  overallRating: number | null
  questionsFeedback: QuestionFeedback[]
  surpriseMoments: string
  speakerFeedback: string
  studentObservations: StudentObservation[]
  followupTopics: string
  privateNotes: string
  aiSummary: string | null
  status: DebriefStatus
  createdAt: string
  updatedAt: string
}

export interface UpsertDebriefInput {
  sessionId: string
  userId: string
  overallRating?: number | null
  questionsFeedback?: QuestionFeedback[]
  surpriseMoments?: string
  speakerFeedback?: string
  studentObservations?: StudentObservation[]
  followupTopics?: string
  privateNotes?: string
  status?: DebriefStatus
}
