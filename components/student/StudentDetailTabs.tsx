'use client'

/**
 * StudentDetailTabs — Three-tab shell (Profile / Growth / Submissions) for the student detail page.
 *
 * Manages the active tab in local state. Only the active tab's content is mounted;
 * inactive tabs are not rendered (lazy mounting). Passes studentName and sessions
 * down to each tab component.
 *
 * Rendered by: app/(app)/roster/[studentName]/page.tsx,
 *              app/(public)/portfolio/[token]/roster/[studentName]/page.tsx
 * Calls: None (delegates to StudentProfileTab, StudentGrowthTab, StudentSessionCard)
 */

import { useState } from 'react'
import { StudentSessionCard } from '@/components/session/StudentSessionCard'
import { StudentProfileTab } from '@/components/student/StudentProfileTab'
import { StudentGrowthTab } from '@/components/student/StudentGrowthTab'
import type { SessionWithSubmission } from '@/types'

type Tab = 'profile' | 'growth' | 'submissions'

/**
 * Describes the tabs available inside a selected student's detail view.
 * This layout mirrors the journey from the roster into the student profile,
 * growth+notes workspace, and the reflection/submission stream so that each
 * panel can reach back to the same `studentName` and `sessions` data pulled
 * when the roster row is clicked.
 */
const tabs: { key: Tab; label: string }[] = [
  { key: 'profile', label: 'Profile' },
  { key: 'growth', label: 'Growth' },
  { key: 'submissions', label: 'Submissions' },
]

interface Props {
  studentName: string
  sessions: SessionWithSubmission[]
}

/**
 * Bridges the roster selection to the student detail surface.
 * The same `studentName` used here feeds the profile and growth tabs (alongside the shared notes editor)
 * while the `sessions` list powers the submissions feed and reflection/analysis badges that the roster hints at.
 */
export function StudentDetailTabs({ studentName, sessions }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('profile')

  return (
    <>
      {/* Tab bar */}
      <div className="border-b border-[var(--border-accent)] mb-6 animate-fade-up">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-2.5 text-sm font-medium font-[family-name:var(--font-dm-sans)] border-b-2 -mb-px transition-colors duration-200 ${
                activeTab === tab.key
                  ? 'text-[#f36f21] border-[#f36f21]'
                  : 'text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.label}
              {tab.key === 'submissions' && (
                <span className="ml-1.5 text-xs opacity-60">
                  ({sessions.length})
                  {/* Sessions drive reflections + analyses badges so the tab can show how many files produced reflections */}
                  {sessions.some(s => s.debriefText) && (
                    <span className="ml-1 text-[#542785]">
                      + {sessions.filter(s => s.debriefText).length} reflections
                    </span>
                  )}
                  {sessions.some(s => s.speakerAnalysisText) && (
                    <span className="ml-1 text-[#0f6b37]">
                      + {sessions.filter(s => s.speakerAnalysisText).length} analyses
                    </span>
                  )}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab panels */}
      {activeTab === 'profile' && (
        <StudentProfileTab studentName={studentName} />
      )}

      {activeTab === 'growth' && (
        <StudentGrowthTab studentName={studentName} />
      )}

      {activeTab === 'submissions' && (
        <div className="flex flex-col gap-4 animate-fade-up">
          {sessions.map((session) => (
            <StudentSessionCard key={session.sessionId} session={session} />
          ))}
        </div>
      )}
    </>
  )
}
