/**
 * @file parseThemes.ts
 * Extracts theme titles from the AI output and computes cross-session theme overlap.
 *
 * Called by:
 *   - app/api/process/route.ts      — saves themes to session_themes table after generation
 *   - app/api/sessions/[id]/route.ts — computes overlapping themes for the preview page
 *   - components/session/OutputPreview.tsx — displays overlap badges in the questions tab
 *
 * The xAI model reliably produces section headers in `***N. Theme Title***` format.
 * parseThemesFromOutput() uses a global regex to extract them in O(n) over the output string.
 *
 * themesOverlap() is used client-side on the /preview page to badge themes that recurred
 * from previous sessions. It intentionally uses a looser overlap algorithm than strict
 * Jaccard similarity because theme titles are short (3–6 tokens) and paraphrase frequently.
 */

/** A single numbered theme extracted from the AI-generated interview sheet output. */
export interface ParsedTheme {
  themeNumber: number
  themeTitle: string
}

/**
 * Extracts all numbered theme titles from the AI markdown output using a global regex.
 *
 * Matches lines like: `***1. Leadership Under Pressure***`
 *
 * Returns themes in the order they appear in the output (1–10 for a standard session).
 * Used to populate the `session_themes` table after a session is saved.
 */
export function parseThemesFromOutput(output: string): ParsedTheme[] {
  const themes: ParsedTheme[] = []
  const regex = /\*{3}(\d+)\.\s+(.+?)\*{3}/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(output)) !== null) {
    themes.push({
      themeNumber: parseInt(match[1], 10),
      themeTitle: match[2].trim(),
    })
  }

  return themes
}

/**
 * Returns true if two theme titles share enough meaningful tokens to be considered
 * the same underlying topic across different sessions.
 *
 * Algorithm: shared-token containment rather than Jaccard.
 *   - Two titles overlap if they share ≥2 meaningful tokens (length > 2 chars), OR
 *   - One title's full token set is a subset of the other's.
 *
 * This is more permissive than Jaccard for short phrases like "Leadership & Ethics"
 * vs "Ethical Leadership" — both would share ["leadership", "eth..."] and overlap.
 *
 * Stopwords are implicitly filtered by the `t.length > 2` guard (removes "a", "of", "in", etc.).
 *
 * Used by: app/api/sessions/[id]/route.ts to compute the overlap JSON cached in
 * sessionStorage under the key `overlap_${sessionId}`.
 */
export function themesOverlap(a: string, b: string): boolean {
  const tokenize = (s: string): string[] =>
    s.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(t => t.length > 2)

  const ta = tokenize(a)
  const tb = new Set(tokenize(b))
  const shared = ta.filter(t => tb.has(t))

  // Condition 1: at least 2 tokens in common
  if (shared.length >= 2) return true

  // Condition 2: one title's token set is a complete subset of the other's
  const setA = new Set(ta)
  return [...setA].every(t => tb.has(t)) || [...tb].every(t => setA.has(t))
}
