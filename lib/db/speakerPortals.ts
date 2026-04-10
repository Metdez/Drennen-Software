/**
 * @file lib/db/speakerPortals.ts
 *
 * CRUD for speaker portal data — token-gated pages shared directly with guest
 * speakers.  Portals have two lifecycle phases:
 *
 *  1. **Pre-session** — AI-generated `content` summarising student questions
 *     (populated by `lib/ai/speakerPortal.ts`).  Professors may override with
 *     `edited_content` before publishing.
 *  2. **Post-session** — Speaker-submitted `post_session` feedback captured
 *     after the talk (populated by `lib/ai/speakerPortalPostSession.ts`).
 *
 * Publishing sets `is_published = true` and exposes the portal under
 * `app/(public)/speaker/[token]/`.
 *
 * Table: speaker_portals
 * Client: createAdminClient() — bypasses RLS throughout (portals are written by
 *         background AI jobs, read by unauthenticated speakers via share token,
 *         and managed by professors in authenticated context)
 *
 * Called by:
 *   - app/api/sessions/[id]/portal/route.ts          (GET, POST, PATCH)
 *   - app/api/sessions/[id]/portal/publish/route.ts  (POST — publishSpeakerPortal)
 *
 * Read by (public, no auth):
 *   - app/api/speaker/[token]/route.ts  (getPortalByShareToken)
 */

import { createAdminClient } from '@/lib/supabase/server'
import type { SpeakerPortal, SpeakerPortalContent, SpeakerPortalRow, PostSessionFeedback } from '@/types'

/**
 * Map a raw `speaker_portals` database row to the camelCase domain type.
 */
/**
 * Maps a raw `speaker_portals` database row, which uses snake_case column names, to the application's `SpeakerPortal` domain type, which uses camelCase. This ensures consistency and type safety within the application layer.
 *
 * It is used to transform data retrieved directly from the database into a format that is easily consumed by the rest of the application. This abstraction helps decouple the database schema from the application's internal data model.
 *
 * The function performs a direct one-to-one mapping of fields, renaming `session_id` to `sessionId`, `user_id` to `userId`, `edited_content` to `editedContent`, `post_session` to `postSession`, `share_token` to `shareToken`, `is_published` to `isPublished`, `created_at` to `createdAt`, and `updated_at` to `updatedAt`.
 */
function rowToPortal(row: SpeakerPortalRow): SpeakerPortal {
  return {
    id: row.id,
    sessionId: row.session_id,
    userId: row.user_id,
    content: row.content,
    editedContent: row.edited_content,
    postSession: row.post_session,
    shareToken: row.share_token,
    isPublished: row.is_published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * Retrieve the speaker portal for a session, if one has been generated.
 *
 * @param sessionId - UUID of the session
 * @returns `SpeakerPortal` or `null` if no portal has been created yet
 * @throws {Error} If the Supabase query fails
 *
 * Client: createAdminClient() — bypasses RLS
 * Called by: app/api/sessions/[id]/portal/route.ts (GET)
 */
/**
 * Retrieves a single speaker portal record from the `speaker_portals` table associated with a given session ID. If no portal has been created for the session, it returns `null`.
 *
 * This function is used by API endpoints that need to fetch the current state of a speaker portal for display or further processing. It serves as the primary read operation for individual portals.
 *
 * It uses `createAdminClient()` to bypass Row Level Security (RLS), ensuring that the application can always retrieve portal data regardless of the authenticated user's permissions. The `.maybeSingle()` method is crucial here, as it handles cases where a record might not exist without throwing an error, returning `null` instead. The fetched data is then transformed using `rowToPortal`.
 */
export async function getSpeakerPortal(sessionId: string): Promise<SpeakerPortal | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('speaker_portals')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? rowToPortal(data as SpeakerPortalRow) : null
}

/**
 * Insert or replace the AI-generated portal content for a session.
 *
 * Uses upsert on `session_id` so re-generating the portal replaces the
 * previous content without creating a duplicate row.  The `share_token` and
 * `is_published` columns remain unchanged on conflict — only `content` and
 * `updated_at` are overwritten.
 *
 * @param sessionId - UUID of the session
 * @param userId    - UUID of the owning professor
 * @param content   - Full `SpeakerPortalContent` payload from the Gemini agent
 * @returns The saved `SpeakerPortal` row
 * @throws {Error} If the upsert fails
 *
 * Client: createAdminClient() — bypasses RLS
 * Called by: app/api/sessions/[id]/portal/route.ts (POST)
 */
/**
 * Inserts new AI-generated speaker portal content for a specific session. If a portal for the given `sessionId` already exists, it updates the existing record (upsert operation).
 *
 * This function is critical for creating initial portal content or re-generating it. It ensures that regenerating content for the same session replaces the old content rather than creating duplicate records, maintaining data integrity.
 *
 * It employs Supabase's `upsert` functionality with `onConflict: 'session_id'`. On conflict, only the `content` and `updated_at` columns are overwritten, preserving the `share_token` and `is_published` status. It uses `createAdminClient()` to bypass RLS, allowing server-side operations without user authentication context. The result is transformed using `rowToPortal`.
 */
export async function insertSpeakerPortal(
  sessionId: string,
  userId: string,
  content: SpeakerPortalContent
): Promise<SpeakerPortal> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('speaker_portals')
    .upsert(
      { session_id: sessionId, user_id: userId, content, updated_at: new Date().toISOString() },
      { onConflict: 'session_id' }
    )
    .select()
    .single()
  if (error) throw new Error(error.message)
  return rowToPortal(data as SpeakerPortalRow)
}

/**
 * Save professor edits to portal content, or clear them by passing `null`.
 *
 * `edited_content` overlays the original AI content for the published view
 * without mutating the original. Passing `null` reverts to the AI version.
 *
 * @param sessionId     - UUID of the session
 * @param editedContent - Updated `SpeakerPortalContent`, or `null` to clear edits
 * @throws {Error} If the update fails
 *
 * Client: createAdminClient() — bypasses RLS
 * Called by: app/api/sessions/[id]/portal/route.ts (PATCH)
 */
/**
 * Updates the `edited_content` field of a speaker portal, allowing professors to apply their own modifications to the AI-generated content. Passing `null` to `editedContent` clears any existing edits.
 *
 * This function is used to store and manage professor-made changes to the portal content. The `edited_content` field acts as an overlay, enabling professors to customize the public-facing portal without altering the original AI-generated `content`.
 *
 * It performs an `UPDATE` operation on the `speaker_portals` table, targeting the record by `session_id`. It updates `edited_content` and `updated_at`. `createAdminClient()` is used to ensure the update can be performed without RLS restrictions.
 */
export async function updateSpeakerPortalEdits(
  sessionId: string,
  editedContent: SpeakerPortalContent | null
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('speaker_portals')
    .update({ edited_content: editedContent, updated_at: new Date().toISOString() })
    .eq('session_id', sessionId)
  if (error) throw new Error(error.message)
}

/**
 * Publish the portal — sets `is_published = true` and returns the share token
 * that was assigned at row creation (DB DEFAULT `gen_random_uuid()`).
 *
 * The share token is stable; publishing/unpublishing toggles visibility without
 * rotating the URL.
 *
 * @param sessionId - UUID of the session whose portal is being published
 * @returns The portal's `share_token` string (for building the public URL)
 * @throws {Error} If the update fails or no row exists for `sessionId`
 *
 * Client: createAdminClient() — bypasses RLS
 * Called by: app/api/sessions/[id]/portal/publish/route.ts (POST)
 */
/**
 * Publishes a speaker portal by setting its `is_published` status to `true`. This action makes the portal accessible via its unique `share_token` public URL.
 *
 * This function is used when a professor is ready to make their speaker portal public. It's a key step in the workflow of sharing the portal with speakers.
 *
 * It updates the `is_published` flag and `updated_at` timestamp for the portal identified by `sessionId`. The `share_token` column, typically generated as a default value upon initial row creation, is retrieved and returned. This token remains stable across publish/unpublish cycles, meaning the public URL does not change. `createAdminClient()` is utilized to bypass RLS.
 */
export async function publishSpeakerPortal(sessionId: string): Promise<string> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('speaker_portals')
    .update({ is_published: true, updated_at: new Date().toISOString() })
    .eq('session_id', sessionId)
    .select('share_token')
    .single()
  if (error) throw new Error(error.message)
  return data.share_token as string
}

/**
 * Unpublish the portal — sets `is_published = false` to hide it from the
 * public URL without deleting the row or rotating the token.
 *
 * @param sessionId - UUID of the session
 * @throws {Error} If the update fails
 *
 * Client: createAdminClient() — bypasses RLS
 * Called by: app/api/sessions/[id]/portal/publish/route.ts (DELETE / toggle off)
 */
/**
 * Unpublishes a speaker portal by setting its `is_published` status to `false`. This action makes the portal inaccessible via its public `share_token` URL.
 *
 * This function allows professors to revoke public access to a speaker portal without deleting the portal's data. It effectively hides the portal from public view.
 *
 * It performs an `UPDATE` operation on the `speaker_portals` table, setting `is_published` to `false` and updating `updated_at`. The portal record itself is not deleted, nor is the `share_token` changed, allowing for easy re-publishing later if desired. `createAdminClient()` is used to bypass RLS.
 */
export async function unpublishSpeakerPortal(sessionId: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('speaker_portals')
    .update({ is_published: false, updated_at: new Date().toISOString() })
    .eq('session_id', sessionId)
  if (error) throw new Error(error.message)
}

/**
 * Attach post-session feedback to the portal row.
 *
 * Called after the speaker submits their reflection via the public portal page.
 * Writes to the `post_session` JSONB column without touching the pre-session
 * `content` or `edited_content` columns.
 *
 * @param sessionId - UUID of the session
 * @param feedback  - `PostSessionFeedback` payload from the speaker's form
 * @throws {Error} If the update fails
 *
 * Client: createAdminClient() — bypasses RLS (called from public route with no auth)
 * Called by: app/api/sessions/[id]/portal/route.ts (POST post-session)
 */
/**
 * Attaches post-session feedback provided by a speaker to their corresponding speaker portal record. This feedback is stored in the `post_session` JSONB column.
 *
 * This function is used to capture the speaker's reflections and feedback after their session, integrating it directly into the portal's data for later review by the professor.
 *
 * It performs an `UPDATE` operation on the `speaker_portals` table, specifically updating the `post_session` column with the provided `feedback` payload and updating the `updated_at` timestamp. It explicitly avoids touching the pre-session `content` or `edited_content`. `createAdminClient()` is used because this operation might be called from a public route without a user session, requiring RLS bypass.
 */
export async function updatePostSessionFeedback(
  sessionId: string,
  feedback: PostSessionFeedback
): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('speaker_portals')
    .update({ post_session: feedback, updated_at: new Date().toISOString() })
    .eq('session_id', sessionId)
  if (error) throw new Error(error.message)
}

/**
 * Resolve a public share token to the portal record + speaker name.
 * Only returns published portals (`is_published = true`).
 *
 * Performs two sequential queries:
 *  1. Look up the portal row by `share_token` where `is_published = true`
 *  2. Fetch `speaker_name` from the linked `sessions` row
 *
 * @param token - UUID share token from the public URL (`/speaker/[token]`)
 * @returns `{ portal, speakerName }` or `null` if token invalid / portal unpublished
 *
 * Client: createAdminClient() — bypasses RLS (public route, no auth cookie)
 * Read by: app/api/speaker/[token]/route.ts
 */
/**
 * Retrieves a published speaker portal and the associated speaker's name using a public `share_token`. It performs two sequential database queries to gather the necessary information.
 *
 * This function is crucial for serving the public-facing speaker portal page, allowing external users (speakers) to access their portal content using a unique, shareable URL.
 *
 * It first queries `speaker_portals` by `share_token` and `is_published = true` to ensure only publicly accessible portals are returned. If a portal is found, it then queries the `sessions` table using the portal's `session_id` to retrieve the `speaker_name`. `createAdminClient()` is used for both queries to bypass RLS, as this function is called from a public route without authentication. Returns `null` if the token is invalid or the portal is not published.
 */
export async function getPortalByShareToken(
  token: string
): Promise<{ portal: SpeakerPortal; speakerName: string } | null> {
  const supabase = createAdminClient()

  // Step 1: fetch the portal row — the `is_published` filter prevents serving
  // portals that the professor has subsequently unpublished
  const { data: portalRow, error: portalErr } = await supabase
    .from('speaker_portals')
    .select('*')
    .eq('share_token', token)
    .eq('is_published', true)
    .maybeSingle()

  if (portalErr || !portalRow) return null

  // Step 2: fetch speaker name from the parent session for the portal header
  const { data: session, error: sessErr } = await supabase
    .from('sessions')
    .select('speaker_name')
    .eq('id', portalRow.session_id)
    .single()

  if (sessErr || !session) return null

  return {
    portal: rowToPortal(portalRow as SpeakerPortalRow),
    speakerName: session.speaker_name as string,
  }
}
