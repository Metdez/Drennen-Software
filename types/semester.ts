export interface SemesterRow {
  id: string
  user_id: string
  name: string
  start_date: string
  end_date: string
  status: 'active' | 'archived'
  created_at: string
}

export interface Semester {
  id: string
  userId: string
  name: string
  startDate: string
  endDate: string
  status: 'active' | 'archived'
  createdAt: string
}

export interface CreateSemesterInput {
  userId: string
  name: string
  startDate: string
  endDate: string
}

export interface UpdateSemesterInput {
  name?: string
  startDate?: string
  endDate?: string
  status?: 'active' | 'archived'
}

export interface SemesterSummary {
  id: string
  name: string
  status: 'active' | 'archived'
  sessionCount: number
  startDate: string
  endDate: string
}
