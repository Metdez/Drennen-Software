/**
 * Server-side Supabase Storage helpers for the temporary ZIP upload lifecycle.
 *
 * These functions are called from the `/api/process` route handler after the browser
 * uploads a ZIP via `storage.ts`. The admin client is used because the processing
 * route runs in a background context where the user's session cookie is not available.
 *
 * Flow: browser uploads → `uploadTempZip()` → server calls `downloadTempZip()` to
 * retrieve bytes for parsing → server calls `deleteTempZip()` to clean up regardless
 * of whether AI processing succeeded or failed.
 */
import { createAdminClient } from '@/lib/supabase/server'

/** Supabase Storage bucket used for temporary ZIP uploads during session processing. */
/**
 * Supabase Storage bucket used for temporary ZIP uploads during session processing.
 * What it does: This variable defines the name of the Supabase Storage bucket designated for storing temporary ZIP files.
 * Why it is used: It provides a consistent and centralized reference for the bucket name across the codebase, ensuring all storage operations target the correct location and improving maintainability.
 * Important implementation details: It is a constant string with the value 'temp-uploads'.
 */
const BUCKET = 'temp-uploads'

/**
 * Downloads a temporary ZIP file from Supabase Storage and returns its raw bytes.
 *
 * Uses the admin client (service role) because this runs server-side in a route
 * handler where no user session cookie is available. The file is converted to a
 * `Buffer` so it can be passed directly to the ZIP parsing utilities.
 *
 * @param storagePath - The storage path returned by `uploadTempZip()` (e.g. `"userId/ts-file.zip"`).
 * @returns A `Buffer` containing the raw ZIP bytes.
 * @throws If the download fails or the storage path does not exist.
 */
/**
 * Downloads a temporary ZIP file from Supabase Storage and returns its raw bytes.
 * What it does: This function fetches a specific ZIP file from the configured `temp-uploads` Supabase Storage bucket and returns its content as a Node.js Buffer.
 * Why it is used: It is essential for retrieving the raw ZIP data after an upload, allowing server-side processes (like data parsing or transformation) to access and work with the file's contents before further processing.
 * Important implementation details: It utilizes `createAdminClient()` to ensure operations are performed with service role privileges, which is necessary in server-side contexts where no authenticated user session is available. The downloaded `Blob` is converted to a Node.js `Buffer` for compatibility with subsequent ZIP parsing utilities. An `Error` is thrown if the download fails (e.g., file not found, permission issues) to signal critical issues upstream.
 */
export async function downloadTempZip(storagePath: string): Promise<Buffer> {
  const admin = createAdminClient()
  const { data, error } = await admin.storage.from(BUCKET).download(storagePath)
  if (error || !data) throw new Error(`Storage download failed: ${error?.message}`)
  // Convert the Blob returned by the Supabase SDK into a Node.js Buffer
  return Buffer.from(await data.arrayBuffer())
}

/**
 * Deletes a temporary ZIP file from Supabase Storage.
 *
 * Called after processing is complete (success or failure) to avoid accumulating
 * stale files in the `temp-uploads` bucket. Errors from the delete are intentionally
 * swallowed — a leaked temp file is not fatal and should not fail the overall request.
 *
 * @param storagePath - The storage path returned by `uploadTempZip()`.
 */
/**
 * Deletes a temporary ZIP file from Supabase Storage.
 * What it does: This function removes a specified temporary ZIP file from the `temp-uploads` Supabase Storage bucket.
 * Why it is used: It serves as a crucial cleanup mechanism, executed after processing is complete (whether successful or failed), preventing the accumulation of stale files in storage, which helps manage storage costs and maintain data hygiene.
 * Important implementation details: Similar to `downloadTempZip`, it uses `createAdminClient()` for service role access. Errors encountered during the deletion process are intentionally suppressed (swallowed). This design choice prioritizes the main application flow; a failure to delete a temporary file is considered non-fatal and should not cause the overall request or processing pipeline to fail. The Supabase `remove()` method expects an array of paths.
 */
export async function deleteTempZip(storagePath: string): Promise<void> {
  const admin = createAdminClient()
  // Supabase remove() takes an array of paths; errors are ignored here by design
  await admin.storage.from(BUCKET).remove([storagePath])
}
