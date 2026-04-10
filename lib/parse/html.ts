/**
 * @file html.ts
 * Extracts plain text from an HTML buffer (e.g., Canvas text-entry submissions
 * that are bulk-downloaded as "Chrome HTML Document" .html files).
 *
 * Called by: lib/parse/builder.ts (for entries whose extension is 'html' or 'htm')
 *
 * Contract matches parsePdf/parseDocx: never throws, returns '' on failure.
 * builder.ts filters out empty results, so a malformed HTML file in a large
 * class ZIP will not abort the batch.
 */

import { parse } from 'node-html-parser'

/**
 * Extracts plain text from an HTML buffer, stripping script/style/noscript
 * nodes and collapsing whitespace. Returns an empty string on any failure.
 */
export async function parseHtml(buffer: Buffer): Promise<string> {
  try {
    const root = parse(buffer.toString('utf-8'))
    root.querySelectorAll('script, style, noscript').forEach((n) => n.remove())
    const text = root.text ?? ''
    return text.replace(/\s+/g, ' ').trim()
  } catch {
    return ''
  }
}
