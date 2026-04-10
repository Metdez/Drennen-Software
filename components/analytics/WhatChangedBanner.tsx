/**
 * WhatChangedBanner — "What's New since your last visit" diff banner.
 *
 * Compares the current ClassInsights snapshot against the previous visit state
 * stored in localStorage and surfaces notable changes: new themes, theme rank
 * shifts, and quality trend changes. The banner is hidden once dismissed and
 * only re-appears on subsequent visits when new insights are generated.
 *
 * localStorage keys used:
 *   - `analytics_prev_themes_<semesterId|all>` — previous theme snapshot
 *   - `analytics_last_visit_<semesterId|all>`  — timestamp of last dismissal
 *
 * Rendered by: app/(app)/analytics/page.tsx (top of page, above analytics cards)
 */
'use client'

import { useState, useEffect } from 'react'
import type { ClassInsights } from '@/types'

/**
 * Props for WhatChangedBanner.
 * @prop insights    - Current class insights snapshot.
 * @prop semesterId  - Active semester filter (null = all sessions).
 *                    Used to namespace localStorage keys per semester.
 */
/**
 * Defines the props interface for the WhatChangedBanner component.
 *
 * What it does: Specifies the data required to render the WhatChangedBanner, including the current analytics insights and the active semester context.
 * Why it is used: To ensure type safety and clarity for the data passed into the component, making it easier to understand and maintain the component's API.
 * Important implementation details:
 * - `insights`: An object containing the current snapshot of class analytics, including top themes and quality trends. This is the primary data source for comparison.
 * - `semesterId`: A string representing the ID of the currently active semester filter, or `null` if all sessions are being considered. This ID is crucial for namespacing `localStorage` keys, ensuring that comparisons are made against data relevant to the selected semester.
 */
interface WhatChangedBannerProps {
  insights: ClassInsights
  semesterId: string | null
}

/** A single detected change between the current and previous analytics snapshot. */
/**
 * Represents a single detected change within the class analytics between two snapshots.
 *
 * What it does: Provides a structured format for describing an observed change, categorizing its type and providing a human-readable text description.
 * Why it is used: To standardize the representation of various types of changes (e.g., new themes, rank shifts, quality trend changes), allowing for consistent processing and display within the banner.
 * Important implementation details:
 * - `type`: A discriminant union type (`'rank_change' | 'new_theme' | 'quality_shift'`) that categorizes the nature of the detected change. This allows for potential future enhancements like different styling or specific actions based on the change type.
 * - `text`: A string containing a user-friendly description of the change, suitable for direct rendering in the UI. It often includes details about specific themes or trends.
 */
interface ThemeChange {
  type: 'rank_change' | 'new_theme' | 'quality_shift'
  text: string
}

/**
 * Computes the diff between the current insights and the previous visit snapshot
 * stored in localStorage. Returns an empty array if no prior state is found.
 * Catches JSON parse errors silently (corrupted storage).
 */
/**
 * Compares the current class insights with a previously stored snapshot from `localStorage` to identify significant changes.
 *
 * What it does: This function performs the core logic of detecting differences in class analytics, such as new themes emerging, changes in theme ranks, or shifts in the overall quality trend.
 * Why it is used: To generate a list of actionable insights for the user, informing them about what has updated in their class's performance since their last visit, which is then displayed by the `WhatChangedBanner`.
 * Important implementation details:
 * - Retrieves the previous state from `localStorage` using a key that is scoped by the `semesterId` (or 'all' for an unfiltered view) to prevent data mix-ups across different semesters.
 * - Gracefully handles potential `JSON.parse` errors if the stored data in `localStorage` is corrupted, returning an empty array of changes silently.
 * - Identifies 'new_theme' changes by filtering `insights.topThemes` where `isNew` is true.
 * - Detects 'rank_change' for the top 5 themes by comparing their current rank with their rank in the previous snapshot.
 * - Identifies 'quality_shift' if the `qualityTrend.direction` differs from the previously stored quality direction.
 * - Returns an array of `ThemeChange` objects, which are then used to populate the banner.
 */
function computeChanges(insights: ClassInsights, semesterId: string | null): ThemeChange[] {
  const storageKey = `analytics_prev_themes_${semesterId ?? 'all'}`
  const prevRaw = localStorage.getItem(storageKey)
  const changes: ThemeChange[] = []

  if (!prevRaw) return changes

  try {
    const prev = JSON.parse(prevRaw) as Array<{ title: string; rank: number; qualityDirection: string }>

    const prevMap = new Map(prev.map(t => [t.title.toLowerCase(), t]))

    // Check for new themes
    const newThemes = insights.topThemes.filter(t => t.isNew)
    if (newThemes.length > 0) {
      changes.push({
        type: 'new_theme',
        text: `${newThemes.length} new theme${newThemes.length > 1 ? 's' : ''} emerged: ${newThemes.map(t => t.title).join(', ')}`,
      })
    }

    // Check for rank changes in top 5
    for (let i = 0; i < Math.min(5, insights.topThemes.length); i++) {
      const theme = insights.topThemes[i]
      const prevEntry = prevMap.get(theme.title.toLowerCase())
      if (prevEntry && prevEntry.rank !== i + 1) {
        const direction = prevEntry.rank > i + 1 ? 'jumped' : 'dropped'
        changes.push({
          type: 'rank_change',
          text: `"${theme.title}" ${direction} from #${prevEntry.rank} to #${i + 1}`,
        })
      }
    }

    // Check quality trend shift
    const prevQuality = prev[0]?.qualityDirection
    if (prevQuality && prevQuality !== insights.qualityTrend.direction) {
      changes.push({
        type: 'quality_shift',
        text: `Quality trend shifted to ${insights.qualityTrend.direction}`,
      })
    }
  } catch {
    // Corrupted localStorage — skip
  }

  return changes
}

/**
 * Saves a snapshot of the current class insights' top themes and overall quality direction to `localStorage`.
 *
 * What it does: Persists a simplified version of the current analytics state for future comparisons. This snapshot serves as the 'previous visit' data point for the `computeChanges` function.
 * Why it is used: To enable the detection of changes across user sessions. Without storing the current state, there would be no baseline to compare against during subsequent visits.
 * Important implementation details:
 * - Constructs a `storageKey` that is namespaced by the `semesterId` (or 'all' if `semesterId` is `null`), ensuring that the stored data is relevant to the active context.
 * - Maps `insights.topThemes` to an array of objects containing only `title`, `rank` (calculated from index), and `qualityDirection`, as these are the relevant fields for change detection.
 * - Converts the data array into a JSON string before storing it in `localStorage`. This ensures that complex objects can be correctly saved and retrieved.
 */
function storeCurrentThemes(insights: ClassInsights, semesterId: string | null) {
  const storageKey = `analytics_prev_themes_${semesterId ?? 'all'}`
  const data = insights.topThemes.map((t, i) => ({
    title: t.title,
    rank: i + 1,
    qualityDirection: insights.qualityTrend.direction,
  }))
  localStorage.setItem(storageKey, JSON.stringify(data))
}

/**
 * A React functional component that displays a banner notifying users about significant changes in class analytics since their last visit.
 *
 * What it does: Renders a dynamic notification banner that lists detected changes in class themes, ranks, or overall quality trends. It manages its own visibility based on new insights and user dismissal.
 * Why it is used: To provide a proactive and concise summary of updates within the class analytics dashboard, enhancing user engagement and helping users quickly grasp key developments without manually comparing data.
 * Important implementation details:
 * - Marked with `'use client'` to indicate it's a client-side component, leveraging browser APIs like `localStorage`.
 * - Uses `useState` hooks to manage `changes` (the list of detected updates) and `dismissed` (whether the banner has been manually hidden by the user).
 * - Employs a `useEffect` hook to: 
 *   - Determine if the current `insights` are newer than the `analytics_last_visit_` timestamp stored in `localStorage`.
 *   - Call `computeChanges` to detect updates only if new insights are available or no previous visit timestamp exists.
 *   - Call `storeCurrentThemes` to save the current state for future comparisons, ensuring this runs after every relevant update.
 * - The `handleDismiss` function sets `dismissed` to true and updates the `analytics_last_visit_` timestamp in `localStorage` to the current time, preventing the banner from reappearing until genuinely new insights are generated.
 * - Renders `null` if the banner is `dismissed` or if `changes.length` is zero, effectively hiding itself.
 * - Formats the displayed changes, bolding theme titles for readability, and includes a simple dismiss button for user control.
 */
export function WhatChangedBanner({ insights, semesterId }: WhatChangedBannerProps) {
  const [changes, setChanges] = useState<ThemeChange[]>([])
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const visitKey = `analytics_last_visit_${semesterId ?? 'all'}`
    const lastVisit = localStorage.getItem(visitKey)
    const insightsTime = new Date(insights.generatedAt).getTime()

    if (!lastVisit || insightsTime > parseInt(lastVisit, 10)) {
      const computed = computeChanges(insights, semesterId)
      setChanges(computed)
    }

    // Store current themes for next comparison
    storeCurrentThemes(insights, semesterId)
  }, [insights, semesterId])

  const handleDismiss = () => {
    setDismissed(true)
    const visitKey = `analytics_last_visit_${semesterId ?? 'all'}`
    localStorage.setItem(visitKey, String(Date.now()))
  }

  if (dismissed || changes.length === 0) return null

  return (
    <div className="bg-[rgba(255,107,0,0.08)] border border-[rgba(255,107,0,0.2)] rounded-xl p-[14px_18px] mb-7">
      <div className="text-xs font-bold text-[var(--brand-orange)] mb-1.5 flex items-center gap-1.5">
        <span>✦</span> What&apos;s New — since your last visit
      </div>
      <ul className="list-none p-0">
        {changes.map((c, i) => (
          <li key={i} className="text-[13px] text-[var(--text-secondary)] py-0.5 flex items-center gap-1.5">
            <span className="text-[var(--brand-orange)] text-[11px]">→</span>
            <span dangerouslySetInnerHTML={{ __html: c.text.replace(/"([^"]+)"/g, '<strong>$1</strong>') }} />
          </li>
        ))}
      </ul>
      <button
        onClick={handleDismiss}
        className="text-[11px] text-[var(--text-muted)] mt-2 hover:text-[var(--text-secondary)] transition-colors bg-transparent border-none cursor-pointer"
      >
        Dismiss
      </button>
    </div>
  )
}
