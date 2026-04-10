/**
 * Browser-side Supabase Storage helpers for temporary ZIP uploads.
 *
 * The `temp-uploads` bucket holds professor-uploaded Canvas ZIP files only for the
 * duration of AI processing. The server-side counterpart (`storage.server.ts`) handles
 * downloading and deleting these files after processing completes.
 *
 * Path convention: `{userId}/{timestamp}-{originalFileName}` — namespaced by user so
 * RLS bucket policies can restrict each professor to their own prefix.
 */
import { createClient } from '@/lib/supabase/client'

/** Supabase Storage bucket used for temporary ZIP uploads during session processing. */
/**
 * Supabase Storage bucket used for temporary ZIP uploads during session processing.
 *
 * What it does: It defines the constant string name for the Supabase Storage bucket.
 * Why it is used: To provide a consistent and easy-to-reference name for the specific bucket where temporary ZIP files are stored.
 * Important implementation details: The bucket is named 'temp-uploads' and is intended for ephemeral storage of files that will be processed and then deleted.
 */
const BUCKET = 'temp-uploads'

/**
 * Uploads a professor's Canvas ZIP file to Supabase Storage from the browser.
 *
 * The returned storage path is passed to the `/api/process` route so the server
 * can download, parse, and then delete the file without the browser needing to
 * re-upload it.
 *
 * @param userId - The authenticated professor's user ID (used as the path prefix).
 * @param file - The ZIP `File` object selected by the professor in the upload form.
 * @returns The storage path (e.g. `"abc123/1712345678-submissions.zip"`) of the uploaded file.
 * @throws If the Supabase Storage upload fails for any reason.
 */
/**
 * Uploads a professor's Canvas ZIP file to Supabase Storage directly from the browser.
 *
 * What it does: Takes a user ID and a File object (representing a ZIP file) and uploads it to the configured Supabase Storage bucket.
 * Why it is used: This function is crucial for temporarily storing large ZIP files on Supabase, allowing a server-side process (e.g., an API route) to later download, parse, and process the file without the client needing to re-upload it. This improves efficiency and reduces client-side resource usage.
 * Important implementation details:
 * - It initializes a Supabase client using `createClient()` configured for browser-side operations.
 * - The storage path for each file is constructed with the `userId` as a prefix, followed by a timestamp and the original filename (`${userId}/${Date.now()}-${file.name}`). This is vital for implementing Row-Level Security (RLS) policies to restrict access to files on a per-professor basis.
 * - The `contentType` is explicitly set to `'application/zip'` during the upload.
 * - The `upsert` option is set to `false` to prevent accidental overwrites of existing files; if a path collision occurs, it will result in an error.
 * - The function throws an `Error` if the Supabase Storage upload operation fails for any reason.
 * - It returns the full storage path within the bucket (e.g., `"abc123/1712345678-submissions.zip"`), which is then passed to server-side routes for further processing.
 */
export async function uploadTempZip(userId: string, file: File): Promise<string> {
  const supabase = createClient()
  // Prefix with userId so RLS policies can restrict access per professor
  const path = `${userId}/${Date.now()}-${file.name}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: 'application/zip',
    // Never overwrite — if a collision somehow occurs, surface it as an error
    upsert: false,
  })
  if (error) throw new Error(`Storage upload failed: ${error.message}`)
  return path
}
