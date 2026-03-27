'use client'

import type { SemesterGlanceSection } from '@/types'
import { BRAND } from '@/lib/constants'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface Props {
  data: SemesterGlanceSection
}

export function SemesterGlance({ data }: Props) {
  const stats = [
    { label: 'Sessions', value: String(data.totalSessions) },
    { label: 'Submissions', value: String(data.totalSubmissions) },
    { label: 'Students', value: String(data.totalStudents) },
    { label: 'Avg / Session', value: data.avgSubmissionsPerSession.toFixed(1) },
  ]

  const timelineData = data.sessionsOverTime.map((s) => ({
    name: s.speakerName.length > 12 ? s.speakerName.slice(0, 12) + '...' : s.speakerName,
    fullName: s.speakerName,
    submissions: s.submissionCount,
    date: new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }))

  const tierEntries = Object.entries(data.tierDistribution).sort(([a], [b]) => a.localeCompare(b))
  const tierTotal = tierEntries.reduce((sum, [, v]) => sum + v, 0)

  return (
    <section id="semester-at-a-glance" className="space-y-5">
      <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[var(--text-primary)]">
        Semester at a Glance
      </h2>
      <div className="h-0.5 w-10 bg-[var(--brand-orange)]" />

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3 text-center"
          >
            <div className="text-xl font-bold text-[var(--text-primary)]">{s.value}</div>
            <div className="text-xs text-[var(--text-muted)] mt-1 uppercase tracking-wide">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Submissions over time bar chart */}
      {timelineData.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Submissions Over Time</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timelineData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
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
                <Bar dataKey="submissions" radius={[4, 4, 0, 0]}>
                  {timelineData.map((_, index) => (
                    <Cell key={index} fill={BRAND.ORANGE} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tier distribution */}
      {tierEntries.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Tier Distribution</h3>
          <div className="space-y-3">
            {tierEntries.map(([tier, count]) => {
              const pct = tierTotal > 0 ? Math.round((count / tierTotal) * 100) : 0
              return (
                <div key={tier}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-[var(--text-primary)] font-medium">{tier}</span>
                    <span className="text-[var(--text-muted)]">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-[var(--surface-elevated)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: BRAND.PURPLE }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
