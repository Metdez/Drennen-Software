export interface SpeakerBriefContent {
  header: {
    speakerName: string
    date: string
    studentCount: number
    courseLabel: string
  }
  narrative: string
  topThemes: Array<{
    title: string
    description: string
  }>
  talkingPoints: Array<{
    point: string
    rationale: string
  }>
  classContext: string
  whatToExpect: string
}

export interface SpeakerBriefRow {
  id: string
  session_id: string
  user_id: string
  content: SpeakerBriefContent
  edited_content: SpeakerBriefContent | null
  created_at: string
  updated_at: string
}

export interface SpeakerBrief {
  id: string
  sessionId: string
  userId: string
  content: SpeakerBriefContent
  editedContent: SpeakerBriefContent | null
  createdAt: string
  updatedAt: string
}
