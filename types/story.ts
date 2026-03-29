export type StorySectionKey =
  | 'opening'
  | 'speakers_and_themes'
  | 'student_journey'
  | 'discoveries'
  | 'closing'

export interface StorySection {
  key: StorySectionKey
  title: string
  body: string
}

export interface SemesterStory {
  id: string
  userId: string
  semesterId: string
  title: string
  sections: StorySection[]
  sessionIds: string[]
  createdAt: string
  updatedAt: string
}

export interface SemesterStoryRow {
  id: string
  user_id: string
  semester_id: string
  title: string
  sections: StorySection[]
  session_ids: string[]
  created_at: string
  updated_at: string
}
