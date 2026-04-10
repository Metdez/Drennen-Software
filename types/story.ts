/**
 * @file types/story.ts
 * @description Semester narrative story types.
 *
 * Semester stories are narrative-driven counterparts to data-driven reports
 * (see report.ts). They are generated on-demand by `lib/ai/storyAgent.ts`
 * and present the semester as a human-readable arc with five named sections.
 *
 * Stories are accessed through:
 *   POST /api/stories/generate       → triggers generation, returns SemesterStory
 *   GET  /api/stories/[id]           → fetch a stored story
 *   GET  /api/stories/[id]/download  → export as PDF or DOCX
 *
 * Rendered on /stories/[id] and linked from the /semesters page
 * (see `SemesterSummary.storyId`).
 *
 * Row vs Domain:
 *   SemesterStoryRow — raw Supabase row (snake_case, `semester_stories` table)
 *   SemesterStory    — camelCase domain object used in the app
 */

/**
 * The five fixed section keys that make up every semester story.
 * Each maps to a distinct narrative arc stage.
 */
/**
 * Defines the distinct keys for the five narrative sections that constitute a semester story.
 * 1. What it does: Enumerates the fixed roles or themes for each part of a story, ensuring consistency in the story's structure.
 * 2. Why it is used: Provides a clear, type-safe way to refer to specific sections of a story, both for identification and ordering purposes.
 * 3. Important implementation details: Stories always contain exactly these five sections, in this specific order. Each key represents a foundational element of the story arc.
 */
export type StorySectionKey =
  | 'opening'            // Sets the stage — who are the students, what's the semester context
  | 'speakers_and_themes' // The parade of guests and what topics they sparked
  | 'student_journey'    // How students developed and grew over the semester
  | 'discoveries'        // Surprising moments, unexpected connections, memorable exchanges
  | 'closing'            // Reflection and look-ahead

/**
 * A single narrative section within a semester story.
 * Stories always contain exactly five sections, one per `StorySectionKey`.
 */
/**
 * A single narrative section within a semester story.
 * Stories always contain exactly five sections, one per `StorySectionKey`.
 *
 * key:
 * The section's fixed role in the story arc.
 *
 * title:
 * AI-generated display title for this section.
 *
 * body:
 * Full narrative body text for this section (may contain multiple paragraphs).
 */
export interface StorySection {
  /** The section's fixed role in the story arc. */
  key: StorySectionKey
  /** AI-generated display title for this section. */
  title: string
  /** Full narrative body text for this section (may contain multiple paragraphs). */
  body: string
}

/**
 * Domain-level semester story object (camelCase).
 * Returned by GET /api/stories/[id] and POST /api/stories/generate.
 */
/**
 * Domain-level semester story object (camelCase).
 * Returned by GET /api/stories/[id] and POST /api/stories/generate.
 *
 * id:
 * The unique identifier for this semester story.
 *
 * userId:
 * The ID of the user who owns or generated this story.
 *
 * semesterId:
 * FK to the semester this story was generated for.
 *
 * title:
 * AI-generated story title.
 *
 * sections:
 * Exactly five sections in StorySectionKey order.
 *
 * sessionIds:
 * IDs of the sessions included as source data for the story.
 *
 * createdAt:
 * The timestamp when this story was created.
 *
 * updatedAt:
 * The timestamp when this story was last updated.
 */
export interface SemesterStory {
  id: string
  userId: string
  /** FK to the semester this story was generated for. */
  semesterId: string
  /** AI-generated story title. */
  title: string
  /** Exactly five sections in StorySectionKey order. */
  sections: StorySection[]
  /** IDs of the sessions included as source data for the story. */
  sessionIds: string[]
  createdAt: string
  updatedAt: string
}

/** Raw database row for the `semester_stories` table. */
/**
 * Raw database row for the `semester_stories` table.
 *
 * id:
 * The unique identifier for this semester story, as stored in the database.
 *
 * user_id:
 * The ID of the user who owns or generated this story, matching the database column name.
 *
 * semester_id:
 * FK to the semester this story was generated for.
 *
 * title:
 * The AI-generated story title.
 *
 * sections:
 * JSONB array — exactly five StorySection objects.
 *
 * session_ids:
 * Array of session IDs used as source data for the story.
 *
 * created_at:
 * The timestamp when this story was created, as stored in the database.
 *
 * updated_at:
 * The timestamp when this story was last updated, as stored in the database.
 */
export interface SemesterStoryRow {
  id: string
  user_id: string
  /** FK to the semester this story was generated for. */
  semester_id: string
  title: string
  /** JSONB array — exactly five StorySection objects. */
  sections: StorySection[]
  /** Array of session IDs used as source data for the story. */
  session_ids: string[]
  created_at: string
  updated_at: string
}
