'use client'

import type { SessionSummariesSection } from '@/types'

interface Props {
  data: SessionSummariesSection
}

export function SessionSummaries({ data }: Props) {
  return (
    <section id="session-summaries" className="space-y-5">
      <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[var(--text-primary)]">
        Session Summaries
      </h2>
      <div className="h-0.5 w-10 bg-[var(--brand-orange)]" />

      <div className="space-y-3">
        {data.sessions.map((s) => (
          <div
            key={s.sessionId}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <h3 className="text-base font-semibold text-[var(--text-primary)]">
                  {s.speakerName}
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  {new Date(s.date).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                  <span className="mx-2 opacity-40">&middot;</span>
                  {s.fileCount} {s.fileCount === 1 ? 'submission' : 'submissions'}
                </p>
              </div>
              {s.debriefRating != null && (
                <div className="shrink-0 text-right">
                  <div className="text-lg font-bold text-[var(--brand-orange)]">
                    {s.debriefRating}/5
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">debrief</div>
                </div>
              )}
            </div>

            {/* Theme pills */}
            {s.themes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {s.themes.map((theme) => (
                  <span
                    key={theme}
                    className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border"
                    style={{
                      background: 'rgba(255,107,0,0.1)',
                      borderColor: 'rgba(255,107,0,0.2)',
                      color: '#fb923c',
                    }}
                  >
                    {theme}
                  </span>
                ))}
              </div>
            )}

            {/* Debrief highlights */}
            {s.debriefHighlights && (
              <p className="text-xs text-[var(--text-secondary)] mt-3 italic leading-relaxed">
                {s.debriefHighlights}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
