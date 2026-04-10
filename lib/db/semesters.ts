/**
 * @file lib/db/semesters.ts
 *
 * Database access layer for semester CRUD, archiving, and session assignment.
 *
 * Table: `semesters`
 *   - One row per semester per professor.
 *   - Status is either `'active'` or `'archived'`. Each professor has at most one
 *     `active` semester at a time — `archiveAndCreateSemester()` enforces this invariant.
 *   - Sessions reference a semester via `sessions.semester_id` (nullable FK).
 *     `semester_id = NULL` means the session is unassigned.
 *
 * Tables also touched:
 *   - `sessions` — read for session counts; updated by `assignSessionsToSemester()`
 *   - `semester_stories` — read for story IDs in `getSemestersByUser()`
 *
 * Mixed client usage:
 *   - `getSemestersByUser()` and `getSemesterById()` use `createClient()` (RLS enforced)
 *     — called in authenticated request context; RLS scopes rows to the current user.
 *   - All write operations and `getActiveSemester()` / `getUnassignedSessions()` use
 *     `createAdminClient()` — needed for cross-user background jobs and to avoid RLS
 *     policy friction on INSERT/UPDATE paths.
 *
 * Called by:
 *   app/api/semesters/route.ts (GET, POST)
 *   app/api/semesters/[id]/route.ts (PATCH)
 *   app/api/semesters/assign/route.ts (POST)
 *   app/api/process/route.ts (reads active semester to auto-assign new sessions)
 */

import { createAdminClient, createClient } from '@/lib/supabase/server'
import type { Semester, SemesterRow, SemesterSummary, CreateSemesterInput, UpdateSemesterInput, SessionSummary } from '@/types'
import { rowToSessionSummary } from '@/lib/utils/transforms'
import type { SessionRow } from '@/types'

/**
 * Maps a raw `semesters` DB row to the camelCase `Semester` domain type.
 * Kept private to this module — callers always receive domain types.
 *
 * @param row - Raw row from the `semesters` table.
 * @returns The `Semester` domain object.
 */
/**
 * Maps a raw `semesters` DB row to the camelCase `Semester` domain type.
 * Kept private to this module — callers always receive domain types.
 *
 * @param row - Raw row from the `semesters` table.
 * @returns The `Semester` domain object.
 */
function rowToSemester(row: SemesterRow): Semester {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    createdAt: row.created_at,
  }
}

/**
 * Fetches all semesters for a professor, enriched with session counts and story IDs.
 *
 * Performs three queries in sequence:
 *   1. Fetch all semester rows for the user.
 *   2. Count sessions per semester (via `sessions.semester_id`).
 *   3. Look up any generated `semester_stories` IDs per semester.
 *
 * The session counts and story IDs are merged in memory to produce `SemesterSummary`
 * objects, avoiding a complex JOIN that would be harder to type-safely consume.
 *
 * @param userId - The authenticated professor's user ID.
 * @returns Array of `SemesterSummary` objects sorted newest-first.
 * @throws  If either the semesters or sessions query fails.
 *
 * Called by: app/api/semesters/route.ts (GET)
 * Tables: semesters, sessions, semester_stories
 * Client: createClient() — RLS enforced
 */
/**
 * Fetches all semesters for a professor, enriched with session counts and story IDs.
 *
 * Performs three queries in sequence:
 *   1. Fetch all semester rows for the user.
 *   2. Count sessions per semester (via `sessions.semester_id`).
 *   3. Look up any generated `semester_stories` IDs per semester.
 *
 * The session counts and story IDs are merged in memory to produce `SemesterSummary`
 * objects, avoiding a complex JOIN that would be harder to type-safely consume.
 *
 * @param userId - The authenticated professor's user ID.
 * @returns Array of `SemesterSummary` objects sorted newest-first.
 * @throws  If either the semesters or sessions query fails.
 *
 * Called by: app/api/semesters/route.ts (GET)
 * Tables: semesters, sessions, semester_stories
 * Client: createClient() — RLS enforced
 */
export async function getSemestersByUser(userId: string): Promise<SemesterSummary[]> {
  const supabase = createClient()

  const { data: semesters, error: semErr } = await supabase
    .from('semesters')
    .select('id, name, start_date, end_date, status, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (semErr) throw new Error(`Failed to fetch semesters: ${semErr.message}`)
  if (!semesters || semesters.length === 0) return []

  const semesterIds = semesters.map(s => s.id)

  // Batch-fetch session IDs for all semesters at once to avoid N queries
  const { data: sessions, error: sessErr } = await supabase
    .from('sessions')
    .select('id, semester_id')
    .in('semester_id', semesterIds)

  if (sessErr) throw new Error(`Failed to count sessions: ${sessErr.message}`)

  // Build a count map: semesterId → number of sessions
  const countMap = new Map<string, number>()
  for (const s of sessions ?? []) {
    countMap.set(s.semester_id, (countMap.get(s.semester_id) ?? 0) + 1)
  }

  // Fetch story IDs for each semester (stories are optional — no error thrown if absent)
  const { data: stories } = await supabase
    .from('semester_stories')
    .select('id, semester_id')
    .in('semester_id', semesterIds)

  // Build a story map: semesterId → storyId
  const storyMap = new Map<string, string>()
  for (const s of stories ?? []) {
    storyMap.set(s.semester_id, s.id)
  }

  return semesters.map(s => ({
    id: s.id,
    name: s.name,
    status: s.status as 'active' | 'archived',
    sessionCount: countMap.get(s.id) ?? 0,
    startDate: s.start_date,
    endDate: s.end_date,
    // `null` when no story has been generated yet for this semester
    storyId: storyMap.get(s.id) ?? null,
  }))
}

/**
 * Fetches the single `active` semester for a professor, or `null` if none exists.
 *
 * Used at session upload time (`/api/process`) to auto-assign the new session to
 * whichever semester is currently active. Uses admin client because this is called
 * from a background-friendly context where RLS is not required.
 *
 * @param userId - The professor's user ID.
 * @returns The `Semester` domain object with `status = 'active'`, or `null`.
 * @throws  If the query fails (not a "not found" case — that returns `null`).
 *
 * Called by: app/api/process/route.ts (POST — auto-assign new sessions)
 *            archiveAndCreateSemester() (internal — check before archiving)
 * Table: semesters
 * Client: createAdminClient() — bypasses RLS
 */
/**
 * Fetches the single `active` semester for a professor, or `null` if none exists.
 *
 * Used at session upload time (`/api/process`) to auto-assign the new session to
 * whichever semester is currently active. Uses admin client because this is called
 * from a background-friendly context where RLS is not required.
 *
 * @param userId - The professor's user ID.
 * @returns The `Semester` domain object with `status = 'active'`, or `null`.
 * @throws  If the query fails (not a "not found" case — that returns `null`).
 *
 * Called by: app/api/process/route.ts (POST — auto-assign new sessions)
 *             archiveAndCreateSemester() (internal — check before archiving)
 * Table: semesters
 * Client: createAdminClient() — bypasses RLS
 */
export async function getActiveSemester(userId: string): Promise<Semester | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('semesters')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch active semester: ${error.message}`)
  return data ? rowToSemester(data as SemesterRow) : null
}

/**
 * Fetches a single semester by its UUID (RLS-enforced — professors can only
 * read their own semesters).
 *
 * Returns `null` on error (e.g., not found, RLS denial) rather than throwing,
 * so callers can treat a missing semester as a graceful 404.
 *
 * @param id - The UUID of the semester.
 * @returns The `Semester` domain object, or `null` if not found / not accessible.
 *
 * Called by: app/api/semesters/[id]/route.ts (GET, PATCH)
 * Table: semesters
 * Client: createClient() — RLS enforced
 */
/**
 * Fetches a single semester by its UUID (RLS-enforced — professors can only
 * read their own semesters).
 *
 * Returns `null` on error (e.g., not found, RLS denial) rather than throwing,
 * so callers can treat a missing semester as a graceful 404.
 *
 * @param id - The UUID of the semester.
 * @returns The `Semester` domain object, or `null` if not found / not accessible.
 *
 * Called by: app/api/semesters/[id]/route.ts (GET, PATCH)
 * Table: semesters
 * Client: createClient() — RLS enforced
 */
export async function getSemesterById(id: string): Promise<Semester | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('semesters')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return rowToSemester(data as SemesterRow)
}

/**
 * Inserts a new semester record with `status = 'active'`.
 *
 * Does NOT enforce the one-active-semester invariant by itself — callers that need
 * to transition semesters should use `archiveAndCreateSemester()` instead.
 *
 * @param input - Name, optional start/end dates, and the professor's userId.
 * @returns The newly created `Semester` domain object.
 * @throws  If the insert fails (e.g., DB constraint violation).
 *
 * Called by: app/api/semesters/route.ts (POST)
 *            archiveAndCreateSemester() (internal — after archiving the current active)
 * Table: semesters
 * Client: createAdminClient() — bypasses RLS
 */
/**
 * Inserts a new semester record with `status = 'active'`.
 *
 * Does NOT enforce the one-active-semester invariant by itself — callers that need
 * to transition semesters should use `archiveAndCreateSemester()` instead.
 *
 * @param input - Name, optional start/end dates, and the professor's userId.
 * @returns The newly created `Semester` domain object.
 * @throws  If the insert fails (e.g., DB constraint violation).
 *
 * Called by: app/api/semesters/route.ts (POST)
 *             archiveAndCreateSemester() (internal — after archiving the current active)
 * Table: semesters
 * Client: createAdminClient() — bypasses RLS
 */
export async function insertSemester(input: CreateSemesterInput): Promise<Semester> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('semesters')
    .insert({
      user_id: input.userId,
      name: input.name,
      start_date: input.startDate,
      end_date: input.endDate,
      // New semesters always start as active
      status: 'active',
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create semester: ${error.message}`)
  return rowToSemester(data as SemesterRow)
}

/**
 * Applies a partial update to an existing semester (name, dates, or status).
 *
 * Only fields present on `input` are included in the UPDATE payload — undefined fields
 * are skipped rather than set to null. This allows the caller to patch a single field
 * without having to re-supply all other fields.
 *
 * @param id    - The UUID of the semester to update.
 * @param input - Partial fields to update (`name`, `startDate`, `endDate`, `status`).
 * @returns The full updated `Semester` domain object.
 * @throws  If the update fails.
 *
 * Called by: app/api/semesters/[id]/route.ts (PATCH)
 * Table: semesters
 * Client: createAdminClient() — bypasses RLS
 */
/**
 * Applies a partial update to an existing semester (name, dates, or status).
 *
 * Only fields present on `input` are included in the UPDATE payload — undefined fields
 * are skipped rather than set to null. This allows the caller to patch a single field
 * without having to re-supply all other fields.
 *
 * @param id    - The UUID of the semester to update.
 * @param input - Partial fields to update (`name`, `startDate`, `endDate`, `status`).
 * @returns The full updated `Semester` domain object.
 * @throws  If the update fails.
 *
 * Called by: app/api/semesters/[id]/route.ts (PATCH)
 * Table: semesters
 * Client: createAdminClient() — bypasses RLS
 */
export async function updateSemester(id: string, input: UpdateSemesterInput): Promise<Semester> {
  const supabase = createAdminClient()

  // Build a sparse update payload — only include fields that were provided
  const updates: Record<string, unknown> = {}
  if (input.name !== undefined) updates.name = input.name
  if (input.startDate !== undefined) updates.start_date = input.startDate
  if (input.endDate !== undefined) updates.end_date = input.endDate
  if (input.status !== undefined) updates.status = input.status

  const { data, error } = await supabase
    .from('semesters')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(`Failed to update semester: ${error.message}`)
  return rowToSemester(data as SemesterRow)
}

/**
 * Atomically archives the current active semester (if one exists) and creates a new one.
 *
 * Enforces the invariant that only one semester is `active` at a time:
 *   1. Look up the current active semester.
 *   2. If found, set its `status` to `'archived'`.
 *   3. Insert the new semester with `status = 'active'`.
 *
 * Not wrapped in an explicit DB transaction — if step 3 fails after step 2 succeeds
 * the professor will temporarily have no active semester, which is recoverable.
 *
 * @param userId      - The professor's user ID.
 * @param newSemester - Configuration for the new semester to create.
 * @returns The newly created `Semester` domain object.
 * @throws  If archiving the current semester or inserting the new one fails.
 *
 * Called by: app/api/semesters/route.ts (POST — "start new semester" action)
 * Tables: semesters
 * Client: createAdminClient() — bypasses RLS (both archive and insert steps)
 */
/**
 * Atomically archives the current active semester (if one exists) and creates a new one.
 *
 * Enforces the invariant that only one semester is `active` at a time:
 *   1. Look up the current active semester.
 *   2. If found, set its `status` to `'archived'`.
 *   3. Insert the new semester with `status = 'active'`.
 *
 * Not wrapped in an explicit DB transaction — if step 3 fails after step 2 succeeds
 * the professor will temporarily have no active semester, which is recoverable.
 *
 * @param userId      - The professor's user ID.
 * @param newSemester - Configuration for the new semester to create.
 * @returns The newly created `Semester` domain object.
 * @throws  If archiving the current semester or inserting the new one fails.
 *
 * Called by: app/api/semesters/route.ts (POST — "start new semester" action)
 * Tables: semesters
 * Client: createAdminClient() — bypasses RLS (both archive and insert steps)
 */
export async function archiveAndCreateSemester(
  userId: string,
  newSemester: CreateSemesterInput
): Promise<Semester> {
  const supabase = createAdminClient()

  // Step 1: archive current active semester if one exists
  const active = await getActiveSemester(userId)
  if (active) {
    const { error: archiveErr } = await supabase
      .from('semesters')
      .update({ status: 'archived' })
      .eq('id', active.id)
    if (archiveErr) throw new Error(`Failed to archive semester: ${archiveErr.message}`)
  }

  // Step 2: create the new active semester
  return insertSemester(newSemester)
}

/**
 * Bulk-assigns an array of sessions to a semester by updating `sessions.semester_id`.
 *
 * Used on the `/semesters` page to let professors manually assign sessions that were
 * uploaded before an active semester existed (i.e., where `semester_id IS NULL`).
 *
 * Silently returns on empty input to avoid sending an empty `IN()` clause to Postgres.
 *
 * @param sessionIds - Array of session UUIDs to reassign.
 * @param semesterId - The target semester UUID.
 * @throws  If the update fails.
 *
 * Called by: app/api/semesters/assign/route.ts (POST)
 * Table: sessions (updates `semester_id`)
 * Client: createAdminClient() — bypasses RLS
 * Note: this is the one permitted UPDATE on the sessions table (semester assignment only).
 *       Sessions remain otherwise immutable — output/content is never changed.
 */
/**
 * Bulk-assigns an array of sessions to a semester by updating `sessions.semester_id`.
 *
 * Used on the `/semesters` page to let professors manually assign sessions that were
 * uploaded before an active semester existed (i.e., where `semester_id IS NULL`).
 *
 * Silently returns on empty input to avoid sending an empty `IN()` clause to Postgres.
 *
 * @param sessionIds - Array of session UUIDs to reassign.
 * @param semesterId - The target semester UUID.
 * @throws  If the update fails.
 *
 * Called by: app/api/semesters/assign/route.ts (POST)
 * Table: sessions (updates `semester_id`)
 * Client: createAdminClient() — bypasses RLS
 * Note: this is the one permitted UPDATE on the sessions table (semester assignment only).
 *        Sessions remain otherwise immutable — output/content is never changed.
 */
export async function assignSessionsToSemester(
  sessionIds: string[],
  semesterId: string
): Promise<void> {
  if (sessionIds.length === 0) return
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('sessions')
    .update({ semester_id: semesterId })
    .in('id', sessionIds)
  if (error) throw new Error(`Failed to assign sessions: ${error.message}`)
}

/**
 * Fetches all sessions belonging to a professor that have not yet been assigned
 * to any semester (`semester_id IS NULL`).
 *
 * Used by the `/semesters` page to populate the "unassigned sessions" picker.
 *
 * @param userId - The professor's user ID.
 * @returns Array of `SessionSummary` objects sorted newest-first.
 * @throws  If the query fails.
 *
 * Called by: app/api/semesters/route.ts (GET — unassigned sessions list)
 * Table: sessions
 * Client: createAdminClient() — bypasses RLS
 */
/**
 * Fetches all sessions belonging to a professor that have not yet been assigned
 * to any semester (`semester_id IS NULL`).
 *
 * Used by the `/semesters` page to populate the "unassigned sessions" picker.
 *
 * @param userId - The professor's user ID.
 * @returns Array of `SessionSummary` objects sorted newest-first.
 * @throws  If the query fails.
 *
 * Called by: app/api/semesters/route.ts (GET — unassigned sessions list)
 * Table: sessions
 * Client: createAdminClient() — bypasses RLS
 */
export async function getUnassignedSessions(userId: string): Promise<SessionSummary[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('sessions')
    .select('id, speaker_name, created_at, file_count, semester_id')
    .eq('user_id', userId)
    // Only rows where semester_id is NULL (unassigned)
    .is('semester_id', null)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to fetch unassigned sessions: ${error.message}`)
  return (data as SessionRow[]).map(rowToSessionSummary)
}
