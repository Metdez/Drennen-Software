/**
 * QuestionQuality — Question tier distribution charts for the semester report.
 *
 * Renders a trend indicator (improving/stable/declining), a stacked bar chart of
 * tier distribution across sessions, and an overall distribution card grid.
 * Tier colors: T1=BRAND.ORANGE, T2=BRAND.PURPLE, T3=BRAND.GREEN, T4=blue, T5=violet.
 *
 * Rendered by: app/(app)/reports/[id]/page.tsx (question quality section)
 * Data source: QuestionQualitySection from SemesterReport type
 */
'use client'

import type { QuestionQualitySection } from '@/types'
import { BRAND } from '@/lib/constants'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

/**
 * Props for QuestionQuality.
 * @prop data - Question quality section with perSessionTiers, overallDistribution, trend, narrative.
 */
/**
 * Defines the shape of the properties accepted by the QuestionQuality component.
 * 1. What it does: Specifies the single `data` prop required by the component.
 * 2. Why it is used: Ensures type safety and clarity for the data passed to the component, making sure it conforms to the `QuestionQualitySection` interface.
 * 3. Important implementation details: The `data` prop is of type `QuestionQualitySection`, which contains `perSessionTiers`, `overallDistribution`, `trend`, and `narrative`.
 */
interface Props {
  data: QuestionQualitySection
}

/**
 * Maps specific question quality tier names to corresponding color codes.
 * 1. What it does: Provides a centralized lookup for consistent coloring of different quality tiers across the component's visualizations.
 * 2. Why it is used: Ensures brand consistency and readability by associating each tier with a distinct, predefined color. It prevents hardcoding colors directly in the rendering logic.
 * 3. Important implementation details: Uses colors from the `BRAND` constants for 'Tier 1', 'Tier 2', and 'Tier 3', and defines additional hex codes for 'Tier 4' and 'Tier 5'. It's a `Record<string, string>` for easy key-value access.
 */
const TIER_COLORS: Record<string, string> = {
  'Tier 1': BRAND.ORANGE,
  'Tier 2': BRAND.PURPLE,
  'Tier 3': BRAND.GREEN,
  'Tier 4': '#60a5fa',
  'Tier 5': '#a78bfa',
}

/**
 * Retrieves the color associated with a given question quality tier.
 * 1. What it does: Takes a tier name as input and returns its corresponding color from the `TIER_COLORS` map.
 * 2. Why it is used: Provides a utility function to safely access tier colors, including a fallback for any unknown or unspecified tiers to ensure a default color is always returned, preventing UI issues.
 * 3. Important implementation details: If a tier is not found in `TIER_COLORS`, it defaults to a gray color (`#94a3b8`), which typically indicates a neutral or undefined state.
 */
function getTierColor(tier: string): string {
  return TIER_COLORS[tier] ?? '#94a3b8'
}

/**
 * A React functional component that displays a comprehensive report on question quality, including trends, per-session tier distribution, and overall distribution.
 * 1. What it does: Renders various sections of a question quality report using data passed via props. This includes a narrative summary with a trend indicator, a stacked bar chart showing tier distribution over time, and a grid displaying overall tier counts.
 * 2. Why it is used: To provide a visual and textual summary of question quality metrics, allowing users to quickly understand performance trends and distribution across different sessions and overall. It consolidates multiple data points into an easily digestible format.
 * 3. Important implementation details:
 *     - It's a client-side component (`'use client'`).
 *     - Processes `data.perSessionTiers` to create `chartData` suitable for `recharts`, dynamically collecting all unique tier keys for the chart bars.
 *     - Calculates `trendColor`, `trendIcon`, and `trendLabel` based on the `data.trend` property to visually represent improving, declining, or stable trends.
 *     - Utilizes `recharts` for the interactive stacked bar chart, displaying session dates on the X-axis and tier counts on the Y-axis. The tooltip is customized to show full speaker name and date.
 *     - Displays overall distribution by iterating through `data.overallDistribution` and sorting tiers alphabetically.
 *     - Uses Tailwind CSS classes (implied by `className`) for styling and layout, and CSS variables for theming (e.g., `var(--text-primary)`, `var(--brand-orange)`).
 */
export function QuestionQuality({ data }: Props) {
  // Collect all unique tier keys across all sessions
  const allTiers = Array.from(
    new Set(data.perSessionTiers.flatMap((s) => Object.keys(s.tierCounts)))
  ).sort()

  const chartData = data.perSessionTiers.map((s) => {
    const entry: Record<string, string | number> = {
      name: s.speakerName.length > 10 ? s.speakerName.slice(0, 10) + '...' : s.speakerName,
      fullName: s.speakerName,
      date: new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }
    for (const tier of allTiers) {
      entry[tier] = s.tierCounts[tier] ?? 0
    }
    return entry
  })

  const trendColor =
    data.trend === 'improving'
      ? 'var(--brand-green)'
      : data.trend === 'declining'
        ? '#ef4444'
        : 'var(--text-muted)'

  const trendIcon =
    data.trend === 'improving' ? '▲' : data.trend === 'declining' ? '▼' : '◆'

  const trendLabel = data.trend.charAt(0).toUpperCase() + data.trend.slice(1)

  return (
    <section id="question-quality" className="space-y-5">
      <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[var(--text-primary)]">
        Question Quality
      </h2>
      <div className="h-0.5 w-10 bg-[var(--brand-orange)]" />

      {/* Trend indicator + narrative */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <span style={{ color: trendColor }} className="text-xl font-bold">{trendIcon}</span>
          <span style={{ color: trendColor }} className="text-sm font-semibold">{trendLabel}</span>
        </div>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          {data.narrative}
        </p>
      </div>

      {/* Stacked bar chart */}
      {chartData.length > 0 && allTiers.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">
            Tier Distribution by Session
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  axisLine={{ stroke: 'var(--border)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  labelFormatter={(_: unknown, payload: ReadonlyArray<{ payload?: { fullName?: string; date?: string } }>) => {
                    const item = payload?.[0]?.payload
                    return item ? `${item.fullName} (${item.date})` : ''
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px' }}
                />
                {allTiers.map((tier) => (
                  <Bar
                    key={tier}
                    dataKey={tier}
                    stackId="tiers"
                    fill={getTierColor(tier)}
                    radius={[0, 0, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Overall distribution */}
      {Object.keys(data.overallDistribution).length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Overall Distribution</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(data.overallDistribution)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([tier, count]) => (
                <div
                  key={tier}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2 text-center"
                >
                  <div className="text-lg font-bold" style={{ color: getTierColor(tier) }}>
                    {count}
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">{tier}</div>
                </div>
              ))}
          </div>
        </div>
      )}
    </section>
  )
}
