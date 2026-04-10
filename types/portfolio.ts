/**
 * @file types/portfolio.ts
 * @description Portfolio share types for the public professor portfolio feature.
 *
 * A portfolio share lets a professor share a curated, token-protected public
 * view of their work with administrators, accreditation reviewers, or other
 * external audiences. The professor controls which sections are visible via
 * `PortfolioConfig`.
 *
 * Data is stored in the `portfolio_shares` table and accessed through:
 *   GET/POST /api/portfolio         → list/create portfolio shares
 *   GET      /api/portfolio/[token] → public config fetch (no auth required)
 *
 * The public portfolio is rendered under the (public) layout at:
 *   /portfolio/[token]                     — landing page
 *   /portfolio/[token]/analytics           — analytics view
 *   /portfolio/[token]/reports             — reports list
 *   /portfolio/[token]/roster              — student roster
 *   /portfolio/[token]/sessions            — sessions list
 *   /portfolio/[token]/sessions/[id]       — single session view
 *
 * Managed from the professor's account area via PortfolioSharePanel component.
 *
 * Row vs Domain:
 *   PortfolioShareRow — raw Supabase row shape (snake_case)
 *   PortfolioShare    — camelCase domain object used in the app
 */

/**
 * Configuration object controlling which sections are visible in a portfolio share.
 * Stored as JSONB in `portfolio_shares.config`.
 */
/**
 * Defines the configuration options for a portfolio's visibility and content. This interface allows for fine-grained control over what data is exposed in a shared portfolio.
 *
 * Why it is used: It is crucial for allowing users (e.g., professors) to customize how their portfolios are shared, including the scope of sessions, whether student profiles are visible, and if reports are included. This configuration is stored as a JSONB field within the database.
 *
 * Important implementation details: The `scope` property determines if data from 'all' sessions or a specific 'semester' is shown. If `scope` is 'semester', then `semesterId` must be provided. `includeStudentProfiles` controls the exposure of student identities, while `includeReports` dictates whether generated semester reports are part of the shared view.
 */
export interface PortfolioConfig {
  /**
   * Whether to show data from all sessions ('all') or only from a specific semester.
   * When 'semester', `semesterId` must be set.
   */
  scope: 'all' | 'semester'
  /** FK to the semester to scope data to; null when scope is 'all'. */
  semesterId: string | null
  /**
   * Whether to expose the student roster and per-student profile pages.
   * Set to false to hide student identity from external viewers.
   */
  includeStudentProfiles: boolean
  /** Whether to include generated semester reports in the portfolio. */
  includeReports: boolean
}

/** Raw database row for the `portfolio_shares` table. */
/**
 * Represents the raw database row structure for the `portfolio_shares` table. This interface defines the schema for how portfolio sharing information is stored directly in the persistent layer.
 *
 * Why it is used: It provides a type-safe contract for interacting with the database, ensuring consistency when reading from or writing to the `portfolio_shares` table. It reflects the database's snake_case naming conventions.
 *
 * Important implementation details: Properties like `user_id`, `share_token`, `created_at`, and `updated_at` directly map to database columns. The `config` property is expected to be a JSONB column in the database, storing the `PortfolioConfig` object. The `share_token` is an opaque identifier used to generate public URLs for accessing the portfolio.
 */
export interface PortfolioShareRow {
  id: string
  user_id: string
  /** Opaque token used in the public portfolio URL: /portfolio/[token] */
  share_token: string
  /** Whether the portfolio is publicly accessible. When false, the token returns 404. */
  enabled: boolean
  /** JSONB — visibility configuration for the portfolio. */
  config: PortfolioConfig
  created_at: string
  updated_at: string
}

/**
 * Domain-level portfolio share object (camelCase).
 * Returned by GET /api/portfolio and used in the PortfolioSharePanel component.
 */
/**
 * Represents the domain-level portfolio share object, typically used within the application's business logic and API responses. This is a camelCase version of the `PortfolioShareRow`, adapted for application-side consumption.
 *
 * Why it is used: To provide a clean, application-friendly data structure that is easier to work with in frontend components (e.g., `PortfolioSharePanel`) and API services. It abstracts away database-specific naming conventions.
 *
 * Important implementation details: It mirrors the `PortfolioShareRow` but transforms snake_case properties (like `user_id`, `share_token`, `created_at`, `updated_at`) into camelCase (`userId`, `shareToken`, `createdAt`, `updatedAt`). It embeds the `PortfolioConfig` object directly, providing a comprehensive view of the share's settings. This object is commonly returned by API endpoints such as `GET /api/portfolio`.
 */
export interface PortfolioShare {
  id: string
  userId: string
  /** Opaque token used in the public portfolio URL: /portfolio/[token] */
  shareToken: string
  /** Whether the portfolio is publicly accessible. When false, the token returns 404. */
  enabled: boolean
  /** Visibility configuration for the portfolio. */
  config: PortfolioConfig
  createdAt: string
  updatedAt: string
}

/**
 * Sensible defaults when creating a new portfolio share.
 * Shows all sessions and all sections by default; the professor can narrow it
 * from the PortfolioSharePanel.
 */
/**
 * Provides sensible default values for a `PortfolioConfig` object when a new portfolio share is created.
 *
 * Why it is used: To simplify the initial setup process for users and ensure a consistent starting state for new portfolio shares. By providing defaults, it reduces the number of initial choices a user needs to make.
 *
 * Important implementation details: By default, it sets the `scope` to 'all' (showing data from all available sessions), `semesterId` to `null` (as it's not scoped to a specific semester), and `includeStudentProfiles` and `includeReports` to `true`. These defaults provide a comprehensive view of student work, which can then be customized by the professor using the `PortfolioSharePanel`.
 */
export const DEFAULT_PORTFOLIO_CONFIG: PortfolioConfig = {
  scope: 'all',
  semesterId: null,
  includeStudentProfiles: true,
  includeReports: true,
}
