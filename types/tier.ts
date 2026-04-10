/**
 * @file types/tier.ts
 * @description Question quality tier classification types.
 *
 * After a session is created, `lib/ai/tierClassifier.ts` runs fire-and-forget
 * to classify each student question into one of four quality tiers:
 *   Tier 1 — exceptional ("home run")
 *   Tier 2 — solid
 *   Tier 3 — acceptable
 *   Tier 4 — surface-level ("flat")
 *
 * Results are stored in the `session_tier_data` table and accessed through:
 *   (internal use — no dedicated public API endpoint; data is bundled into
 *    session comparison and report payloads)
 *
 * Row vs Domain:
 *   SessionTierDataRow — raw Supabase row shape (snake_case)
 *   SessionTierData    — camelCase domain object used in components
 */

/**
 * Tier classification for a single question within a session.
 * Each question is uniquely identified by its theme + type + student.
 */
/**
 * Represents the quality tier and contextual metadata for a single question. It provides detailed information about an individual question's tier, the theme section it belongs to, its type (primary or backup), and the student who submitted it.
 *
 * This interface is used to store and convey granular data about question quality, enabling detailed analysis and display within the application. It is a fundamental building block for aggregating tier data.
 *
 * Important properties include `tier` (1-4, where 1 is best), `themeNumber` (1-based index), `themeTitle` (human-readable), `questionType` ('primary' or 'backup'), and `studentName`.
 */
export interface TierAssignment {
  /** Quality tier: 1 (best) to 4 (weakest). */
  tier: number
  /** The 1-based index of the theme section this question belongs to (1–10). */
  themeNumber: number
  /** Human-readable title of the theme section. */
  themeTitle: string
  /** Whether this question is the primary or a backup question for its theme. */
  questionType: 'primary' | 'backup'
  /** Student who submitted this question. */
  studentName: string
}

/**
 * Aggregate tier breakdown for a session, combining counts and per-question assignments.
 * Used as a nested field in `SessionTierData`.
 */
/**
 * Aggregates comprehensive tier-related information for a specific session, combining overall counts of questions per tier level with individual question assignments.
 *
 * It is used to provide a consolidated view of question quality within a session. This structure is typically nested as a field within other domain models, such as `SessionTierData`, to encapsulate all relevant tier statistics and details for easier consumption and display.
 *
 * It contains two main properties: `tierCounts`, which is a dictionary mapping tier numbers (as strings) to the count of questions in that tier, and `tierAssignments`, an array of `TierAssignment` objects providing details for each individual question.
 */
export interface TierData {
  /**
   * Counts of questions per tier level.
   * Keys are tier numbers as strings ('1', '2', '3', '4');
   * values are the count of questions at that tier.
   */
  tierCounts: Record<string, number>
  /** Full per-question tier assignments for this session. */
  tierAssignments: TierAssignment[]
}

/** Raw database row for the `session_tier_data` table. */
/**
 * Defines the raw structure of a database row from the `session_tier_data` table, representing aggregated tier information for a session.
 *
 * This interface is used directly by the data access layer to map database records to application-level objects during data retrieval and persistence operations. It ensures type safety and consistency when interacting with the database schema, especially regarding snake_case column names and JSONB field types.
 *
 * Key implementation details include `snake_case` naming for database columns (e.g., `session_id`, `created_at`). The `tier_counts` and `tier_assignments` fields are explicitly noted as `JSONB` types in the database, indicating they store structured JSON data directly.
 */
export interface SessionTierDataRow {
  id: string
  session_id: string
  /** JSONB — counts per tier level. Keys are tier numbers as strings. */
  tier_counts: Record<string, number>
  /** JSONB array — per-question tier assignments. */
  tier_assignments: TierAssignment[]
  created_at: string
}

/**
 * Domain-level tier data object (camelCase).
 * Used in SessionComparisonSide and SemesterReport sections that show
 * question quality distributions.
 */
/**
 * Represents the domain-level object for aggregated session tier data, transformed from its raw database representation (`SessionTierDataRow`) into a more application-friendly format.
 *
 * It is used throughout the application's business logic, API responses, and UI components to provide a consistent, camelCase representation of session-level question quality. This model decouples the application's domain logic from the underlying database schema details.
 *
 * Important implementation details include the use of `camelCase` conventions for all property names (e.g., `sessionId`, `tierCounts`, `createdAt`). Its structure for `tierCounts` and `tierAssignments` is consistent with `TierData`, making it suitable for direct use in various parts of the application that display or process question quality distributions.
 */
export interface SessionTierData {
  id: string
  sessionId: string
  /**
   * Counts of questions per tier level.
   * Keys are tier numbers as strings ('1', '2', '3', '4').
   */
  tierCounts: Record<string, number>
  /** Full per-question tier assignments. */
  tierAssignments: TierAssignment[]
  createdAt: string
}
