/**
 * StudentGrowth — Narrative + highlight cards for student growth in the semester report.
 *
 * Renders a narrative paragraph followed by a grid of student growth highlight
 * cards. Each card shows the student name, an optional growth signal badge
 * (BRAND.PURPLE), session count, a narrative, and a thinking progression quote.
 *
 * Rendered by: app/(app)/reports/[id]/page.tsx (student growth section)
 * Data source: StudentGrowthSection from SemesterReport type
 */
'use client'

import type { StudentGrowthSection } from '@/types'

/**
 * Props for StudentGrowth.
 * @prop data - Student growth section with narrative and highlights array.
 */
/**
 * Defines the structure of properties accepted by the StudentGrowth component.
 * 1. What it does: Specifies the single `data` prop required by the `StudentGrowth` component.
 * 2. Why it is used: Ensures type safety and provides clear documentation for the expected input data, making the component easier to use and maintain.
 * 3. Important implementation details: The `data` property must conform to the `StudentGrowthSection` type, which includes a narrative string and an array of growth highlights.
 */
interface Props {
  data: StudentGrowthSection
}

/**
 * Renders a dedicated section displaying student growth information within a larger report.
 * 1. What it does: This component takes student growth data and presents it as a main narrative followed by individual highlight cards for specific students.
 * 2. Why it is used: To provide a clear, structured, and visually appealing summary of student growth, enabling users to quickly grasp overall progress and specific achievements.
 * 3. Important implementation details: It is a client-side component ('use client'). It uses Tailwind CSS for styling and conditionally renders the highlight cards only if there are growth highlights available in the provided data. Each highlight card includes the student's name, an optional growth signal, sessions participated, a specific narrative, and an optional thinking progression.
 */
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
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    {h.studentName}
                  </h3>
                  {h.growthSignal && (
                    <span className="inline-block px-2 py-0.5 text-[10px] rounded-full border bg-[#542785]/20 text-[#c9a0ff] border-[#542785]/40 font-medium">
                      {h.growthSignal}
                    </span>
                  )}
                </div>
                <span className="text-xs text-[var(--text-muted)] shrink-0">
                  {h.sessionsParticipated} session{h.sessionsParticipated !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {h.narrative}
              </p>
              {h.thinkingProgression && (
                <p className="text-[10px] text-[var(--text-muted)] italic mt-2 border-l-2 border-[#542785]/40 pl-2">
                  {h.thinkingProgression}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
