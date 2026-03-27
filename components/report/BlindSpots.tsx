'use client'

import type { BlindSpotsSection } from '@/types'

interface Props {
  data: BlindSpotsSection
}

export function BlindSpots({ data }: Props) {
  return (
    <section id="blind-spots" className="space-y-5">
      <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-[var(--text-primary)]">
        Blind Spots
      </h2>
      <div className="h-0.5 w-10 bg-[var(--brand-orange)]" />

      {/* Blind spot cards */}
      {data.blindSpots.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.blindSpots.map((spot, i) => (
            <div
              key={i}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm"
            >
              <div className="flex items-start gap-2 mb-2">
                <span className="text-[var(--brand-purple)] mt-0.5 shrink-0 text-sm">&#9888;</span>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">{spot.title}</h3>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {spot.description}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Recommendations</h3>
          <div className="space-y-3">
            {data.recommendations.map((rec, i) => (
              <div
                key={i}
                className="flex items-start gap-3 pb-3 border-b border-[var(--border)] last:border-0 last:pb-0"
              >
                <span className="text-[var(--brand-green)] font-bold text-sm shrink-0 mt-0.5">
                  {i + 1}.
                </span>
                <div>
                  <p className="text-sm text-[var(--text-primary)] font-medium">{rec.text}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{rec.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
