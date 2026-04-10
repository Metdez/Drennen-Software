/**
 * ThemeExplorer — Ranked theme list with expand-to-detail for the analytics page.
 *
 * Renders the top themes from the professor's class-level Gemini insights.
 * Each row shows a rank number, theme title, a proportional progress bar
 * (% of sessions where the theme appeared), and a NEW badge for recent themes.
 * Clicking a row expands an inline detail view with summary, session list, and
 * sample questions, plus a link to the full cross-session theme analysis page.
 *
 * Rendered by: app/(app)/analytics/page.tsx (Theme Explorer section)
 * Reads: ClassInsights.topThemes (from class_insights table via Gemini)
 */
'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { ClassInsights } from '@/types'

/**
 * Props for ThemeExplorer.
 * @prop themes        - Top themes array from ClassInsights, sorted by frequency.
 * @prop totalSessions - Denominator for computing per-theme session percentage.
 */
/**
 * Props for the ThemeExplorer component.
 * 1. What it does: Defines the shape of the properties that the ThemeExplorer component expects to receive.
 * 2. Why it is used: Ensures type safety and clarity for the data passed into the component, specifically the list of themes and the total session count required for calculations.
 * 3. Important implementation details: Includes `themes`, an array of `ClassInsights['topThemes']` sorted by frequency, and `totalSessions`, a number used as the denominator to compute the percentage of sessions per theme.
 */
interface ThemeExplorerProps {
  themes: ClassInsights['topThemes']
  totalSessions: number
}

/** Number of themes shown before the "View all N themes" toggle appears. */
/**
 * A constant defining the initial number of themes displayed by default in the Theme Explorer.
 * 1. What it does: Sets the threshold for how many themes are visible before the "View all N themes" toggle appears.
 * 2. Why it is used: Improves initial load performance and UI decluttering by only showing the most relevant themes, while still providing an option to see all available data.
 * 3. Important implementation details: Currently set to 5. This value is used in conjunction with the `showAll` state to determine the `visibleThemes` array.
 */
const INITIAL_VISIBLE = 5

/**
 * A React client component that displays and allows interaction with a list of top themes from class analytics.
 * 1. What it does: Renders a 'Theme Explorer' section, presenting a list of themes with their rank, session percentage, and a dynamic progress bar. Users can expand individual themes to view more details like a summary, associated sessions, and sample questions. It also includes a "View all" toggle to show additional themes beyond the initial visible set.
 * 2. Why it is used: Provides an interactive and organized way for users to explore the most prominent themes identified in their class data, offering quick insights and the option to delve deeper into specific themes.
 * 3. Important implementation details:
 *     *   Uses the `'use client'` directive, indicating it's a client-side component capable of managing state and handling user interactions.
 *     *   Manages two local states: `expandedTheme` (a string holding the title of the currently expanded theme or `null`) and `showAll` (a boolean to control whether all themes or only `INITIAL_VISIBLE` themes are shown).
 *     *   Conditionally renders either a compact button or an expanded detail card for each theme based on the `expandedTheme` state.
 *     *   Calculates `pct` (percentage) dynamically based on `theme.sessionCount` and `totalSessions`.
 *     *   Provides a `Link` to a dedicated `/analytics/theme` page for a full analysis of an individual theme.
 *     *   The "View all" button is only shown if there are more themes than `INITIAL_VISIBLE` and `showAll` is `false`.
 */
export function ThemeExplorer({ themes, totalSessions }: ThemeExplorerProps) {
  const [expandedTheme, setExpandedTheme] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)

  // Toggle between the default summary view and the full list when the user asks to see all themes.
  const visibleThemes = showAll ? themes : themes.slice(0, INITIAL_VISIBLE)

  return (
    <div className="mb-8">
      <div className="flex justify-between items-baseline mb-1">
        <h3 className="font-[family-name:var(--font-playfair)] text-xl font-bold text-[var(--text-primary)]">
          Theme Explorer
        </h3>
        <span className="text-[11px] text-[var(--text-muted)]">
          Click to expand · Full analysis available
        </span>
      </div>
      <div className="h-0.5 w-10 bg-[var(--brand-orange)] rounded-sm mb-4" />

    {visibleThemes.map((theme, i) => {
      const rank = i + 1
      // Derived percentage for the progress bar; zero when no sessions exist yet.
      const pct = totalSessions > 0 ? Math.round((theme.sessionCount / totalSessions) * 100) : 0
      const isExpanded = expandedTheme === theme.title

        if (isExpanded) {
          return (
            <div
              key={theme.title}
              className="bg-[#1a1a24] border border-[rgba(255,107,0,0.12)] rounded-xl mb-1 p-4 px-5"
            >
              <div className="flex justify-between items-center mb-2.5">
                <span className="text-[15px] font-semibold text-[var(--brand-orange)]">
                  {rank}. {theme.title}
                </span>
                <button
                  onClick={() => setExpandedTheme(null)}
                  className="text-xs text-[var(--text-muted)] cursor-pointer bg-transparent border-none hover:text-[var(--text-secondary)]"
                >
                  ▾ Collapse
                </button>
              </div>
              {theme.summary && (
                <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed mb-2.5">
                  {theme.summary}
                </p>
              )}
              {theme.sessions?.length > 0 && (
                <div className="text-xs text-[var(--text-muted)] mb-2">
                  Appeared in: {theme.sessions.join(', ')} ({theme.sessionCount} of {totalSessions} sessions · {pct}%)
                </div>
              )}
              {theme.sampleQuestions?.length > 0 && (
                <ul className="text-xs text-[var(--text-secondary)] pl-4 list-disc mb-2.5">
                  {theme.sampleQuestions.map((q, qi) => (
                    <li key={qi} className="mb-1">{q}</li>
                  ))}
                </ul>
              )}
              <Link
                href={`/analytics/theme?title=${encodeURIComponent(theme.title)}`}
                className="text-xs text-[var(--brand-orange)] hover:underline"
              >
                See full analysis →
              </Link>
            </div>
          )
        }

        return (
          <button
            key={theme.title}
            onClick={() => setExpandedTheme(theme.title)}
            className="w-full flex items-center gap-3 p-3.5 px-4 -mx-1 rounded-xl hover:bg-[var(--surface-hover)] transition-colors cursor-pointer group text-left bg-transparent border-none mb-1"
          >
            <span className="text-[13px] text-[var(--text-muted)] w-5 text-right shrink-0">{rank}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-[var(--text-primary)] font-medium group-hover:text-[var(--brand-orange)] transition-colors truncate">
                  {theme.title}
                </span>
                {theme.isNew && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[rgba(34,197,94,0.15)] text-[#4ade80] border border-[rgba(34,197,94,0.3)] shrink-0">
                    NEW
                  </span>
                )}
              </div>
              <div className="h-1 bg-[var(--surface-elevated)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--brand-orange)] transition-all duration-500"
                  style={{ width: `${pct}%`, opacity: 0.6 }}
                />
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-sm font-bold text-[var(--text-primary)]">{pct}%</div>
              <div className="text-[11px] text-[var(--text-muted)]">
                {theme.sessionCount} session{theme.sessionCount !== 1 ? 's' : ''}
              </div>
            </div>
            <span className="text-[var(--brand-orange)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-[13px]">
              →
            </span>
          </button>
        )
      })}

      {!showAll && themes.length > INITIAL_VISIBLE && (
        <button
          onClick={() => setShowAll(true)}
          className="mt-2 text-xs text-[var(--brand-orange)] hover:underline px-4 bg-transparent border-none cursor-pointer"
        >
          View all {themes.length} themes →
        </button>
      )}
    </div>
  )
}
