export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  PREVIEW: '/preview',
  PREVIEW_THEME: '/preview/theme',
  HISTORY: '/history',
  ROSTER: '/roster',
  ANALYTICS: '/analytics',
  API_PROCESS: '/api/process',
  API_SESSIONS: '/api/sessions',
  API_AUTH_CALLBACK: '/api/auth/callback',
  API_SESSION_ANALYSIS: (id: string) => `/api/sessions/${id}/analysis`,
  API_SESSION_THEME_ANALYSIS: (id: string) => `/api/sessions/${id}/theme-analysis`,
  API_STUDENT_PROFILE: (name: string) => `/api/roster/${encodeURIComponent(name)}/profile`,
  SHARED: (token: string) => `/shared/${token}`,
  API_SESSION_SHARE: (id: string) => `/api/sessions/${id}/share`,
  API_SHARED_SESSION: (token: string) => `/api/shared/${token}`,
  API_SHARED_ANALYSIS: (token: string) => `/api/shared/${token}/analysis`,
  API_SHARED_DOWNLOAD: (token: string) => `/api/shared/${token}/download`,
  PREVIEW_BRIEF: '/preview/brief',
  API_SESSION_BRIEF: (id: string) => `/api/sessions/${id}/brief`,
  API_SESSION_BRIEF_DOWNLOAD: (id: string) => `/api/sessions/${id}/brief/download`,
  API_SESSION_DEBRIEF: (id: string) => `/api/sessions/${id}/debrief`,
  API_SESSION_DEBRIEF_COMPLETE: (id: string) => `/api/sessions/${id}/debrief/complete`,
  COMPARE: '/compare',
  API_COMPARE: '/api/compare',
  API_COMPARE_ANALYSIS: '/api/compare/analysis',
  API_COMPARE_SHARE: '/api/compare/share',
  SHARED_COMPARE: (token: string) => `/shared/compare/${token}`,
  API_SHARED_COMPARE: (token: string) => `/api/shared/compare/${token}`,
  REPORTS: '/reports',
  REPORT: (id: string) => `/reports/${id}`,
  API_REPORT_GENERATE: '/api/reports/generate',
  API_REPORT: (id: string) => `/api/reports/${id}`,
  API_REPORT_DOWNLOAD: (id: string) => `/api/reports/${id}/download`,
  SEMESTERS: '/semesters',
  ANALYTICS_COMPARE: '/analytics/compare',
  API_SEMESTERS: '/api/semesters',
  API_SEMESTER: (id: string) => `/api/semesters/${id}`,
  API_SEMESTERS_ASSIGN: '/api/semesters/assign',
  API_SEMESTERS_COMPARE: '/api/semesters/compare',
  API_ROSTER: '/api/roster',
} as const

export const BRAND = {
  ORANGE: '#f36f21',
  PURPLE: '#542785',
  GREEN: '#0f6b37',
} as const

export const APP_NAME = 'Drennen MGMT 305' as const

export const AI_CONFIG = {
  MAX_TOKENS: 4000,
  TEMPERATURE: 0.3,
} as const

export const ACCEPTED_FILE_TYPES = ['.pdf', '.docx'] as const
export const ACCEPTED_ZIP_MIME = 'application/zip' as const
