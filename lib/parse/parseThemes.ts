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
