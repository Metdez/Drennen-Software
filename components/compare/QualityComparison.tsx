'use client'

import { useState } from 'react'
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
import type { SessionTierData } from '@/types'

interface QualityComparisonProps {
  tierDataA: SessionTierData | null
  tierDataB: SessionTierData | null
  speakerA: string
  speakerB: string
  onGenerate?: () => void
  isGenerating?: boolean
}

const TIER_LABELS: Record<string, string> = {
  '1': 'Tier 1 — Tension',
  '2': 'Tier 2 — Experience',
  '3': 'Tier 3 — Strategic',
  '4': 'Tier 4 — Generic',
}

export function QualityComparison({
  tierDataA,
  tierDataB,
  speakerA,
  speakerB,
  onGenerate,
  isGenerating,
}: QualityComparisonProps) {
  const [showDefinitions, setShowDefinitions] = useState(false)

  if (!tierDataA && !tierDataB) {
    if (onGenerate) {
      return (
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-sm text-[var(--text-muted)] mb-4 font-[family-name:var(--font-dm-sans)]">
            Tier quality data is not available for these sessions.
          </p>
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="px-6 py-2.5 rounded-full bg-[#f36f21] text-white text-sm font-semibold font-[family-name:var(--font-dm-sans)] hover:bg-[#e0611a] transition-colors disabled:opacity-50"
          >
            {isGenerating ? 'Generating...' : 'Generate Comparative Analysis'}
          </button>
        </div>
      )
    }
    return (
      <div className="py-16 text-center text-sm text-[var(--text-muted)] font-[family-name:var(--font-dm-sans)]">
        Tier quality data is not available for these sessions.
      </div>
    )
  }

  const countsA = tierDataA?.tierCounts ?? {}
  const countsB = tierDataB?.tierCounts ?? {}

  const chartData = ['1', '2', '3', '4'].map(tier => ({
    tier: `Tier ${tier}`,
    [speakerA]: countsA[tier] ?? 0,
    [speakerB]: countsB[tier] ?? 0,
  }))

  const tier1A = countsA['1'] ?? 0
  const tier1B = countsB['1'] ?? 0
  const diff = Math.abs(tier1A - tier1B)
  const leader = tier1A > tier1B ? speakerA : tier1B > tier1A ? speakerB : null

  return (
    <div className="space-y-6 font-[family-name:var(--font-dm-sans)]">
      {/* Chart */}
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="tier" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
            <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey={speakerA} fill="#f36f21" radius={[4, 4, 0, 0]} />
            <Bar dataKey={speakerB} fill="#542785" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Summary */}
      {leader && (
        <div className="px-4 py-3 rounded-xl" style={{ background: 'var(--surface-elevated)' }}>
          <p className="text-sm text-[var(--text-primary)]">
            <span className="font-semibold">{leader}</span> produced{' '}
            <span className="font-semibold">{diff}</span> more Tier 1 question{diff !== 1 ? 's' : ''} than{' '}
            {leader === speakerA ? speakerB : speakerA}.
          </p>
        </div>
      )}

      {/* Tier definitions toggle */}
      <button
        onClick={() => setShowDefinitions(!showDefinitions)}
        className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
      >
        {showDefinitions ? 'Hide' : 'Show'} tier definitions
      </button>
      {showDefinitions && (
        <div className="space-y-2 text-xs text-[var(--text-secondary)] leading-relaxed">
          {Object.entries(TIER_LABELS).map(([tier, label]) => (
            <div key={tier} className="flex gap-2">
              <span className="font-semibold shrink-0">{label}:</span>
              <span>
                {tier === '1' && 'Questions exposing real dilemmas, difficult decisions, or uncomfortable truths.'}
                {tier === '2' && 'Questions about a specific moment, turning point, failure, or decision.'}
                {tier === '3' && 'Questions about how they think, frameworks they use, industry lessons.'}
                {tier === '4' && 'Generic advice questions — "What advice would you give?"'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
