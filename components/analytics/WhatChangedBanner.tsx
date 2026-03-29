'use client'

import { useState, useEffect } from 'react'
import type { ClassInsights } from '@/types'

interface WhatChangedBannerProps {
  insights: ClassInsights
  semesterId: string | null
}

interface ThemeChange {
  type: 'rank_change' | 'new_theme' | 'quality_shift'
  text: string
}

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

function storeCurrentThemes(insights: ClassInsights, semesterId: string | null) {
  const storageKey = `analytics_prev_themes_${semesterId ?? 'all'}`
  const data = insights.topThemes.map((t, i) => ({
    title: t.title,
    rank: i + 1,
    qualityDirection: insights.qualityTrend.direction,
  }))
  localStorage.setItem(storageKey, JSON.stringify(data))
}

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
