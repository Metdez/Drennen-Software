export interface SpeakerPortalContent {
  welcome: {
    speakerName: string
    professorName: string
    courseLabel: string
    sessionDate: string
    studentCount: number
    greeting: string
  }
  studentInterests: {
    narrative: string
    topThemes: Array<{
      title: string
      description: string
    }>
  }
  sampleQuestions: {
    narrative: string
    questions: Array<{
      theme: string
      question: string
    }>
  }
  talkingPoints: Array<{
    point: string
    rationale: string
  }>
  audienceProfile: {
    narrative: string
    sentiment: {
      aspirational: number
      curious: number
      personal: number
      critical: number
    }
    recurringInterests: string[]
  }
  pastSpeakerInsights: {
    available: boolean
    narrative: string
    highlights: Array<{
      insight: string
      context: string
    }>
  }
}

export interface PostSessionFeedback {
  overallRating: number
  topicsResonated: string[]
  studentHighlights: string
  professorNotes: string
  narrative: string
}

export interface SpeakerPortalRow {
  id: string
  session_id: string
  user_id: string
  content: SpeakerPortalContent
  edited_content: SpeakerPortalContent | null
  post_session: PostSessionFeedback | null
  share_token: string
  is_published: boolean
  created_at: string
  updated_at: string
}

export interface SpeakerPortal {
  id: string
  sessionId: string
  userId: string
  content: SpeakerPortalContent
  editedContent: SpeakerPortalContent | null
  postSession: PostSessionFeedback | null
  shareToken: string
  isPublished: boolean
  createdAt: string
  updatedAt: string
}
