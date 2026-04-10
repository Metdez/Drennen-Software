/**
 * AnalysisPanelLeft — Theme Clusters and Underlying Tensions panel.
 *
 * Renders the left half of the session analysis view (the "analysis" tab on
 * /preview). Displays Gemini-generated theme clusters ranked by question count,
 * each with a clickable deep-dive link, and a list of detected underlying
 * tensions between themes.
 *
 * Rendered by: app/(app)/preview/page.tsx (analysis tab),
 *              app/(public)/shared/[token]/page.tsx (read-only)
 * Calls: navigates to /preview/theme?sessionId=...&theme=... on cluster click
 * Data source: SessionAnalysis type, fetched by parent and passed as prop
 */
// components/AnalysisPanelLeft.tsx
'use client'

import { useRouter } from 'next/navigation'
import type { SessionAnalysis } from '@/types'
import { BRAND, ROUTES } from '@/lib/constants'

/**
 * Props for AnalysisPanelLeft.
 * @prop sessionId - Session ID used to build the theme deep-dive URL.
 * @prop analysis  - Gemini analysis result; null while loading or on error.
 * @prop loading   - Show skeleton placeholders when true.
 * @prop error     - Error message to display if analysis failed.
 * @prop onRetry   - Callback to re-trigger analysis fetch; shows "Try again" button.
 * @prop readOnly  - When true, theme clusters render as divs instead of buttons
 *                   (used in public shared views where navigation is disabled).
 */
/**
 * Defines the shape of the properties object accepted by the AnalysisPanelLeft component.
 *
 * What it does: It provides a clear, type-safe contract for all the data and callbacks that AnalysisPanelLeft expects to receive from its parent component.
 * Why it is used: To enforce type safety for the component's props, improve code readability, and aid developers in understanding the component's API. This makes the component easier to use and maintain.
 * Important implementation details:
 * - `sessionId`: A unique identifier for the session, essential for constructing theme deep-dive URLs.
 * - `analysis`: Holds the Gemini AI analysis result; it can be `null` while data is loading or if an error occurred.
 * - `loading`: A boolean flag that, when `true`, indicates data is being fetched and triggers the display of skeleton placeholders.
 * - `error`: An optional string that, if present, contains a user-friendly error message to be displayed when analysis fails.
 * - `onRetry`: An optional callback function that is invoked when the user clicks a "Try again" button, allowing the parent component to re-trigger the analysis fetch.
 * - `readOnly`: An optional boolean flag that, when `true`, renders theme clusters as non-interactive `div` elements instead of clickable `button`s, typically used in shared views where navigation is disabled.
 */
interface Props {
  sessionId: string
  analysis: SessionAnalysis | null
  loading: boolean
  error?: string | null
  onRetry?: () => void
  readOnly?: boolean
}

/** Animated placeholder block shown while analysis data is loading. */
/**
 * Renders an animated placeholder block to indicate loading content.
 *
 * What it does: Displays a visually distinct, pulsing rectangular block on the screen.
 * Why it is used: To provide immediate visual feedback to the user that content is being loaded asynchronously. This improves the perceived performance and user experience by preventing a blank screen and signaling that an action is in progress.
 * Important implementation details:
 * - It accepts an optional `h` prop (defaulting to 'h-24') to customize the block's height, allowing for flexible sizing in different loading contexts.
 * - Styling is applied using Tailwind CSS classes, including `rounded-2xl`, `border`, `bg`, and the `animate-pulse` utility for the loading animation.
 * - It uses CSS variables like `var(--border-accent)` and `var(--surface)` for border and background colors, ensuring consistency with the application's theme.
 */
function SkeletonBlock({ h = 'h-24' }: { h?: string }) {
  return (
    <div className={`rounded-2xl border border-[var(--border-accent)] bg-[var(--surface)] ${h} animate-pulse`} />
  )
}

/**
 * Left analysis panel: theme clusters with proportional progress bars and
 * underlying tensions. Clusters are clickable (unless readOnly) and navigate
 * to the theme deep-dive page.
 */
/**
 * Displays the left-hand panel of the session analysis view, presenting AI-generated theme clusters and underlying tensions.
 *
 * What it does: Renders a structured overview of the AI analysis, including interactive theme clusters (unless in read-only mode) that can navigate to detailed theme pages, and a list of identified underlying tensions. It manages different UI states for loading, errors, and no data.
 * Why it is used: To provide users with a high-level summary of the insights derived from their session data, facilitating exploration and understanding of key themes and conflicts. It acts as the primary interface for initiating deep-dives into specific thematic areas.
 * Important implementation details:
 * - Utilizes `next/navigation`'s `useRouter` hook for client-side routing, enabling navigation to theme deep-dive pages.
 * - `handleThemeClick`: A local handler function responsible for constructing and pushing the URL for a specific theme deep-dive, ensuring the theme name is properly encoded.
 * - Normalizes the width of progress bars within theme clusters by calculating `maxCount`, the highest question count among all clusters, to ensure visual proportionality.
 * - Dynamically renders theme clusters using either a `button` element (for interactive navigation) or a `div` element (when `readOnly` is `true`), based on the `readOnly` prop.
 * - The top theme cluster (at index 0) receives distinct styling, including a special background and a gradient progress bar, to highlight its prominence.
 * - Incorporates various UI states:
 *     - `loading`: Displays multiple `SkeletonBlock` components.
 *     - `!loading && analysis`: Renders the actual theme clusters and underlying tensions.
 *     - `!loading && !analysis && error`: Shows an error message and an optional "Try again" button, invoking `onRetry` if provided.
 *     - `!loading && !analysis && !error`: Displays a message indicating no submission data.
 * - Features a "Powered by Gemini" footer, signifying the AI model used for the analysis.
 * - Employs extensive Tailwind CSS classes and CSS variables (`var(--border-accent)`, `var(--surface)`, `var(--text-muted)`, etc.) for consistent theming and styling.
 * - Makes use of `BRAND.ORANGE` and `BRAND.PURPLE` constants for color gradients in progress bars and other visual elements, tying into the application's brand identity.
 */
export function AnalysisPanelLeft({ sessionId, analysis, loading, error, onRetry, readOnly }: Props) {
  const router = useRouter()

  /** Navigate to /preview/theme for a theme deep-dive. */
  function handleThemeClick(themeName: string) {
    const url = `${ROUTES.PREVIEW_THEME}?sessionId=${sessionId}&theme=${encodeURIComponent(themeName)}`
    router.push(url)
  }

  // Normalise progress bar widths relative to the cluster with the most questions
  const maxCount = analysis
    ? Math.max(...analysis.theme_clusters.map((c) => c.question_count), 1)
    : 1

  return (
    <div className="py-10 px-4">
      <div className="max-w-3xl mx-auto flex flex-col gap-8">

        {/* Header */}
        <div>
          <p className="text-[0.65rem] uppercase tracking-[0.18em] text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)] mb-1">
            Question Analysis
          </p>
          <div className="h-px bg-gradient-to-r from-[#f36f21] via-[#542785] to-transparent" />
        </div>

        {loading && (
          <div className="flex flex-col gap-4">
            <SkeletonBlock h="h-8" />
            <SkeletonBlock h="h-48" />
            <SkeletonBlock h="h-32" />
          </div>
        )}

        {!loading && analysis && (
          <>
            {/* Theme Clusters */}
            <div className="flex flex-col gap-4">
              <div className="flex items-baseline justify-between">
                <h2 className="text-base font-semibold text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)]">
                  Theme Clusters
                </h2>
                {!readOnly && (
                  <span className="text-xs text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">
                    click any to deep-dive →
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-3">
                {analysis.theme_clusters.map((cluster, i) => {
                  const barWidth = Math.round((cluster.question_count / maxCount) * 100)
                  const isTop = i === 0
                  const Wrapper = readOnly ? 'div' : 'button'
                  return (
                    <Wrapper
                      key={cluster.name}
                      {...(!readOnly ? { onClick: () => handleThemeClick(cluster.name) } : {})}
                      className={`w-full text-left rounded-2xl border border-[var(--border-accent)] bg-[var(--surface)] p-5 group transition-all duration-200${readOnly ? '' : ' hover:border-[#f36f21]'}`}
                      style={{ background: isTop ? 'rgba(243,111,33,0.04)' : undefined }}
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <span className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-[#f36f21] transition-colors leading-snug font-[family-name:var(--font-dm-sans)]">
                          {cluster.name}
                        </span>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span
                            className="text-xs font-bold px-2.5 py-1 rounded-full tabular-nums font-[family-name:var(--font-dm-sans)]"
                            style={{
                              background: isTop ? 'rgba(243,111,33,0.15)' : 'rgba(255,255,255,0.06)',
                              color: isTop ? BRAND.ORANGE : 'var(--text-secondary)',
                            }}
                          >
                            {cluster.question_count}
                          </span>
                          {!readOnly && <span className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity text-sm">→</span>}
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="h-1 rounded-full bg-[var(--border-accent)] mb-3">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${barWidth}%`,
                            background: isTop
                              ? `linear-gradient(90deg, ${BRAND.ORANGE}, ${BRAND.PURPLE})`
                              : `linear-gradient(90deg, ${BRAND.PURPLE}, rgba(84,39,133,0.3))`,
                          }}
                        />
                      </div>

                      {/* Top question preview */}
                      <p className="text-xs text-[var(--text-muted)] italic leading-relaxed line-clamp-2 font-[family-name:var(--font-dm-sans)]">
                        &ldquo;{cluster.top_question}&rdquo;
                      </p>
                    </Wrapper>
                  )
                })}
              </div>
            </div>

            {/* Underlying Tensions */}
            {analysis.tensions.length > 0 && (
              <div className="flex flex-col gap-4">
                <h2 className="text-base font-semibold text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)]">
                  ⚡ Underlying Tensions
                </h2>
                <div className="flex flex-col gap-3">
                  {analysis.tensions.map((t) => (
                    <div
                      key={t.label}
                      className="rounded-2xl border border-[var(--border-accent)] bg-[var(--surface)] p-5"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[#a78bda] text-base">↔</span>
                        <span className="text-sm font-semibold text-[#a78bda] font-[family-name:var(--font-dm-sans)]">
                          {t.label}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--text-secondary)] leading-relaxed font-[family-name:var(--font-dm-sans)]">
                        {t.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {!loading && !analysis && error && (
          <div className="rounded-2xl border border-red-900/40 bg-red-950/20 p-8 text-center flex flex-col items-center gap-3">
            <p className="text-sm font-semibold text-red-400 font-[family-name:var(--font-dm-sans)]">Analysis failed to load</p>
            <p className="text-xs text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">{error}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-1 text-xs px-4 py-1.5 rounded-full border border-[var(--border-accent)] text-[var(--text-secondary)] hover:text-[#f36f21] hover:border-[#f36f21] transition-colors font-[family-name:var(--font-dm-sans)]"
              >
                Try again
              </button>
            )}
          </div>
        )}

        {!loading && !analysis && !error && (
          <div className="rounded-2xl border border-[var(--border-accent)] bg-[var(--surface)] p-8 text-center">
            <p className="text-sm text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">
              No submission data available for this session.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center gap-2 pt-2 border-t border-[var(--border-accent)]">
          <div className="w-1.5 h-1.5 rounded-full bg-[#7dd4d4] animate-pulse" />
          <span className="text-xs text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">Powered by Gemini</span>
        </div>

      </div>
    </div>
  )
}
