/**
 * QualityComparison — Grouped bar chart comparing question tier distributions.
 *
 * Renders a Recharts grouped bar chart (Tiers 1–4) for two sessions side-by-side.
 * Falls back to a generate-button empty state when tier data is missing.
 * Includes an expandable tier definitions legend.
 *
 * Tier definitions:
 *  Tier 1 — Tension questions (hardest, expose real dilemmas)
 *  Tier 2 — Experience questions (specific moments, failures)
 *  Tier 3 — Strategic questions (frameworks, industry lessons)
 *  Tier 4 — Generic questions ("What advice would you give?")
 *
 * Rendered by: app/(app)/compare/page.tsx (quality tab),
 *              app/(public)/shared/compare/[token]/page.tsx
 */
'use client'

import { useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { SessionTierData } from '@/types'

/**
 * Props for QualityComparison.
 * @prop tierDataA    - Tier classification data for session A; null if not generated.
 * @prop tierDataB    - Tier classification data for session B; null if not generated.
 * @prop speakerA     - Speaker name for session A (used as chart bar label).
 * @prop speakerB     - Speaker name for session B.
 * @prop onGenerate   - Optional callback shown in empty state to trigger analysis.
 * @prop isGenerating - Disables the generate button while in-flight.
 */
/**
 * Defines the properties expected by the QualityComparison component. These props are essential for rendering the comparative quality analysis, including session data, speaker names, and interaction callbacks for data generation.
 * @prop tierDataA - Contains the tier classification data for the first session (speaker A). It's crucial for populating the chart and summary for speaker A, and can be null if the data has not been generated yet.
 * @prop tierDataB - Contains the tier classification data for the second session (speaker B). Similar to `tierDataA`, it populates the chart and summary for speaker B, and can be null.
 * @prop speakerA - The name of the speaker or session identifier for the first data set. This string is used as a label in the chart legend and summary.
 * @prop speakerB - The name of the speaker or session identifier for the second data set. This string is used as a label in the chart legend and summary.
 * @prop onGenerate - An optional callback function that is invoked when the user clicks the 'Generate Comparative Analysis' button in the empty state. It provides a mechanism to trigger the data processing if the tier data is not yet available.
 * @prop isGenerating - An optional boolean flag that indicates whether the data generation process is currently in progress. When true, it disables the 'Generate' button and changes its text to 'Generating...'
 */
interface QualityComparisonProps {
  tierDataA: SessionTierData | null
  tierDataB: SessionTierData | null
  speakerA: string
  speakerB: string
  onGenerate?: () => void
  isGenerating?: boolean
}

/**
 * A constant object mapping numeric tier identifiers to human-readable labels. This is used to display user-friendly names for each tier (e.g., '1' maps to 'Tier 1 — Tension') in the UI, specifically for the chart's X-axis and the tier definitions section.
 * It ensures consistency in how tiers are presented across the component and provides context to the numeric data.
 */
const TIER_LABELS: Record<string, string> = {
  '1': 'Tier 1 — Tension',
  '2': 'Tier 2 — Experience',
  '3': 'Tier 3 — Strategic',
  '4': 'Tier 4 — Generic',
}

/**
 * The QualityComparison functional component renders a comprehensive visual comparison of two sessions' or speakers' content quality, based on pre-classified 'tier' data. It presents this comparison using a bar chart, a textual summary highlighting key differences in Tier 1 questions, and optional detailed tier definitions.
 *
 * This component is used to provide users with an immediate, clear understanding of the qualitative differences between two sets of content, helping them assess depth, strategic value, and other predefined quality metrics. It also gracefully handles scenarios where data is not yet available, offering a mechanism to trigger its generation.
 *
 * Important implementation details:
 * - **Empty State Handling**: If both `tierDataA` and `tierDataB` are null, the component renders a message indicating data unavailability. If an `onGenerate` callback is provided, it also displays a button to initiate the analysis, which can be disabled via `isGenerating`.
 * - **Data Transformation**: It transforms the raw `tierCounts` from `SessionTierData` into a `chartData` array suitable for the Recharts `BarChart` component. Each item in `chartData` represents a tier and includes counts for both `speakerA` and `speakerB`.
 * - **Tier 1 Summary**: Calculates the absolute difference (`diff`) in Tier 1 counts between the two speakers and identifies the `leader` (the speaker with more Tier 1 questions). This summary is conditionally displayed.
 * - **Recharts Integration**: Utilizes several Recharts components (`BarChart`, `ResponsiveContainer`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `Legend`, `Bar`) to create an interactive and responsive bar chart.
 * - **Tier Definitions**: A `useState` hook manages the visibility of detailed tier definitions, which are dynamically rendered by mapping over `TIER_LABELS` and providing a textual description for each tier.
 * - **Styling**: Employs Tailwind CSS classes and CSS variables for styling, ensuring a consistent look and feel within the application.
 */
// Draws the tier chart that both the private compare tab and the shared comparison URL rely on to highlight quality differences.
export function QualityComparison({
  tierDataA,
  tierDataB,
  speakerA,
  speakerB,
  onGenerate,
  isGenerating,
}: QualityComparisonProps) {
  const [showDefinitions, setShowDefinitions] = useState(false)

  if (!tierDataA && !tierDataB) {
    if (onGenerate) {
      return (
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-sm text-[var(--text-muted)] mb-4 font-[family-name:var(--font-dm-sans)]">
            Tier quality data is not available for these sessions.
          </p>
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="px-6 py-2.5 rounded-full bg-[#f36f21] text-white text-sm font-semibold font-[family-name:var(--font-dm-sans)] hover:bg-[#e0611a] transition-colors disabled:opacity-50"
          >
            {isGenerating ? 'Generating...' : 'Generate Comparative Analysis'}
          </button>
        </div>
      )
    }
    return (
      <div className="py-16 text-center text-sm text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">
        Tier quality data is not available for these sessions.
      </div>
    )
  }

  const countsA = tierDataA?.tierCounts ?? {}
  const countsB = tierDataB?.tierCounts ?? {}

  const chartData = ['1', '2', '3', '4'].map(tier => ({
    tier: `Tier ${tier}`,
    [speakerA]: countsA[tier] ?? 0,
    [speakerB]: countsB[tier] ?? 0,
  }))

  const tier1A = countsA['1'] ?? 0
  const tier1B = countsB['1'] ?? 0
  const diff = Math.abs(tier1A - tier1B)
  const leader = tier1A > tier1B ? speakerA : tier1B > tier1A ? speakerB : null

  return (
    <div className="space-y-6 font-[family-name:var(--font-dm-sans)]">
      {/* Chart */}
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="tier" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
            <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey={speakerA} fill="#f36f21" radius={[4, 4, 0, 0]} />
            <Bar dataKey={speakerB} fill="#542785" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary */}
      {leader && (
        <div className="px-4 py-3 rounded-xl" style={{ background: 'var(--surface-elevated)' }}>
          <p className="text-sm text-[var(--text-primary)]">
            <span className="font-semibold">{leader}</span> produced{' '}
            <span className="font-semibold">{diff}</span> more Tier 1 question{diff !== 1 ? 's' : ''} than{' '}
            {leader === speakerA ? speakerB : speakerA}.
          </p>
        </div>
      )}

      {/* Tier definitions toggle */}
      <button
        onClick={() => setShowDefinitions(!showDefinitions)}
        className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
      >
        {showDefinitions ? 'Hide' : 'Show'} tier definitions
      </button>
      {showDefinitions && (
        <div className="space-y-2 text-xs text-[var(--text-secondary)] leading-relaxed">
          {Object.entries(TIER_LABELS).map(([tier, label]) => (
            <div key={tier} className="flex gap-2">
              <span className="font-semibold shrink-0">{label}:</span>
              <span>
                {tier === '1' && 'Questions exposing real dilemmas, difficult decisions, or uncomfortable truths.'}
                {tier === '2' && 'Questions about a specific moment, turning point, failure, or decision.'}
                {tier === '3' && 'Questions about how they think, frameworks they use, industry lessons.'}
                {tier === '4' && 'Generic advice questions — "What advice would you give?"'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
