/**
 * SynthesisPanel — Session Intelligence Synthesis view.
 *
 * Renders the AI-generated cross-data synthesis that connects what students
 * asked (questions), observed (speaker analyses), and reflected on (debriefs).
 * Requires at least two submission types to be present; shows a gated empty
 * state otherwise.
 *
 * Sections rendered when synthesis is available:
 *  - Executive narrative
 *  - Curiosity resolution (did the speaker address student themes?)
 *  - Theme evolution before → after the session
 *  - Emergent themes (unexpected post-session discoveries)
 *  - Emotional tone shift
 *  - Gaps across data sources
 *
 * Rendered by: app/(app)/preview/page.tsx (synthesis tab)
 * Data source: SessionSynthesis type, fetched by parent from /api/sessions/[id]/synthesis
 */
'use client'

import type { SessionSynthesis } from '@/types'

/**
 * Tracks which of the three submission types have been uploaded for this session.
 * Used to determine whether synthesis can be generated and to display data badges.
 */
/**
 * Tracks which of the three submission types have been uploaded for this session.
 * Used to determine whether synthesis can be generated and to display data badges.
 *
 * What it does: Defines the structure to track the presence of three specific submission types.
 * Why it is used: To determine if enough data is available for synthesis generation and to visually represent the uploaded data types with badges.
 * Important implementation details: Uses boolean flags for `has_questions`, `has_debriefs`, and `has_speaker_analyses`.
 */
interface DataCompleteness {
  has_questions: boolean
  has_debriefs: boolean
  has_speaker_analyses: boolean
}

/**
 * Props for SynthesisPanel.
 * @prop synthesis        - Synthesis result; null until generated.
 * @prop loading          - True while synthesis generation is in progress.
 * @prop error            - Error message if generation failed.
 * @prop insufficient     - True when fewer than two submission types exist; shows
 *                          data-type badge gate rather than a generate button.
 * @prop pending          - True when individual analyses are still being processed;
 *                          the user is prompted to refresh.
 * @prop dataCompleteness - Which of the three submission types are present.
 * @prop onRetry          - Callback to re-fetch or retry synthesis generation.
 */
/**
 * Props for SynthesisPanel.
 * @prop synthesis        - Synthesis result; null until generated.
 * @prop loading          - True while synthesis generation is in progress.
 * @prop error            - Error message if generation failed.
 * @prop insufficient     - True when fewer than two submission types exist; shows
 *                           data-type badge gate rather than a generate button.
 * @prop pending          - True when individual analyses are still being processed;
 *                           the user is prompted to refresh.
 * @prop dataCompleteness - Which of the three submission types are present.
 * @prop onRetry          - Callback to re-fetch or retry synthesis generation.
 *
 * What it does: Defines the properties expected by the `SynthesisPanel` component.
 * Why it is used: To pass all necessary data and state information (`synthesis` data, `loading` status, `error` messages, `insufficient` data flag, `pending` analysis status, `dataCompleteness` details, and `onRetry` callback) from a parent component to `SynthesisPanel` for rendering.
 * Important implementation details: Includes a `SessionSynthesis` type (which is imported), boolean flags for various states, string for error messages, and a callback function.
 */
interface Props {
  synthesis: SessionSynthesis | null
  loading: boolean
  error: string | null
  insufficient: boolean
  pending: boolean
  dataCompleteness: DataCompleteness
  onRetry: () => void
}

/**
 * Badge config for each of the three data submission types.
 * Colors map to BRAND.ORANGE (questions), BRAND.GREEN (analyses), BRAND.PURPLE (debriefs).
 * Present badges are fully opaque; absent badges are dimmed.
 */
/**
 * Badge config for each of the three data submission types.
 * Colors map to BRAND.ORANGE (questions), BRAND.GREEN (analyses), BRAND.PURPLE (debriefs).
 * Present badges are fully opaque; absent badges are dimmed.
 *
 * What it does: Configuration array for displaying data type badges.
 * Why it is used: Provides a centralized and consistent definition for the labels, full labels, colors, and background colors associated with each data submission type. This ensures uniform styling and text across the UI where these badges are used.
 * Important implementation details: An array of objects, each containing `key` (for mapping to `DataCompleteness`), `label` (short display), `fullLabel` (for titles), `color`, and `bg` (background color with transparency). It uses `as const` to make it a tuple of readonly objects. The colors are tied to specific brand colors.
 */
const DATA_TYPE_BADGES = [
  { key: 'has_questions', label: 'Q', fullLabel: 'Questions', color: '#f36f21', bg: 'rgba(243,111,33,0.12)' },
  { key: 'has_speaker_analyses', label: 'A', fullLabel: 'Speaker Analyses', color: '#0f6b37', bg: 'rgba(15,107,55,0.12)' },
  { key: 'has_debriefs', label: 'D', fullLabel: 'Debriefs', color: '#542785', bg: 'rgba(84,39,133,0.12)' },
] as const

/**
 * What it does: Renders a group of badges indicating the completeness of different data types for a session.
 * Why it is used: To visually communicate which data submission types (questions, speaker analyses, debriefs) have been uploaded for a session. This helps users understand the status of their data for synthesis generation.
 * Important implementation details:
 * - It maps over the `DATA_TYPE_BADGES` configuration to render individual badges.
 * - Each badge's appearance (background color, text color, opacity) is dynamically determined based on whether the corresponding data type is `present` in the `completeness` prop.
 * - Uses inline styles for dynamic coloring and opacity based on the `present` status.
 * - Provides a `title` attribute for accessibility, showing the full label and upload status on hover.
 */
function DataTypeBadges({ completeness }: { completeness: DataCompleteness }) {
  return (
    <div className="flex items-center gap-2">
      {DATA_TYPE_BADGES.map(({ key, label, fullLabel, color, bg }) => {
        const present = completeness[key]
        return (
          <div
            key={key}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold font-[family-name:var(--font-dm-sans)] transition-opacity"
            style={{
              backgroundColor: present ? bg : 'rgba(128,128,128,0.08)',
              color: present ? color : 'var(--text-muted)',
              opacity: present ? 1 : 0.5,
            }}
            title={`${fullLabel}: ${present ? 'Uploaded' : 'Not yet uploaded'}`}
          >
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: present ? color : 'var(--text-muted)' }}
            />
            {label}
          </div>
        )
      })}
    </div>
  )
}

/**
 * Renders the synthesis panel. Guard-clauses handle the four special states
 * (insufficient data, pending analyses, loading, error) before reaching the
 * fully-populated synthesis layout.
 */
/**
 * Renders the synthesis panel. Guard-clauses handle the four special states
 * (insufficient data, pending analyses, loading, error) before reaching the
 * fully-populated synthesis layout.
 *
 * What it does: The main component responsible for displaying the AI-generated synthesis results for a session, or various states leading up to its generation.
 * Why it is used: It serves as the primary UI element for users to view the AI-generated intelligence derived from multiple data sources (questions, debriefs, speaker analyses) or to be guided on how to enable its generation.
 * Important implementation details:
 * - Uses a series of guard clauses (`if` statements) at the beginning to handle different states: `insufficient` data, `pending` analyses, `loading`, and `error`. This ensures a clear progression and appropriate UI for each state.
 * - Renders different UI elements (e.g., icons, messages, buttons, `DataTypeBadges`) based on the current state.
 * - If `synthesis` data is available, it renders detailed sections like `Executive Summary`, `Curiosity Resolution`, `Theme Evolution`, `Emergent Themes`, `Emotional Tone Shift`, and `Gaps Across Data Sources`.
 * - Leverages Tailwind CSS classes for styling and custom CSS variables for consistent typography.
 * - Dynamically styles some sections based on data content (e.g., `item.addressed` for `Curiosity Resolution`).
 * - The `onRetry` callback is crucial for allowing users to re-trigger data fetching in `pending` or `error` states.
 * - The `synthesis` object itself contains rich structured data which is then rendered into distinct, visually organized sections.
 * - The `DataTypeBadges` component is reused in several states (insufficient, pending, and full synthesis display).
 */
export function SynthesisPanel({
  synthesis,
  loading,
  error,
  insufficient,
  pending,
  dataCompleteness,
  onRetry,
}: Props) {
  // Insufficient data types — show the badge gate before offering a generate button
  if (insufficient) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-5">
        <div className="w-14 h-14 rounded-2xl bg-[rgba(84,39,133,0.08)] flex items-center justify-center">
          <svg className="h-7 w-7 text-[#542785]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
          </svg>
        </div>
        <div className="text-center max-w-md">
          <h3 className="text-base font-semibold text-[var(--text-primary)] mb-2 font-[family-name:var(--font-dm-sans)]">
            Session Synthesis
          </h3>
          <p className="text-sm text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)] mb-4">
            Upload at least two submission types to generate a cross-data synthesis. The synthesis connects
            the dots between what students asked, observed, and reflected on.
          </p>
          <DataTypeBadges completeness={dataCompleteness} />
        </div>
      </div>
    )
  }

  // Pending (individual analyses still processing)
  if (pending) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-5 h-5 border-2 border-[#542785] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">
          Individual analyses are still processing. Synthesis will be available shortly.
        </p>
        <DataTypeBadges completeness={dataCompleteness} />
        <button
          onClick={onRetry}
          className="text-sm text-[#542785] hover:underline font-[family-name:var(--font-dm-sans)]"
        >
          Refresh
        </button>
      </div>
    )
  }

  // Loading
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[var(--text-muted)] text-sm font-[family-name:var(--font-dm-sans)]">
        Generating synthesis...
      </div>
    )
  }

  // Error
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <p className="text-red-400 text-sm font-[family-name:var(--font-dm-sans)]">{error}</p>
        <button
          onClick={onRetry}
          className="text-sm text-[#542785] hover:underline font-[family-name:var(--font-dm-sans)]"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!synthesis) return null

  return (
    <div className="flex flex-col gap-8 animate-fade-up">
      {/* Data Completeness + Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-[#542785]" />
          <h2 className="text-sm font-semibold text-[#542785] uppercase tracking-wider font-[family-name:var(--font-dm-sans)]">
            Session Intelligence Synthesis
          </h2>
        </div>
        <DataTypeBadges completeness={synthesis.data_completeness} />
      </div>

      {/* Missing data note */}
      {synthesis.data_completeness.missing_note && (
        <div
          className="rounded-xl px-4 py-3 border text-sm font-[family-name:var(--font-dm-sans)]"
          style={{ borderColor: 'rgba(243,111,33,0.3)', background: 'rgba(243,111,33,0.05)', color: 'var(--text-secondary)' }}
        >
          {synthesis.data_completeness.missing_note}
        </div>
      )}

      {/* Executive Narrative */}
      <div className="rounded-2xl border border-[rgba(84,39,133,0.2)] bg-[rgba(84,39,133,0.03)] p-6">
        <h3 className="text-sm font-semibold text-[#542785] uppercase tracking-wider mb-3 font-[family-name:var(--font-dm-sans)]">
          Executive Summary
        </h3>
        <p className="text-sm text-[var(--text-secondary)] font-[family-name:var(--font-dm-sans)] leading-relaxed whitespace-pre-line">
          {synthesis.narrative}
        </p>
      </div>

      {/* Curiosity Resolution */}
      {synthesis.curiosity_resolution.length > 0 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-base font-semibold text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)]">
            Did the Speaker Address Student Curiosities?
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {synthesis.curiosity_resolution.map((item, i) => (
              <div
                key={i}
                className="rounded-xl border p-4 transition-all"
                style={{
                  borderColor: item.addressed ? 'rgba(15,107,55,0.25)' : 'rgba(243,111,33,0.25)',
                  background: item.addressed ? 'rgba(15,107,55,0.03)' : 'rgba(243,111,33,0.03)',
                }}
              >
                <div className="flex items-start gap-2.5 mb-2">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                    style={{
                      backgroundColor: item.addressed ? 'rgba(15,107,55,0.15)' : 'rgba(243,111,33,0.15)',
                    }}
                  >
                    {item.addressed ? (
                      <svg className="w-3 h-3 text-[#0f6b37]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3 text-[#f36f21]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)]">
                    {item.question_theme}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)] leading-relaxed pl-7.5">
                  {item.evidence}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Theme Evolution */}
      {synthesis.theme_evolution.length > 0 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-base font-semibold text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)]">
            Theme Evolution: Before → After
          </h3>
          <div className="flex flex-col gap-3">
            {synthesis.theme_evolution.map((item, i) => (
              <div
                key={i}
                className="rounded-xl border border-[var(--border-accent)] bg-[var(--surface)] p-4"
              >
                <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3 font-[family-name:var(--font-dm-sans)]">
                  {item.theme}
                </h4>
                <div className="grid sm:grid-cols-2 gap-3 mb-3">
                  {item.pre_session && (
                    <div className="rounded-lg bg-[rgba(243,111,33,0.05)] border border-[rgba(243,111,33,0.15)] p-3">
                      <span className="text-[10px] font-bold text-[#f36f21] uppercase tracking-wider font-[family-name:var(--font-dm-sans)]">
                        Pre-Session
                      </span>
                      <p className="text-xs text-[var(--text-secondary)] mt-1 font-[family-name:var(--font-dm-sans)] leading-relaxed">
                        {item.pre_session}
                      </p>
                    </div>
                  )}
                  {item.post_session && (
                    <div className="rounded-lg bg-[rgba(84,39,133,0.05)] border border-[rgba(84,39,133,0.15)] p-3">
                      <span className="text-[10px] font-bold text-[#542785] uppercase tracking-wider font-[family-name:var(--font-dm-sans)]">
                        Post-Session
                      </span>
                      <p className="text-xs text-[var(--text-secondary)] mt-1 font-[family-name:var(--font-dm-sans)] leading-relaxed">
                        {item.post_session}
                      </p>
                    </div>
                  )}
                </div>
                <p className="text-xs text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)] leading-relaxed italic">
                  {item.evolution}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Emergent Themes */}
      {synthesis.emergent_themes.length > 0 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-base font-semibold text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)]">
            Emergent Themes (Unexpected Post-Session)
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {synthesis.emergent_themes.map((item, i) => {
              const isDebrief = item.source === 'debriefs'
              const color = isDebrief ? '#542785' : '#0f6b37'
              const bg = isDebrief ? 'rgba(84,39,133,0.12)' : 'rgba(15,107,55,0.12)'
              const sourceLabel = isDebrief ? 'Debriefs' : 'Speaker Analyses'

              return (
                <div key={i} className="rounded-xl border border-[var(--border-accent)] bg-[var(--surface)] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)]">
                      {item.theme}
                    </span>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full font-[family-name:var(--font-dm-sans)]"
                      style={{ backgroundColor: bg, color }}
                    >
                      {sourceLabel}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)] leading-relaxed mb-1.5">
                    {item.description}
                  </p>
                  <span className="text-[10px] text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">
                    {item.student_count} {item.student_count === 1 ? 'student' : 'students'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tone Shift */}
      {synthesis.tone_shift && (
        <div className="flex flex-col gap-4">
          <h3 className="text-base font-semibold text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)]">
            Emotional Tone Shift
          </h3>
          <div className="rounded-xl border border-[var(--border-accent)] bg-[var(--surface)] p-5">
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div className="rounded-lg bg-[rgba(243,111,33,0.05)] border border-[rgba(243,111,33,0.15)] p-4 text-center">
                <span className="text-[10px] font-bold text-[#f36f21] uppercase tracking-wider font-[family-name:var(--font-dm-sans)]">
                  Before Session
                </span>
                <p className="text-lg font-semibold text-[var(--text-primary)] mt-1 font-[family-name:var(--font-dm-sans)]">
                  {synthesis.tone_shift.pre.dominant}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1 font-[family-name:var(--font-dm-sans)]">
                  {synthesis.tone_shift.pre.description}
                </p>
              </div>
              <div className="rounded-lg bg-[rgba(84,39,133,0.05)] border border-[rgba(84,39,133,0.15)] p-4 text-center">
                <span className="text-[10px] font-bold text-[#542785] uppercase tracking-wider font-[family-name:var(--font-dm-sans)]">
                  After Session
                </span>
                <p className="text-lg font-semibold text-[var(--text-primary)] mt-1 font-[family-name:var(--font-dm-sans)]">
                  {synthesis.tone_shift.post.dominant}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1 font-[family-name:var(--font-dm-sans)]">
                  {synthesis.tone_shift.post.description}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px flex-1 bg-[rgba(243,111,33,0.3)]" />
              <svg className="w-4 h-4 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
              <div className="h-px flex-1 bg-[rgba(84,39,133,0.3)]" />
            </div>
            <p className="text-sm text-[var(--text-secondary)] font-[family-name:var(--font-dm-sans)] leading-relaxed text-center">
              {synthesis.tone_shift.shift_narrative}
            </p>
          </div>
        </div>
      )}

      {/* Gaps */}
      {synthesis.gaps.length > 0 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-base font-semibold text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)]">
            Gaps Across Data Sources
          </h3>
          <div className="flex flex-col gap-3">
            {synthesis.gaps.map((gap, i) => (
              <div key={i} className="rounded-xl border border-[rgba(243,111,33,0.2)] bg-[rgba(243,111,33,0.03)] p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-4 h-4 text-[#f36f21] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                  <div>
                    <span className="text-sm font-semibold text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)]">
                      {gap.theme}
                    </span>
                    <div className="flex items-center gap-2 mt-1.5 mb-2">
                      <span className="text-[10px] text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">
                        Present in: {gap.present_in.join(', ')}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)]">|</span>
                      <span className="text-[10px] text-[#f36f21] font-[family-name:var(--font-dm-sans)]">
                        Absent from: {gap.absent_from.join(', ')}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)] leading-relaxed">
                      {gap.significance}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
