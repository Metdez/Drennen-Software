'use client';

import { useState, useMemo } from 'react';
import type { PolicyPaper } from '@/lib/types/database';

interface PolicyTimelineProps {
  papers: PolicyPaper[];
}

function getAlignmentColor(score: number): string {
  if (score <= 0.3) return '#22c55e'; // green — independent
  if (score <= 0.6) return '#f59e0b'; // amber — moderate
  return '#ef4444'; // red — aligned
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Unknown date';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function PolicyTimeline({ papers }: PolicyTimelineProps) {
  const [activeTopics, setActiveTopics] = useState<Set<string>>(new Set());
  const [alignmentRange, setAlignmentRange] = useState<[number, number]>([0, 1]);
  const [expandedPaperId, setExpandedPaperId] = useState<string | null>(null);

  // Deduplicated topic tags across all papers
  const allTopics = useMemo(() => {
    const tags = new Set<string>();
    for (const paper of papers) {
      if (paper.topic_tags) {
        for (const tag of paper.topic_tags) {
          tags.add(tag);
        }
      }
    }
    return Array.from(tags).sort();
  }, [papers]);

  // Filter and sort papers
  const filteredPapers = useMemo(() => {
    return papers
      .filter((paper) => {
        const score = paper.donor_alignment_score ?? 0;
        if (score < alignmentRange[0] || score > alignmentRange[1]) return false;

        if (activeTopics.size > 0) {
          const paperTags = paper.topic_tags ?? [];
          const hasMatch = paperTags.some((tag) => activeTopics.has(tag));
          if (!hasMatch) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const dateA = a.published_date ? new Date(a.published_date).getTime() : 0;
        const dateB = b.published_date ? new Date(b.published_date).getTime() : 0;
        return dateB - dateA; // newest first
      });
  }, [papers, activeTopics, alignmentRange]);

  function toggleTopic(topic: string) {
    setActiveTopics((prev) => {
      const next = new Set(prev);
      if (next.has(topic)) {
        next.delete(topic);
      } else {
        next.add(topic);
      }
      return next;
    });
  }

  function toggleExpanded(paperId: string) {
    setExpandedPaperId((prev) => (prev === paperId ? null : paperId));
  }

  return (
    <div className="w-full">
      {/* ── Filter Bar ── */}
      <div className="mb-6 space-y-4 rounded-lg border border-gray-700 bg-gray-900/50 p-4">
        {/* Topic filter pills */}
        {allTopics.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium text-gray-400">Filter by topic</p>
            <div className="flex flex-wrap gap-2">
              {allTopics.map((topic) => {
                const isActive = activeTopics.has(topic);
                return (
                  <button
                    key={topic}
                    onClick={() => toggleTopic(topic)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-600 text-gray-300 hover:border-gray-400 hover:text-white'
                    }`}
                  >
                    {topic}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Alignment score range */}
        <div>
          <p className="mb-2 text-sm font-medium text-gray-400">Alignment score range</p>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1 text-xs text-gray-400">
              Min
              <input
                type="number"
                min={0}
                max={1}
                step={0.1}
                value={alignmentRange[0]}
                onChange={(e) => {
                  const val = Math.min(Math.max(0, parseFloat(e.target.value) || 0), alignmentRange[1]);
                  setAlignmentRange([val, alignmentRange[1]]);
                }}
                className="w-16 rounded border border-gray-600 bg-gray-800 px-2 py-1 text-sm text-white"
              />
            </label>
            <span className="text-gray-500">–</span>
            <label className="flex items-center gap-1 text-xs text-gray-400">
              Max
              <input
                type="number"
                min={0}
                max={1}
                step={0.1}
                value={alignmentRange[1]}
                onChange={(e) => {
                  const val = Math.max(Math.min(1, parseFloat(e.target.value) || 1), alignmentRange[0]);
                  setAlignmentRange([alignmentRange[0], val]);
                }}
                className="w-16 rounded border border-gray-600 bg-gray-800 px-2 py-1 text-sm text-white"
              />
            </label>
          </div>
        </div>
      </div>

      {/* ── Timeline ── */}
      {filteredPapers.length === 0 ? (
        <p className="py-12 text-center text-gray-500">No policy papers found</p>
      ) : (
        <div className="relative ml-3 border-l-2 border-gray-700" role="list" aria-label="Policy papers timeline">
          {filteredPapers.map((paper) => {
            const score = paper.donor_alignment_score ?? 0;
            const dotColor = getAlignmentColor(score);
            const isHighAlignment = score > 0.7;
            const isExpanded = expandedPaperId === paper.id;

            return (
              <div key={paper.id} className="relative mb-6 pl-8" role="listitem">
                {/* Dot on the timeline */}
                <div
                  className="absolute -left-[9px] top-1.5 h-4 w-4 rounded-full border-2 border-gray-900"
                  style={{ backgroundColor: dotColor }}
                />

                {/* Card */}
                <button
                  onClick={() => toggleExpanded(paper.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleExpanded(paper.id);
                    }
                  }}
                  aria-expanded={isExpanded}
                  className={`w-full rounded-lg border bg-gray-900/60 p-4 text-left transition-all hover:bg-gray-800/80 ${
                    isHighAlignment
                      ? 'border-red-500/40 ring-1 ring-red-500/30'
                      : 'border-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-gray-100">{paper.title}</h3>
                      <p className="mt-1 text-sm text-gray-500">{formatDate(paper.published_date)}</p>

                      {/* Topic tags */}
                      {paper.topic_tags && paper.topic_tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {paper.topic_tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Alignment score */}
                    <span
                      className="shrink-0 text-sm font-semibold"
                      style={{ color: dotColor }}
                    >
                      {score.toFixed(2)}
                    </span>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div
                      className="mt-4 space-y-3 border-t border-gray-700 pt-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {paper.summary && (
                        <div>
                          <p className="mb-1 text-xs font-medium uppercase text-gray-500">Summary</p>
                          <p className="text-sm leading-relaxed text-gray-300">{paper.summary}</p>
                        </div>
                      )}

                      {paper.donor_alignment_rationale && (
                        <div>
                          <p className="mb-1 text-xs font-medium uppercase text-gray-500">
                            Donor Alignment Rationale
                          </p>
                          <p className="text-sm leading-relaxed text-gray-300">
                            {paper.donor_alignment_rationale}
                          </p>
                        </div>
                      )}

                      <div>
                        <p className="mb-1 text-xs font-medium uppercase text-gray-500">
                          Alignment Score
                        </p>
                        <p className="text-sm text-gray-300">
                          <span className="font-semibold" style={{ color: dotColor }}>
                            {score.toFixed(2)}
                          </span>
                          <span className="ml-2 text-gray-500">
                            {score <= 0.3
                              ? '(Independent — low donor alignment)'
                              : score <= 0.6
                                ? '(Moderate donor alignment)'
                                : '(High donor alignment)'}
                          </span>
                        </p>
                      </div>

                      {paper.url && (
                        <a
                          href={paper.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block text-sm text-blue-400 underline hover:text-blue-300"
                          aria-label={`Read full paper: ${paper.title} (opens in new tab)`}
                        >
                          Read full paper →
                        </a>
                      )}
                    </div>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
