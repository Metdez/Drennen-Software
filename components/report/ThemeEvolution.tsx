/**
 * ThemeEvolution — Session-by-session theme timeline and dominant themes table.
 *
 * Renders a chronological timeline of sessions with their theme pills, where each
 * theme gets a deterministically-assigned colour from THEME_COLORS (via a simple
 * string hash). A dominant themes table shows total count, first seen, and last seen.
 *
 * Rendered by: app/(app)/reports/[id]/page.tsx (theme evolution section)
 * Data source: ThemeEvolutionSection from SemesterReport type
 */
'use client'

import type { ThemeEvolutionSection } from '@/types'

/**
 * Props for ThemeEvolution.
 * @prop data - Theme evolution section with narrative, timeline, and dominantThemes.
 */
/**
 * What it does: Defines the shape of the props object for the ThemeEvolution component.
 * Why it is used: To ensure type safety and clear expectations for the data passed into the component, making the component's API explicit and easier to use correctly.
 * Important implementation details: It expects a single property, `data`, which must conform to the `ThemeEvolutionSection` type, providing all the necessary information for the component to render the theme evolution report.
 */
interface Props {
  data: ThemeEvolutionSection
}

/**
 * Palette of four colour sets cycled via a string hash.
 * Ensures each theme title consistently maps to the same colour regardless of render order.
 */
/**
 * What it does: An array of color objects, each containing specific `bg` (background), `border`, and `text` color values.
 * Why it is used: To provide a predefined and limited set of colors for styling theme tags in a consistent and visually appealing manner across the application. This array is designed to be cycled through using a deterministic hash function to ensure each unique theme title consistently maps to the same color.
 * Important implementation details: Each color object uses `rgba` for background and border values to allow for transparency and layering effects, while `text` uses a hex code for solid readability. The chosen colors are distinct yet harmonious, suitable for tag-like elements.
 */
const THEME_COLORS = [
  { bg: 'rgba(255,107,0,0.15)', border: 'rgba(255,107,0,0.4)', text: '#fb923c' },
  { bg: 'rgba(130,80,255,0.15)', border: 'rgba(130,80,255,0.4)', text: '#c084fc' },
  { bg: 'rgba(34,197,94,0.15)', border: 'rgba(34,197,94,0.4)', text: '#4ade80' },
  { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.35)', text: '#60a5fa' },
]

/**
 * Deterministic integer hash of a string, used to assign a consistent colour
 * index from THEME_COLORS to each theme title.
 */
/**
 * What it does: A pure utility function that computes a deterministic integer hash from an input string.
 * Why it is used: To consistently map a theme title string to a specific index within the `THEME_COLORS` array. This ensures that a given theme always receives the same visual color styling across different render cycles or parts of the report, enhancing user experience through visual consistency.
 * Important implementation details: It employs a simple bitwise shift and XOR operation (`hash = ((hash << 5) - hash) + s.charCodeAt(i)`) to generate the hash. The `hash |= 0` operation ensures the result is a 32-bit integer. The absolute value of the final hash modulo `THEME_COLORS.length` is used to derive a valid, positive array index for color selection.
 */
function hashString(s: string): number {
  let hash = 0
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash) + s.charCodeAt(i)
    hash |= 0
  }
  return hash
}

/**
 * What it does: A React functional component that renders a comprehensive report on the evolution of themes. It displays a narrative summary, a chronological timeline of themes extracted from individual sessions, and a summary table of dominant themes.
 * Why it is used: To provide users with a visual and structured overview of how various themes have emerged, developed, and their prevalence over a series of recorded sessions. This helps in understanding longitudinal trends and key discussion points.
 * Important implementation details: It is a client-side component ('use client'). It accepts `ThemeEvolutionSection` data via its `data` prop. The component leverages the `THEME_COLORS` array and the `hashString` utility to apply consistent, deterministically assigned colors to theme tags within the timeline. It conditionally renders the timeline and dominant themes table sections only if their respective data arrays are not empty, improving robustness. Styling is primarily achieved using Tailwind CSS classes, with dynamic `style` attributes used for applying calculated theme colors.
 */
export function ThemeEvolution({ data }: Props) {
  return (
    <section id="theme-evolution" className="space-y-5">
      <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[var(--text-primary)]">
        Theme Evolution
      </h2>
      <div className="h-0.5 w-10 bg-[var(--brand-orange)]" />

      {/* Narrative */}
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
        {data.narrative}
      </p>

      {/* Timeline */}
      {data.timeline.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Session Timeline</h3>
          <div className="space-y-4">
            {data.timeline.map((entry, idx) => {
              const date = new Date(entry.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })
              return (
                <div
                  key={entry.sessionId}
                  className={`flex flex-col md:flex-row md:items-start gap-3 ${
                    idx < data.timeline.length - 1
                      ? 'pb-4 border-b border-[var(--border)]'
                      : ''
                  }`}
                >
                  <div className="shrink-0 w-32">
                    <div className="text-sm font-semibold text-[var(--text-primary)] truncate">
                      {entry.speakerName}
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">{date}</div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 flex-1">
                    {entry.themes.map((theme) => {
                      const colorIdx = Math.abs(hashString(theme)) % THEME_COLORS.length
                      const c = THEME_COLORS[colorIdx]
                      return (
                        <span
                          key={theme}
                          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border"
                          style={{ background: c.bg, borderColor: c.border, color: c.text }}
                        >
                          {theme}
                        </span>
                      )
                    })}
                    {entry.themes.length === 0 && (
                      <span className="text-xs text-[var(--text-muted)] italic">No themes recorded</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Dominant themes table */}
      {data.dominantThemes.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Dominant Themes</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left py-2 pr-4 text-xs text-[var(--text-muted)] uppercase tracking-wide font-medium">
                    Theme
                  </th>
                  <th className="text-center py-2 px-4 text-xs text-[var(--text-muted)] uppercase tracking-wide font-medium">
                    Count
                  </th>
                  <th className="text-center py-2 px-4 text-xs text-[var(--text-muted)] uppercase tracking-wide font-medium">
                    First Seen
                  </th>
                  <th className="text-center py-2 pl-4 text-xs text-[var(--text-muted)] uppercase tracking-wide font-medium">
                    Last Seen
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.dominantThemes.map((t) => (
                  <tr key={t.title} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-2.5 pr-4 text-[var(--text-primary)] font-medium">{t.title}</td>
                    <td className="py-2.5 px-4 text-center text-[var(--text-secondary)]">{t.totalCount}</td>
                    <td className="py-2.5 px-4 text-center text-[var(--text-muted)] text-xs">
                      {new Date(t.firstSeen).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="py-2.5 pl-4 text-center text-[var(--text-muted)] text-xs">
                      {new Date(t.lastSeen).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}
