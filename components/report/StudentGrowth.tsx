'use client'

import type { StudentGrowthSection } from '@/types'

interface Props {
  data: StudentGrowthSection
}

export function StudentGrowth({ data }: Props) {
  return (
    <section id="student-growth" className="space-y-5">
      <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[var(--text-primary)]">
        Student Growth
      </h2>
      <div className="h-0.5 w-10 bg-[var(--brand-orange)]" />

      {/* Narrative */}
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
        {data.narrative}
      </p>

      {/* Growth highlight cards */}
      {data.highlights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.highlights.map((h) => (
            <div
              key={h.studentName}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  {h.studentName}
                </h3>
                <span className="text-xs text-[var(--text-muted)] shrink-0">
                  {h.sessionsParticipated} session{h.sessionsParticipated !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {h.narrative}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
