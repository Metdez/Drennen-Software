/**
 * @file pdf.ts
 * Extracts plain text from a PDF file buffer using the `pdf-parse` library.
 *
 * Called by: lib/parse/builder.ts (via buildSubmissionsText)
 *
 * Error handling: any parse failure (corrupt file, encrypted PDF, unsupported
 * encoding) is caught and returns an empty string. The caller (builder.ts)
 * filters out empty results so the rest of the ZIP batch continues unaffected.
 */

import pdfParse from 'pdf-parse'

/**
 * Parses a PDF buffer and returns its full text content.
 *
 * Returns an empty string on any error — never throws. This ensures a single
 * unreadable submission does not abort the entire class batch.
 */
/**
 * Parses a PDF buffer and extracts its full text content.
 *
 * This function is used to convert binary PDF data into a readable string format, which can then be processed further (e.g., for search indexing, content analysis, or display).
 *
 * It utilizes the `pdf-parse` library to perform the actual parsing. A critical design choice is its robust error handling: any parsing failure results in an empty string being returned, rather than throwing an exception. This prevents a single malformed or unreadable PDF file from crashing larger batch processing operations, ensuring system stability and continuity. The extracted text is also trimmed of leading/trailing whitespace before being returned.
 */
export async function parsePdf(buffer: Buffer): Promise<string> {
  try {
    const result = await pdfParse(buffer)
    return result.text.trim()
  } catch {
    return '' // If a file fails to parse, return empty — don't crash the whole batch
  }
}
