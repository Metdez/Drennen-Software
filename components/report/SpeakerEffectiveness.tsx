'use client'

import type { SpeakerEffectivenessSection } from '@/types'
import { BRAND } from '@/lib/constants'

interface Props {
  data: SpeakerEffectivenessSection
}

export function SpeakerEffectiveness({ data }: Props) {
  return (
    <section id="speaker-effectiveness" className="space-y-5">
      <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[var(--text-primary)]">
        Speaker Effectiveness
      </h2>
      <div className="h-0.5 w-10 bg-[var(--brand-orange)]" />

      {/* Narrative */}
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
        {data.narrative}
      </p>

      {/* Rankings table */}
      {data.rankings.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Speaker Rankings</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left py-2 pr-4 text-xs text-[var(--text-muted)] uppercase tracking-wide font-medium">
                    #
                  </th>
                  <th className="text-left py-2 pr-4 text-xs text-[var(--text-muted)] uppercase tracking-wide font-medium">
                    Speaker
                  </th>
                  <th className="text-center py-2 px-4 text-xs text-[var(--text-muted)] uppercase tracking-wide font-medium">
                    Date
                  </th>
                  <th className="text-center py-2 px-4 text-xs text-[var(--text-muted)] uppercase tracking-wide font-medium">
                    Submissions
                  </th>
                  <th className="text-center py-2 px-4 text-xs text-[var(--text-muted)] uppercase tracking-wide font-medium">
                    Avg Tier
                  </th>
                  <th className="text-center py-2 pl-4 text-xs text-[var(--text-muted)] uppercase tracking-wide font-medium">
                    Debrief
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.rankings.map((r, i) => (
                  <tr key={r.sessionId} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-2.5 pr-4 text-[var(--text-muted)] font-medium">
                      {i + 1}
                    </td>
                    <td className="py-2.5 pr-4 text-[var(--text-primary)] font-medium">
                      {r.speakerName}
                    </td>
                    <td className="py-2.5 px-4 text-center text-[var(--text-muted)] text-xs">
                      {new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="py-2.5 px-4 text-center text-[var(--text-secondary)]">
                      {r.submissionCount}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {r.avgTier != null ? (
                        <span className="font-semibold" style={{ color: BRAND.PURPLE }}>
                          {r.avgTier.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-[var(--text-muted)]">&mdash;</span>
                      )}
                    </td>
                    <td className="py-2.5 pl-4 text-center">
                      {r.debriefRating != null ? (
                        <span className="font-semibold" style={{ color: BRAND.ORANGE }}>
                          {r.debriefRating}/5
                        </span>
                      ) : (
                        <span className="text-[var(--text-muted)]">&mdash;</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}
