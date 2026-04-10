/**
 * SessionSummaries — Per-session summary cards for the semester report.
 *
 * Renders one card per session with: speaker name, date, file count, debrief
 * rating (if available), theme pills, and debrief highlight text.
 *
 * Rendered by: app/(app)/reports/[id]/page.tsx (session summaries section)
 * Data source: SessionSummariesSection from SemesterReport type
 */
'use client'

import type { SessionSummariesSection } from '@/types'

/**
 * Props for SessionSummaries.
 * @prop data - Session summaries section with array of per-session summary objects.
 */
/**
 * Defines the shape of properties accepted by the SessionSummaries component.
 * 1. What it does: Specifies the required `data` prop for the `SessionSummaries` component.
 * 2. Why it is used: Ensures type safety and clarity for the data passed into the component, guaranteeing it conforms to the `SessionSummariesSection` structure.
 * 3. Important implementation details: It contains a single property, `data`, which is of type `SessionSummariesSection` and carries the array of per-session summary objects to be displayed.
 */
interface Props {
  data: SessionSummariesSection
}

/**
 * Renders a section dedicated to displaying a list of individual session summaries.
 * 1. What it does: Takes an object containing an array of session summaries and renders each one with details such as speaker name, date, file count, debrief rating, themes, and debrief highlights.
 * 2. Why it is used: To present a clear, organized overview of multiple sessions within a larger report, enabling users to quickly scan and understand the key aspects of each session.
 * 3. Important implementation details:
 *     - It is a client-side component, indicated by the `'use client'` directive.
 *     - It iterates through the `sessions` array within the `data` prop to generate a `div` for each session.
 *     - Dynamic date formatting uses `toLocaleDateString` for 'en-US' locale.
 *     - File count displays 'submission' or 'submissions' based on the count.
 *     - Debrief rating, themes, and debrief highlights are conditionally rendered only if the data exists.
 *     - Themes are displayed as styled pills with inline background, border, and text color using `rgba` and hex values.
 *     - Styling leverages Tailwind CSS classes and CSS variables for consistent theming (e.g., `var(--font-playfair)`, `var(--text-primary)`).
 */
export function SessionSummaries({ data }: Props) {
  return (
    <section id="session-summaries" className="space-y-5">
      <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[var(--text-primary)]">
        Session Summaries
      </h2>
      <div className="h-0.5 w-10 bg-[var(--brand-orange)]" />

      <div className="space-y-3">
        {data.sessions.map((s) => (
          <div
            key={s.sessionId}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h3 className="text-base font-semibold text-[var(--text-primary)]">
                  {s.speakerName}
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {new Date(s.date).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                  <span className="mx-2 opacity-40">&middot;</span>
                  {s.fileCount} {s.fileCount === 1 ? 'submission' : 'submissions'}
                </p>
              </div>
              {s.debriefRating != null && (
                <div className="shrink-0 text-right">
                  <div className="text-lg font-bold text-[var(--brand-orange)]">
                    {s.debriefRating}/5
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">debrief</div>
                </div>
              )}
            </div>

            {/* Theme pills */}
            {s.themes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {s.themes.map((theme) => (
                  <span
                    key={theme}
                    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border"
                    style={{
                      background: 'rgba(255,107,0,0.1)',
                      borderColor: 'rgba(255,107,0,0.2)',
                      color: '#fb923c',
                    }}
                  >
                    {theme}
                  </span>
                ))}
              </div>
            )}

            {/* Debrief highlights */}
            {s.debriefHighlights && (
              <p className="text-xs text-[var(--text-secondary)] mt-3 italic leading-relaxed">
                {s.debriefHighlights}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
