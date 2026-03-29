'use client'

import { Card } from '@/components/ui/Card'
import type { GrowthIntelligence } from '@/types'

function TagPill({ label, variant = 'purple' }: { label: string; variant?: 'purple' | 'orange' | 'green' }) {
  const colors = {
    purple: 'bg-[#542785]/20 text-[#c9a0ff] border-[#542785]/40',
    orange: 'bg-[#f36f21]/20 text-[#f36f21] border-[#f36f21]/40',
    green: 'bg-[#0f6b37]/20 text-[#4ae168] border-[#0f6b37]/40',
  }
  return (
    <span className={`inline-block px-2.5 py-0.5 text-[11px] font-medium tracking-wide rounded-full border ${colors[variant]} font-[family-name:var(--font-dm-sans)]`}>
      {label}
    </span>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-widest font-[family-name:var(--font-dm-sans)]">
      {children}
    </h4>
  )
}

function ObservationList({ items }: { items: string[] }) {
  if (!items?.length) return null
  return (
    <ul className="space-y-2 mt-3">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-sm text-[var(--text-secondary)] font-[family-name:var(--font-dm-sans)] leading-snug">
          <span className="text-[#f36f21] shrink-0 opacity-80 pt-0.5 text-xs">&#x25B8;</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function StatusPill({ label, variant }: { label: string; variant: 'green' | 'purple' | 'orange' | 'muted' }) {
  const colors = {
    green: 'text-[#4ae168] bg-[#0f6b37]/20 border border-[#0f6b37]/40',
    purple: 'text-[#c9a0ff] bg-[#542785]/20 border border-[#542785]/40',
    orange: 'text-[#f36f21] bg-[#f36f21]/20 border border-[#f36f21]/40',
    muted: 'text-[var(--text-muted)] bg-[var(--surface-elevated)] border border-[var(--border-accent)]',
  }
  return <span className={`px-2 py-0.5 rounded text-[11px] font-bold tracking-wide ${colors[variant]} font-[family-name:var(--font-dm-sans)]`}>{label}</span>
}

function coherenceVariant(label: string): 'green' | 'purple' | 'orange' | 'muted' {
  switch (label.toLowerCase()) {
    case 'focused': return 'green'
    case 'converging': return 'green'
    case 'broadening': return 'purple'
    case 'scattered': return 'orange'
    default: return 'muted'
  }
}

function consistencyVariant(label: string): 'green' | 'purple' | 'orange' | 'muted' {
  switch (label.toLowerCase()) {
    case 'steady': return 'green'
    case 'improving': return 'green'
    case 'declining': return 'orange'
    case 'sporadic': return 'orange'
    default: return 'muted'
  }
}

function depthVariant(label: string): 'green' | 'purple' | 'orange' | 'muted' {
  switch (label.toLowerCase()) {
    case 'deepening': return 'green'
    case 'stable': return 'purple'
    case 'thinning': return 'orange'
    default: return 'muted'
  }
}

interface Props {
  growth: GrowthIntelligence
}

export function GrowthIntelligencePanel({ growth }: Props) {
  return (
    <div className="space-y-6 animate-fade-up">

      {/* AI Recommendations - Top Priority */}
      {growth.aiRecommendations.length > 0 && (
        <Card padding="md" elevated className="border-[#f36f21]/20 bg-[#f36f21]/5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f36f21" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
            <h3 className="text-sm font-bold text-[#f36f21] uppercase tracking-widest font-[family-name:var(--font-dm-sans)]">
              Core Actionable Insights
            </h3>
          </div>
          <ul className="space-y-3">
            {growth.aiRecommendations.map((rec, i) => (
              <li key={i} className="flex gap-3 text-sm text-[var(--text-primary)] font-[family-name:var(--font-dm-sans)]">
                <span className="text-[#f36f21] shrink-0 text-lg leading-none mt-0.5">&#x2022;</span>
                <span className="leading-snug font-medium text-[var(--text-primary)]">{rec}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* 2x2 Grid for Growth Dimensions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Thinking Sophistication */}
        <Card padding="md" elevated className="flex flex-col">
          <div className="flex justify-between items-start mb-1">
            <SectionLabel>Thinking Sophistication</SectionLabel>
            <StatusPill label={growth.thinkingArc.currentPhase} variant="purple" />
          </div>
          <ObservationList items={growth.thinkingArc.observations} />
          {growth.thinkingArc.evidenceHighlights.length > 0 && (
            <div className="mt-auto pt-4 space-y-2 mt-4 border-t border-[var(--border-accent)]">
              <span className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-bold">Evidence</span>
              {growth.thinkingArc.evidenceHighlights.map((evidence, i) => (
                <div key={i} className="text-xs text-[var(--text-secondary)] italic border-l-2 border-[#542785]/40 pl-3">
                  &ldquo;{evidence}&rdquo;
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Theme Evolution */}
        <Card padding="md" elevated className="flex flex-col">
          <div className="flex justify-between items-start mb-1">
            <SectionLabel>Theme Evolution</SectionLabel>
            <StatusPill
              label={growth.themeEvolution.coherenceLabel.toUpperCase()}
              variant={coherenceVariant(growth.themeEvolution.coherenceLabel)}
            />
          </div>
          <ObservationList items={growth.themeEvolution.observations} />
          {growth.themeEvolution.recurringThreads.length > 0 && (
            <div className="mt-auto pt-4 mt-4 border-t border-[var(--border-accent)] flex flex-wrap gap-2">
              <span className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-bold block w-full mb-1">Key Threads</span>
              {growth.themeEvolution.recurringThreads.map((thread) => (
                <TagPill key={thread} label={thread} variant="purple" />
              ))}
            </div>
          )}
        </Card>

        {/* Critical Thinking */}
        <Card padding="md" elevated className="flex flex-col">
          <div className="flex justify-between items-start mb-1">
            <SectionLabel>Critical Thinking</SectionLabel>
            <StatusPill label={growth.criticalThinking.currentLevel} variant="purple" />
          </div>
          <ObservationList items={growth.criticalThinking.observations} />
          <div className="mt-auto pt-4 mt-4 border-t border-[var(--border-accent)] flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[var(--text-muted)] uppercase tracking-widest text-[10px] font-bold">Strongest Domain</span>
              <span className="text-[#4ae168] bg-[#0f6b37]/10 border border-[#0f6b37]/30 px-2 py-0.5 rounded font-medium">{growth.criticalThinking.strongestArea}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[var(--text-muted)] uppercase tracking-widest text-[10px] font-bold">Growth Edge</span>
              <span className="text-[#f36f21] bg-[#f36f21]/10 border border-[#f36f21]/30 px-2 py-0.5 rounded font-medium">{growth.criticalThinking.growthEdge}</span>
            </div>
          </div>
        </Card>

        {/* Engagement Pattern */}
        <Card padding="md" elevated className="flex flex-col">
          <div className="flex justify-between items-start mb-1">
            <SectionLabel>Engagement Pattern</SectionLabel>
            <div className="flex items-center gap-1.5">
              <StatusPill
                label={growth.engagementPattern.consistencyLabel.toUpperCase()}
                variant={consistencyVariant(growth.engagementPattern.consistencyLabel)}
              />
              <span className="text-[var(--text-muted)] opacity-50">+</span>
              <StatusPill
                label={growth.engagementPattern.depthTrend.toUpperCase()}
                variant={depthVariant(growth.engagementPattern.depthTrend)}
              />
            </div>
          </div>
          <ObservationList items={growth.engagementPattern.observations} />
        </Card>

      </div>
    </div>
  )
}
