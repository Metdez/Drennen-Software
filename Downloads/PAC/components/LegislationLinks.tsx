'use client';

import { useState } from 'react';
import type { LegislationWithLink } from '@/lib/profiles/types';
import { Badge } from '@/components/ui/Badge';
import { SourceLink } from '@/components/ui/SourceLink';

interface LegislationLinksProps {
  legislation: LegislationWithLink[];
}

const chamberOptions = ['all', 'house', 'senate'] as const;
type ChamberFilter = (typeof chamberOptions)[number];

const linkTypeColors: Record<string, string> = {
  language_match: 'bg-purple-600 text-white',
  citation: 'bg-blue-600 text-white',
  testimony: 'bg-amber-600 text-white',
  staff_connection: 'bg-orange-600 text-white',
};

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + '\u2026';
}

function confidenceColor(confidence: number): string {
  if (confidence > 0.8) return 'text-green-400';
  if (confidence >= 0.5) return 'text-amber-400';
  return 'text-red-400';
}

export function LegislationLinks({ legislation }: LegislationLinksProps) {
  const [chamberFilter, setChamberFilter] = useState<ChamberFilter>('all');
  const [confidenceThreshold, setConfidenceThreshold] = useState(0);

  const filtered = legislation.filter((item) => {
    if (chamberFilter !== 'all' && item.legislation.chamber !== chamberFilter) {
      return false;
    }
    const conf = item.link.confidence ?? 0;
    if (conf < confidenceThreshold / 100) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-6">
        {/* Chamber toggle */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Chamber:</span>
          <div className="inline-flex rounded-lg bg-gray-800 p-0.5">
            {chamberOptions.map((option) => (
              <button
                key={option}
                onClick={() => setChamberFilter(option)}
                className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${
                  chamberFilter === option
                    ? 'bg-gray-600 text-white'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {option === 'all' ? 'All' : option.charAt(0).toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Confidence threshold slider */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Min Confidence:</span>
          <input
            type="range"
            min={0}
            max={100}
            value={confidenceThreshold}
            onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
            className="h-1.5 w-32 cursor-pointer appearance-none rounded-full bg-gray-700 accent-blue-500"
          />
          <span className="w-10 text-right text-xs text-gray-300">{confidenceThreshold}%</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-700">
        <table className="w-full min-w-[800px] text-left text-sm" aria-label="Legislation connections">
          <thead className="border-b border-gray-700 bg-gray-800/80 text-xs uppercase text-gray-400">
            <tr>
              <th scope="col" className="px-4 py-3">Bill ID</th>
              <th scope="col" className="px-4 py-3">Title</th>
              <th scope="col" className="px-4 py-3">Chamber</th>
              <th scope="col" className="px-4 py-3">Status</th>
              <th scope="col" className="px-4 py-3">Connection Type</th>
              <th scope="col" className="px-4 py-3">Confidence</th>
              <th scope="col" className="px-4 py-3">Connected Paper</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No connected legislation found
                </td>
              </tr>
            ) : (
              filtered.map((item, idx) => {
                const conf = item.link.confidence ?? 0;
                const linkTypeStyle =
                  (item.link.link_type && linkTypeColors[item.link.link_type]) ||
                  'bg-gray-600 text-gray-200';

                return (
                  <tr
                    key={item.legislation.id + '-' + item.link.id}
                    className={idx % 2 === 0 ? 'bg-gray-900/40' : 'bg-gray-900/20'}
                  >
                    {/* Bill ID */}
                    <td className="whitespace-nowrap px-4 py-3">
                      <SourceLink url={item.legislation.url} label={item.legislation.bill_id} aria-label={`View bill ${item.legislation.bill_id} on external site`} />
                    </td>

                    {/* Title */}
                    <td className="px-4 py-3 text-gray-200" title={item.legislation.title}>
                      {truncate(item.legislation.title, 60)}
                    </td>

                    {/* Chamber */}
                    <td className="px-4 py-3">
                      {item.legislation.chamber ? (
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium leading-5 ${
                            item.legislation.chamber === 'house'
                              ? 'bg-blue-600 text-white'
                              : 'bg-red-600 text-white'
                          }`}
                        >
                          {item.legislation.chamber === 'house' ? 'House' : 'Senate'}
                        </span>
                      ) : (
                        <span className="text-gray-500">--</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {item.legislation.status ?? '--'}
                    </td>

                    {/* Connection Type */}
                    <td className="px-4 py-3">
                      {item.link.link_type ? (
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium leading-5 ${linkTypeStyle}`}
                        >
                          {item.link.link_type.replace(/_/g, ' ')}
                        </span>
                      ) : (
                        <span className="text-gray-500">--</span>
                      )}
                    </td>

                    {/* Confidence */}
                    <td className={`px-4 py-3 text-sm font-medium ${confidenceColor(conf)}`}>
                      {Math.round(conf * 100)}%
                    </td>

                    {/* Connected Paper */}
                    <td className="px-4 py-3 text-gray-300" title={item.paper.title}>
                      <span className="cursor-default hover:text-blue-400 transition-colors">
                        {truncate(item.paper.title, 40)}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
