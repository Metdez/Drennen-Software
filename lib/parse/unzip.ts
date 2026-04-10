/**
 * @file unzip.ts
 * Extracts PDF, DOCX, and HTML files from a Canvas export ZIP buffer.
 *
 * Called by: lib/parse/builder.ts (via extractZip)
 *
 * Canvas ZIPs frequently include __MACOSX metadata directories and non-submission
 * files (e.g., .txt manifests). This module filters those out so downstream
 * parsers only receive supported file types. HTML (.html/.htm) is included
 * because Canvas exports text-entry submissions as Chrome HTML Documents.
 */

import unzipper from 'unzipper'

/** Represents a single extractable file entry from a Canvas ZIP archive. */
/**
 * Represents a single extractable file entry from a Canvas ZIP archive.
 *
 * filename: Original path as stored inside the ZIP (includes subdirectory prefix if any).
 * buffer: Raw file bytes — passed directly to parsePdf, parseDocx, or parseHtml.
 * extension: Lowercase file extension: "pdf", "docx", "html", or "htm".
 *
 * What it does: This interface defines the structure for a file that has been extracted from a ZIP archive and is deemed relevant for further processing.
 * Why it is used: It provides a standardized and convenient way to encapsulate the essential details (filename, content, type) of a parsed file, making it easy to pass around between different parsing stages (e.g., from unzipping to PDF/DOCX parsing).
 * Important implementation details: The `buffer` field holds the entire file content, allowing subsequent parsing functions to work with the raw binary data. The `extension` field is crucial for dispatching the buffer to the correct file parser.
 */
export interface ZipEntry {
  /** Original path as stored inside the ZIP (includes subdirectory prefix if any). */
  filename: string
  /** Raw file bytes — passed directly to parsePdf, parseDocx, or parseHtml. */
  buffer: Buffer
  /** Lowercase file extension: "pdf", "docx", "html", or "htm". */
  extension: string
}

/**
 * Opens a ZIP buffer in memory and extracts all valid submission files.
 *
 * Filtering rules applied in order:
 *   1. Skip `__MACOSX/` entries — macOS resource fork junk added when zipping on a Mac.
 *   2. Skip directory entries (paths ending with `/`).
 *   3. Skip any file whose extension is not "pdf", "docx", "html", or "htm".
 *
 * Returns an array of ZipEntry objects ready for parsing by lib/parse/pdf.ts
 * or lib/parse/docx.ts.
 */
/**
 * Opens a ZIP buffer in memory and extracts all valid submission files.
 *
 * Filtering rules applied in order:
 *   1. Skip `__MACOSX/` entries — macOS resource fork junk added when zipping on a Mac.
 *   2. Skip directory entries (paths ending with `/`).
 *   3. Skip any file whose extension is not "pdf", "docx", "html", or "htm".
 *
 * Returns an array of ZipEntry objects ready for parsing by lib/parse/pdf.ts or lib/parse/docx.ts.
 *
 * What it does: This asynchronous function takes a binary buffer representing a ZIP archive, unzips it in memory, and then filters its contents to extract only relevant submission files (PDF and DOCX) while ignoring extraneous files like macOS metadata or directories.
 * Why it is used: It serves as the initial processing step for handling Canvas submission ZIP archives, ensuring that only valid and parsable document files are forwarded to the next stage of the pipeline (document parsing).
 * Important implementation details: It leverages the `unzipper` library for efficient in-memory ZIP extraction. The filtering logic is critical for robustness, specifically designed to handle common ZIP archive artifacts (like `__MACOSX` folders) and to only process specified file types. The function returns a Promise resolving to an array of `ZipEntry` objects, each containing the file's path, its raw binary content, and its lowercase extension.
 */
export async function extractZip(zipBuffer: Buffer): Promise<ZipEntry[]> {
  const directory = await unzipper.Open.buffer(zipBuffer)

  const entries: ZipEntry[] = []

  for (const file of directory.files) {
    // Skip Mac junk files and directories
    if (file.path.startsWith('__MACOSX') || file.path.endsWith('/')) continue

    const ext = file.path.split('.').pop()?.toLowerCase() ?? ''
    if (!['pdf', 'docx', 'html', 'htm'].includes(ext)) continue

    const buffer = await file.buffer()
    entries.push({
      filename: file.path,
      buffer,
      extension: ext,
    })
  }

  return entries
}
