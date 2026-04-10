/**
 * Centralised route path registry for the entire application.
 *
 * Every page path and API endpoint should be represented here. Use these constants
 * everywhere instead of hardcoding path strings — this makes refactoring routes a
 * single-file change and makes grepping for route usage reliable.
 *
 * Conventions:
 * - Static paths are plain strings: `ROUTES.DASHBOARD`
 * - Dynamic paths are arrow functions that accept the ID/token parameter: `ROUTES.API_SESSION(id)`
 * - All API routes start with `API_`; public share routes have their own prefix
 *
 * Do NOT import from this file directly. Import from the `@/lib/constants` barrel instead.
 */
/**
 * Defines a comprehensive collection of all client-side navigation paths and backend API endpoints utilized throughout the application.
 *
 * Why it is used:
 * It provides a centralized, strongly-typed, and consistent mechanism for referencing application routes and API endpoints. This approach prevents the proliferation of hardcoded strings, reduces the risk of typos, and significantly enhances maintainability and refactorability across the codebase.
 *
 * Important implementation details:
 * - The object is declared as `const` and uses `as const` to ensure deep immutability and literal type inference for all its properties. This provides strong type checking and read-only access.
 * - Routes are defined either as static string paths or as functions that generate paths dynamically based on provided parameters (e.g., IDs, names, tokens).
 * - For dynamic path segments that might contain special characters (such as student names), `encodeURIComponent` is explicitly used to ensure that the generated URLs are valid and properly formatted.
 * - It encompasses both user-facing client-side navigation routes (e.g., `/dashboard`) and server-facing API endpoints (e.g., `/api/process`).
 */
export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  PREVIEW: '/preview',
  PREVIEW_THEME: '/preview/theme',
  HISTORY: '/history',
  ROSTER: '/roster',
  ANALYTICS: '/analytics',
  API_PROCESS: '/api/process',
  API_SYSTEM_PROMPTS: '/api/system-prompts',
  API_SYSTEM_PROMPT_ACTIVATE: (id: string) => `/api/system-prompts/${id}/activate`,
  API_SYSTEM_PROMPTS_RESET: '/api/system-prompts/reset',
  API_SESSIONS: '/api/sessions',
  API_SESSION_RERUN: (id: string) => `/api/sessions/${id}/rerun`,
  API_AUTH_CALLBACK: '/api/auth/callback',
  API_SESSION_ANALYSIS: (id: string) => `/api/sessions/${id}/analysis`,
  API_SESSION_THEME_ANALYSIS: (id: string) => `/api/sessions/${id}/theme-analysis`,
  API_STUDENT_PROFILE: (name: string) => `/api/roster/${encodeURIComponent(name)}/profile`,
  API_STUDENT_NOTES: (name: string) => `/api/roster/${encodeURIComponent(name)}/notes`,
  SHARED: (token: string) => `/shared/${token}`,
  API_SESSION_SHARE: (id: string) => `/api/sessions/${id}/share`,
  API_SHARED_SESSION: (token: string) => `/api/shared/${token}`,
  API_SHARED_ANALYSIS: (token: string) => `/api/shared/${token}/analysis`,
  API_SHARED_DOWNLOAD: (token: string) => `/api/shared/${token}/download`,
  PREVIEW_BRIEF: '/preview/brief',
  API_SESSION_BRIEF: (id: string) => `/api/sessions/${id}/brief`,
  API_SESSION_BRIEF_DOWNLOAD: (id: string) => `/api/sessions/${id}/brief/download`,
  API_SESSION_DEBRIEF: (id: string) => `/api/sessions/${id}/debrief`,
  API_SESSION_STUDENT_DEBRIEFS: (id: string) => `/api/sessions/${id}/student-debriefs`,
  API_SESSION_SPEAKER_ANALYSES: (id: string) => `/api/sessions/${id}/speaker-analyses`,
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
  STORY: (id: string) => `/stories/${id}`,
  API_STORY_GENERATE: '/api/stories/generate',
  API_STORY: (id: string) => `/api/stories/${id}`,
  API_STORY_DOWNLOAD: (id: string) => `/api/stories/${id}/download`,
  SEMESTERS: '/semesters',
  ANALYTICS_COMPARE: '/analytics/compare',
  API_SEMESTERS: '/api/semesters',
  API_SEMESTER: (id: string) => `/api/semesters/${id}`,
  API_SEMESTERS_ASSIGN: '/api/semesters/assign',
  API_SEMESTERS_COMPARE: '/api/semesters/compare',
  API_ROSTER: '/api/roster',
  ACCOUNT: '/account',
  API_SUBSCRIPTION: '/api/subscription',
  API_STRIPE_CHECKOUT: '/api/stripe/checkout',
  API_STRIPE_WEBHOOK: '/api/stripe/webhook',
  API_STRIPE_PORTAL: '/api/stripe/portal',
  API_STRIPE_INVOICES: '/api/stripe/invoices',
  // Speaker portal
  PREVIEW_PORTAL: '/preview/portal',
  API_SESSION_PORTAL: (id: string) => `/api/sessions/${id}/portal`,
  API_SESSION_PORTAL_PUBLISH: (id: string) => `/api/sessions/${id}/portal/publish`,
  API_SPEAKER_PORTAL: (token: string) => `/api/speaker/${token}`,
  SPEAKER_PORTAL: (token: string) => `/speaker/${token}`,
  // Portfolio sharing
  API_PORTFOLIO: '/api/portfolio',
  PORTFOLIO: (token: string) => `/portfolio/${token}`,
  API_PORTFOLIO_PUBLIC: (token: string) => `/api/portfolio/${token}`,
  API_PORTFOLIO_SESSIONS: (token: string) => `/api/portfolio/${token}/sessions`,
  API_PORTFOLIO_SESSION: (token: string, id: string) => `/api/portfolio/${token}/sessions/${id}`,
  API_PORTFOLIO_ANALYTICS: (token: string) => `/api/portfolio/${token}/analytics`,
  API_PORTFOLIO_ROSTER: (token: string) => `/api/portfolio/${token}/roster`,
  API_PORTFOLIO_STUDENT: (token: string, name: string) => `/api/portfolio/${token}/roster/${encodeURIComponent(name)}`,
  API_PORTFOLIO_REPORTS: (token: string) => `/api/portfolio/${token}/reports`,
  API_PORTFOLIO_REPORT: (token: string, id: string) => `/api/portfolio/${token}/reports/${id}`,
} as const
