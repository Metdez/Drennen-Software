/**
 * Display formatting utilities for the UI layer.
 *
 * These are pure functions with no side effects — safe to call in both Server and
 * Client Components. Import them wherever you need to format data for display rather
 * than implementing ad-hoc formatting inline.
 */

/**
 * Title-cases a student name for display.
 *
 * Student names are derived from Canvas submission filenames (`FirstName_LastName...`)
 * and stored in the format `"firstname L."`. This function normalises them to
 * `"Firstname L."` for consistent display across the UI.
 *
 * @param name - The raw stored name (may be lowercase or mixed-case).
 * @returns The title-cased display name.
 *
 * @example
 * formatStudentName("cuttingvictor L.") // → "Cuttingvictor L."
 */
/**
 * 1. What it does: This function takes a string representing a student's name and title-cases each word within it.
 * 2. Why it is used: It is used to standardize the display of student names across the application, ensuring consistent capitalization (e.g., converting "cuttingvictor L." to "Cuttingvictor L."). This improves readability and provides a better user experience.
 * 3. Important implementation details: The function splits the input name string by spaces, iterates over each word, capitalizes the first character of the word, converts the rest of the word to lowercase, and then rejoins the processed words with spaces.
 */
export function formatStudentName(name: string): string {
  // Title-case each word so stored names like "cuttingvictor L." display as "Cuttingvictor L."
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Formats an ISO 8601 date string into a human-readable US locale date.
 *
 * @param isoString - An ISO date string (e.g. from a Supabase `created_at` column).
 * @returns A formatted string like `"April 4, 2026"`.
 *
 * @example
 * formatDate("2026-04-04T12:00:00Z") // → "April 4, 2026"
 */
/**
 * 1. What it does: This function formats an ISO 8601 date string (e.g., from a Supabase `created_at` column) into a human-readable string using the US locale. It returns a formatted string like "April 4, 2026".
 * 2. Why it is used: It is used to present technical date/time stamps from databases in a user-friendly format, making them easily understandable and accessible to end-users.
 * 3. Important implementation details: It parses the `isoString` into a JavaScript `Date` object and then uses `toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })` to achieve the desired US-centric long date format.
 */
export function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Returns a pluralised file-count string for display.
 *
 * @param count - The number of files in a session.
 * @returns `"1 file"` or `"N files"`.
 *
 * @example
 * formatFileCount(1)  // → "1 file"
 * formatFileCount(23) // → "23 files"
 */
/**
 * 1. What it does: This function returns a pluralized file-count string suitable for display, taking an integer `count` as input. It generates strings like "1 file" or "N files".
 * 2. Why it is used: It is used to provide grammatically correct and natural-sounding file count displays in the user interface, improving clarity and user experience.
 * 3. Important implementation details: It uses a simple ternary operator to determine whether to append "file" (if `count` is 1) or "files" (for any other `count`) to the numerical value.
 */
export function formatFileCount(count: number): string {
  return `${count} ${count === 1 ? 'file' : 'files'}`
}

/**
 * Converts a speaker's display name into a URL/filename-safe slug.
 *
 * Spaces are replaced with underscores and all non-alphanumeric characters (except `_`)
 * are stripped. Used to construct filenames for PDF/DOCX exports.
 *
 * @param name - The speaker's display name (e.g. `"Jane O'Brien"`).
 * @returns A slug safe for use in filenames and URLs (e.g. `"Jane_OBrien"`).
 *
 * @example
 * slugifySpeakerName("Jane O'Brien") // → "Jane_OBrien"
 * slugifySpeakerName("  Bob Smith  ") // → "Bob_Smith"
 */
/**
 * 1. What it does: This function converts a speaker's display name (e.g., "Jane O'Brien") into a URL/filename-safe slug. It replaces spaces with underscores and strips out all non-alphanumeric characters except underscores. It returns a string safe for use in filenames and URLs (e.g., "Jane_OBrien").
 * 2. Why it is used: It is primarily used to construct filenames for exported documents (like PDF/DOCX files) or for generating URL-friendly identifiers, preventing issues with special characters in file paths or web addresses.
 * 3. Important implementation details: The function first `trim()`s any leading or trailing whitespace. It then replaces one or more consecutive spaces (`/\s+/g`) with a single underscore. Finally, it removes any characters that are not a letter, number, or underscore (`/[^a-zA-Z0-9_]/g`) to ensure the resulting slug is completely sanitized.
 */
export function slugifySpeakerName(name: string): string {
  return name.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
}
