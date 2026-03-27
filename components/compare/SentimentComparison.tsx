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

interface SentimentComparisonProps {
  sentimentA: SessionAnalysis['sentiment'] | null
  sentimentB: SessionAnalysis['sentiment'] | null
  speakerA: string
  speakerB: string
}

const DIMENSIONS = ['aspirational', 'curious', 'personal', 'critical'] as const

function getDelta(a: number, b: number): { label: string; color: string } {
  const diff = b - a
  if (Math.abs(diff) < 3) return { label: '~', color: 'var(--text-muted)' }
  return diff > 0
    ? { label: `+${diff}%`, color: '#0f6b37' }
    : { label: `${diff}%`, color: '#dc2626' }
}

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
