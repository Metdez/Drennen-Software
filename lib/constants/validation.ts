/**
 * File upload validation constants.
 *
 * Used by the upload form component to restrict which files are accepted via the
 * HTML `accept` attribute, and by server-side parsing utilities to validate that
 * entries inside the uploaded ZIP are supported file types before attempting to parse them.
 *
 * Do NOT import from this file directly. Import from the `@/lib/constants` barrel instead.
 */

/**
 * File extensions accepted inside a student submission ZIP.
 * `.pdf`, `.docx`, and `.html`/`.htm` (Canvas text-entry submissions) are
 * parseable by the submission pipeline.
 */
/**
 * What it does:
 *   Defines a constant array of file extensions that are accepted for individual document uploads within the system.
 * Why it is used:
 *   This constant is used to enforce validation rules for file uploads, ensuring that users can only submit files with the specified extensions. It helps maintain data integrity and compatibility within the application.
 * Important implementation details:
 *   The `as const` assertion ensures that the array is treated as a read-only tuple, providing strong type safety and preventing modification at runtime. This allows TypeScript to infer a precise type, e.g., `['.pdf', '.docx']` instead of `string[]`.
 */
export const ACCEPTED_FILE_TYPES = ['.pdf', '.docx', '.html', '.htm'] as const

/**
 * MIME type expected for the top-level upload from the professor.
 * The entire submission set must be wrapped in a single ZIP file.
 */
/**
 * What it does:
 *   Defines the expected MIME (Multipurpose Internet Mail Extensions) type for the main submission file, which is specifically a ZIP archive.
 * Why it is used:
 *   This constant is crucial for validating the top-level file upload from a professor or user, ensuring that the entire set of submitted documents is packaged within a single, valid ZIP file. This standardization simplifies processing and ensures proper handling of multi-file submissions.
 * Important implementation details:
 *   The `as const` assertion ensures that this string literal is treated as a read-only constant, enhancing type safety and preventing accidental modification. It specifically represents the standard MIME type for ZIP archives, 'application/zip'.
 */
export const ACCEPTED_ZIP_MIME = 'application/zip' as const
