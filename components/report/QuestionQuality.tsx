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

interface Props {
  data: QuestionQualitySection
}

const TIER_COLORS: Record<string, string> = {
  'Tier 1': BRAND.ORANGE,
  'Tier 2': BRAND.PURPLE,
  'Tier 3': BRAND.GREEN,
  'Tier 4': '#60a5fa',
  'Tier 5': '#a78bfa',
}

function getTierColor(tier: string): string {
  return TIER_COLORS[tier] ?? '#94a3b8'
}

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
