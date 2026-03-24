export interface ParsedTheme {
  themeNumber: number
  themeTitle: string
}

/**
 * Extracts numbered theme titles from the AI-generated markdown output.
 * Matches lines like: ***1. Leadership Under Pressure***
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
 * Returns true if two theme titles meaningfully overlap.
 * Uses shared-token containment: overlap if ≥2 meaningful tokens (length > 2)
 * are shared, or if one title's token set is a subset of the other's.
 * More reliable than Jaccard for short 3-6 token theme phrases.
 */
export function themesOverlap(a: string, b: string): boolean {
  const tokenize = (s: string): string[] =>
    s.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(t => t.length > 2)

  const ta = tokenize(a)
  const tb = new Set(tokenize(b))
  const shared = ta.filter(t => tb.has(t))

  if (shared.length >= 2) return true

  const setA = new Set(ta)
  return [...setA].every(t => tb.has(t)) || [...tb].every(t => setA.has(t))
}
