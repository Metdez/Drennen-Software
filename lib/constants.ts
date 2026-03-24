export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  PREVIEW: '/preview',
  HISTORY: '/history',
  ROSTER: '/roster',
  ANALYTICS: '/analytics',
  API_PROCESS: '/api/process',
  API_SESSIONS: '/api/sessions',
  API_AUTH_CALLBACK: '/api/auth/callback',
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
