'use client';

import { useState } from 'react';
import type { Entity, AnalysisVerdict, Verdict } from '@/lib/types/database';

// ─── Props ────────────────────────────────────────────────────────────────────

interface VerdictCardProps {
  verdict: AnalysisVerdict | null;
  entity: Entity;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VERDICT_CSS_VAR_MAP: Record<Verdict, string> = {
  donor_captured: 'var(--verdict-captured)',
  partially_captured: 'var(--verdict-partial)',
  mostly_independent: 'var(--verdict-mostly-independent)',
  independent: 'var(--verdict-independent)',
};

function verdictLabel(v: Verdict): string {
  return v
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function confidenceLabel(score: number): string {
  if (score >= 0.8) return 'High confidence';
  if (score >= 0.5) return 'Moderate confidence';
  return 'Low confidence';
}

function firstSentence(text: string): string {
  const match = text.match(/^[^.!?]*[.!?]/);
  return match ? match[0] : text;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VerdictCard({ verdict, entity }: VerdictCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  // ── Null state ────────────────────────────────────────────────────────────

  if (!verdict) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-700 bg-gray-900/50 p-6">
        <h3 className="text-lg font-semibold text-gray-400">Analysis Pending</h3>
        <p className="mt-1 text-sm text-gray-500">
          AI analysis has not yet been run for {entity.name}.
        </p>
      </div>
    );
  }

  // ── Derived values ────────────────────────────────────────────────────────

  const color = VERDICT_CSS_VAR_MAP[verdict.verdict];
  const label = verdictLabel(verdict.verdict);
  const confidence = verdict.confidence ?? 0;
  const confLabel = confidenceLabel(confidence);
  const teaser = verdict.rationale ? firstSentence(verdict.rationale) : null;

  // Parse key_evidence arrays
  const evidence = verdict.key_evidence as
    | { supporting?: string[]; contradicting?: string[] }
    | null;
  const supporting = evidence?.supporting ?? [];
  const contradicting = evidence?.contradicting ?? [];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="rounded-xl bg-gray-900 p-6"
      style={{ borderLeft: `4px solid ${color}` }}
    >
      {/* Accessible verdict announcement */}
      <div role="status" aria-live="polite" className="sr-only">
        Verdict: {label}. {confLabel} ({Math.round(confidence * 100)}%).{' '}
        {teaser ?? ''}
      </div>

      {/* Level 1 — Summary (always visible) */}
      <div
        className="mb-4 inline-block rounded-md px-4 py-2 text-lg font-bold"
        style={{ backgroundColor: color, color: '#111' }}
        aria-hidden="true"
      >
        {label}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <span className="text-sm font-medium text-gray-300">{confLabel}</span>
        <span className="text-xs text-gray-500">
          ({Math.round(confidence * 100)}%)
        </span>
      </div>

      {/* Confidence progress bar */}
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-800">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${confidence * 100}%`, backgroundColor: color }}
        />
      </div>

      {teaser && (
        <p className="mt-4 text-sm leading-relaxed text-gray-300">{teaser}</p>
      )}

      {/* Level 2 toggle */}
      <button
        onClick={() => setShowDetails((prev) => !prev)}
        className="mt-4 text-sm font-medium text-blue-400 hover:text-blue-300"
        aria-expanded={showDetails}
        aria-controls="verdict-details"
      >
        {showDetails ? 'Hide Details' : 'Show Details'}
      </button>

      {/* Level 2 — Detail */}
      {showDetails && (
        <div id="verdict-details" className="mt-4 space-y-4 border-t border-gray-800 pt-4">
          {/* Full rationale */}
          {verdict.rationale && (
            <div className="space-y-2">
              {verdict.rationale.split('\n\n').map((para, i) => (
                <p key={i} className="text-sm leading-relaxed text-gray-300">
                  {para}
                </p>
              ))}
            </div>
          )}

          {/* Evidence lists */}
          {(supporting.length > 0 || contradicting.length > 0) && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Key Evidence
              </h4>

              {supporting.map((item, i) => (
                <div key={`s-${i}`} className="flex items-start gap-2">
                  <svg
                    className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-sm text-gray-300">{item}</span>
                </div>
              ))}

              {contradicting.map((item, i) => (
                <div key={`c-${i}`} className="flex items-start gap-2">
                  <svg
                    className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  <span className="text-sm text-gray-300">{item}</span>
                </div>
              ))}
            </div>
          )}

          {/* Last analyzed */}
          <p className="text-xs text-gray-600">
            Last analyzed: {formatDate(verdict.last_analyzed)}
          </p>

          {/* Level 3 toggle */}
          <button
            onClick={() => setShowRaw((prev) => !prev)}
            className="text-sm font-medium text-blue-400 hover:text-blue-300"
            aria-expanded={showRaw}
            aria-controls="verdict-raw-data"
          >
            {showRaw ? 'Hide Raw Data' : 'Show Raw Data'}
          </button>

          {/* Level 3 — Deep */}
          {showRaw && (
            <div id="verdict-raw-data" className="space-y-2">
              <pre className="overflow-x-auto rounded-lg bg-gray-950 p-4 text-xs text-gray-400">
                <code>{JSON.stringify(verdict.key_evidence, null, 2)}</code>
              </pre>
              <p className="text-xs italic text-gray-600">
                This analysis is AI-generated. Verify with primary sources.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
