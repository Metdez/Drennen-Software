/**
 * SentimentComparison — Horizontal grouped bar chart comparing student sentiment.
 *
 * Renders a Recharts horizontal bar chart of the four sentiment dimensions
 * (aspirational, curious, personal, critical) for both sessions, plus delta
 * indicator cards showing percentage-point shifts between sessions.
 * A delta within ±3 points is treated as approximately equal ("~").
 *
 * Rendered by: app/(app)/compare/page.tsx (sentiment tab),
 *              app/(public)/shared/compare/[token]/page.tsx
 */
'use client'

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
import type { SessionAnalysis } from '@/types'

/**
 * Props for SentimentComparison.
 * @prop sentimentA - Sentiment percentages for session A; null if analysis not run.
 * @prop sentimentB - Sentiment percentages for session B.
 * @prop speakerA   - Speaker name for session A (bar label).
 * @prop speakerB   - Speaker name for session B (bar label).
 */
/**
 * Defines the properties required for the SentimentComparison component.
 * 1. What it does: Specifies the input data structure for comparing sentiment between two sessions.
 * 2. Why it is used: Ensures type safety and clarity for the data passed into the `SentimentComparison` component, providing the sentiment analysis results and speaker identifiers for both session A and session B.
 * 3. Important implementation details: Includes optional `sentiment` data (which can be `null` if analysis hasn't been run) and mandatory `speaker` names for labeling purposes.
 */
interface SentimentComparisonProps {
  sentimentA: SessionAnalysis['sentiment'] | null
  sentimentB: SessionAnalysis['sentiment'] | null
  speakerA: string
  speakerB: string
}

/** The four sentiment dimensions measured by the Gemini analysis agent. */
/**
 * Defines the specific sentiment categories or dimensions that are analyzed and compared.
 * 1. What it does: Holds a constant array of strings representing the four sentiment dimensions: 'aspirational', 'curious', 'personal', and 'critical'.
 * 2. Why it is used: Provides a standardized, iterable list of sentiment types, which is crucial for mapping data to chart axes and iterating through sentiment categories when calculating and displaying delta indicators. This ensures consistency across the component's data processing and rendering.
 * 3. Important implementation details: Declared with `as const` to ensure type immutability and allow TypeScript to infer the exact literal string types, preventing common string errors and improving type safety when accessing sentiment data.
 */
const DIMENSIONS = ['aspirational', 'curious', 'personal', 'critical'] as const

/**
 * Computes a delta label and colour between two sentiment percentage values.
 * Differences within ±3 points are displayed as "~" to avoid spurious signals.
 */
/**
 * Calculates the percentage difference between two sentiment scores and returns a formatted label and an associated color based on the difference.
 * 1. What it does: Takes two numerical sentiment percentages (a and b) and computes their difference. It then formats this difference into a string label (e.g., '+5%', '-10%', '~') and assigns a color to indicate improvement, decline, or negligible change.
 * 2. Why it is used: To visually represent the change in sentiment between two sessions. The returned label and color are used in the UI to quickly convey whether a sentiment dimension has significantly increased, decreased, or remained relatively stable.
 * 3. Important implementation details: A difference within a small threshold (less than 3 percentage points) is considered negligible and displayed as '~' with a muted color, preventing over-interpretation of minor fluctuations. Positive differences are green, negative are red, and negligible are muted.
 */
function getDelta(a: number, b: number): { label: string; color: string } {
  const diff = b - a
  if (Math.abs(diff) < 3) return { label: '~', color: 'var(--text-muted)' }
  return diff > 0
    ? { label: `+${diff}%`, color: '#0f6b37' }
    : { label: `${diff}%`, color: '#dc2626' }
}

/**
 * A React functional component that displays a comparison of sentiment analysis results between two different sessions or speakers.
 * 1. What it does: Renders a horizontal bar chart visualizing the percentage distribution of four sentiment dimensions for two entities (speaker A and speaker B). Below the chart, it provides 'delta' indicators that quantify the percentage change for each sentiment dimension between the two entities, including a textual summary of the change.
 * 2. Why it is used: To allow users to easily compare and understand the differences in sentiment profiles of two analyzed sessions. This visual and numerical comparison helps identify key areas where sentiment has shifted or differs significantly.
 * 3. Important implementation details: It utilizes the `recharts` library for rendering the interactive bar chart, providing a responsive and data-driven visualization. It includes a fallback message if sentiment analysis data is not available for either session. The component relies on the `getDelta` helper function to calculate and style the percentage difference indicators, ensuring a consistent visual language for sentiment changes. Styling is managed using Tailwind CSS classes and CSS variables.
 */
// Provides the sentiment delta visualization used in both the compare tab and its shared read-only view.
export function SentimentComparison({
  sentimentA,
  sentimentB,
  speakerA,
  speakerB,
}: SentimentComparisonProps) {
  if (!sentimentA && !sentimentB) {
    return (
      <div className="py-16 text-center text-sm text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">
        Sentiment analysis is not available for these sessions. Run the analysis from the Preview page first.
      </div>
    )
  }

  const chartData = DIMENSIONS.map(dim => ({
    dimension: dim.charAt(0).toUpperCase() + dim.slice(1),
    [speakerA]: sentimentA?.[dim] ?? 0,
    [speakerB]: sentimentB?.[dim] ?? 0,
  }))

  return (
    <div className="space-y-6 font-[family-name:var(--font-dm-sans)]">
      {/* Chart */}
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
              tickFormatter={v => `${v}%`}
            />
            <YAxis
              type="category"
              dataKey="dimension"
              tick={{ fontSize: 12, fill: 'var(--text-muted)' }}
              width={100}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value) => `${value}%`}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey={speakerA} fill="#f36f21" radius={[0, 4, 4, 0]} />
            <Bar dataKey={speakerB} fill="#542785" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Delta indicators */}
      {sentimentA && sentimentB && (
        <div className="grid grid-cols-4 gap-3">
          {DIMENSIONS.map(dim => {
            const delta = getDelta(sentimentA[dim], sentimentB[dim])
            return (
              <div
                key={dim}
                className="rounded-lg p-3 text-center"
                style={{ background: 'var(--surface-elevated)' }}
              >
                <div className="text-xs text-[var(--text-muted)] mb-1 capitalize">{dim}</div>
                <div className="text-lg font-semibold" style={{ color: delta.color }}>
                  {delta.label}
                </div>
                <div className="text-[10px] text-[var(--text-muted)]">
                  {speakerA}: {sentimentA[dim]}% → {speakerB}: {sentimentB[dim]}%
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
