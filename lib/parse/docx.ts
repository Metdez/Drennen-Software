/**
 * @file docx.ts
 * Extracts plain text from a DOCX file buffer using the `mammoth` library.
 *
 * Called by: lib/parse/builder.ts (via buildSubmissionsText)
 *
 * Uses mammoth's `extractRawText` mode (not HTML conversion) so the output is
 * clean prose without any formatting markup — matching what pdf.ts produces.
 *
 * Error handling: any parse failure is caught and returns an empty string.
 * The caller (builder.ts) filters out empty results so the rest of the ZIP
 * batch continues unaffected.
 */

import mammoth from 'mammoth'

/**
 * Parses a DOCX buffer and returns its raw text content.
 *
 * Returns an empty string on any error — never throws. This ensures a single
 * unreadable submission does not abort the entire class batch.
 */
export async function parseDocx(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer })
    return result.value.trim()
  } catch {
    return '' // If a file fails to parse, return empty — don't crash the whole batch
  }
}
