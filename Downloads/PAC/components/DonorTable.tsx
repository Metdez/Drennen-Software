'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { DonationWithDonor, DonationSummary } from '@/lib/profiles/types';
import { Badge } from '@/components/ui/Badge';
import { CurrencyDisplay } from '@/components/ui/CurrencyDisplay';
import { SourceLink } from '@/components/ui/SourceLink';

interface DonorTableProps {
  donations: DonationWithDonor[];
  summary: DonationSummary;
}

type SortKey = 'donor' | 'industry' | 'amount' | 'year' | 'source';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 20;

const INDUSTRY_COLORS = [
  'bg-slate-500',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-sky-600',
  'bg-violet-600',
  'bg-slate-600',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
];

function getSortValue(item: DonationWithDonor, key: SortKey): string | number {
  const d = item.donation;
  switch (key) {
    case 'donor':
      return (item.donor?.name ?? d.donor_name).toLowerCase();
    case 'industry':
      return (d.industry_bucket ?? '').toLowerCase();
    case 'amount':
      return d.amount ?? 0;
    case 'year':
      return d.fiscal_year ?? 0;
    case 'source':
      return (d.source ?? '').toLowerCase();
  }
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) {
    return <span className="ml-1 text-gray-600">&#8597;</span>;
  }
  return (
    <span className="ml-1 text-gray-300">
      {dir === 'asc' ? '\u25B2' : '\u25BC'}
    </span>
  );
}

export function DonorTable({ donations, summary }: DonorTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('amount');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  if (donations.length === 0) {
    return (
      <div className="rounded-lg border border-gray-800 bg-gray-950 p-8 text-center text-gray-500">
        No donor data available.
      </div>
    );
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'amount' || key === 'year' ? 'desc' : 'asc');
    }
  };

  const sorted = [...donations].sort((a, b) => {
    const aVal = getSortValue(a, sortKey);
    const bVal = getSortValue(b, sortKey);
    const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const visible = sorted.slice(0, visibleCount);
  const hasMore = visibleCount < donations.length;

  const totalIndustryAmount = summary.topIndustries.reduce(
    (sum, ind) => sum + ind.amount,
    0,
  );

  return (
    <div className="space-y-6">
      {/* Summary row */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-gray-800 bg-gray-950 px-4 py-3">
        <div className="text-sm text-gray-400">
          <span className="font-semibold text-gray-100">{summary.donorCount}</span>{' '}
          donors
        </div>
        <div className="text-sm text-gray-400">
          Total:{' '}
          <CurrencyDisplay amount={summary.totalAmount} />
        </div>
        {summary.topIndustries.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {summary.topIndustries.map((ind) => (
              <Badge key={ind.bucket} label={ind.bucket} variant="industry" />
            ))}
          </div>
        )}
      </div>

      {/* Sortable table */}
      <div className="overflow-x-auto rounded-lg border border-gray-800">
        <table className="w-full min-w-[640px] text-sm" aria-label="Donor contributions">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-900 text-left text-xs uppercase tracking-wider text-gray-400">
              {(
                [
                  ['donor', 'Donor Name'],
                  ['industry', 'Industry'],
                  ['amount', 'Amount'],
                  ['year', 'Year'],
                  ['source', 'Source'],
                ] as [SortKey, string][]
              ).map(([key, label]) => (
                <th
                  key={key}
                  scope="col"
                  className="cursor-pointer select-none px-4 py-3 hover:text-gray-200"
                  onClick={() => handleSort(key)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSort(key);
                    }
                  }}
                  tabIndex={0}
                  role="columnheader"
                  aria-sort={sortKey === key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  {label}
                  <SortIcon active={sortKey === key} dir={sortDir} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((item, idx) => {
              const d = item.donation;
              return (
                <tr
                  key={d.id}
                  className={
                    idx % 2 === 0
                      ? 'bg-gray-950 hover:bg-gray-900/70'
                      : 'bg-gray-900 hover:bg-gray-900/70'
                  }
                >
                  {/* Donor Name */}
                  <td className="px-4 py-2.5 font-medium text-gray-100">
                    {item.donor ? (
                      <Link
                        href={`/entity/${item.donor.slug}`}
                        className="text-blue-400 hover:text-blue-300 hover:underline"
                      >
                        {item.donor.name}
                      </Link>
                    ) : (
                      <span>{d.donor_name}</span>
                    )}
                  </td>

                  {/* Industry */}
                  <td className="px-4 py-2.5">
                    {d.industry_bucket ? (
                      <Badge label={d.industry_bucket} variant="industry" />
                    ) : (
                      <span className="text-gray-600">--</span>
                    )}
                  </td>

                  {/* Amount */}
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-2">
                      <CurrencyDisplay amount={d.amount} />
                      <SourceLink url={d.source_url} />
                    </span>
                  </td>

                  {/* Year */}
                  <td className="px-4 py-2.5 font-mono text-gray-300">
                    {d.fiscal_year ?? '--'}
                  </td>

                  {/* Source */}
                  <td className="px-4 py-2.5 text-xs text-gray-500">
                    {d.source ?? '--'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Show More */}
      {hasMore && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
            className="rounded-md border border-gray-700 bg-gray-900 px-4 py-2 text-sm text-gray-300 transition-colors hover:border-gray-600 hover:bg-gray-800 hover:text-gray-100"
          >
            Show More ({Math.min(PAGE_SIZE, donations.length - visibleCount)} remaining)
          </button>
        </div>
      )}

      {/* Industry breakdown mini-chart */}
      {summary.topIndustries.length > 0 && totalIndustryAmount > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Industry Breakdown
          </h4>
          <div className="flex h-6 w-full overflow-hidden rounded-md">
            {summary.topIndustries.map((ind, i) => {
              const pct = (ind.amount / totalIndustryAmount) * 100;
              if (pct < 0.5) return null;
              return (
                <div
                  key={ind.bucket}
                  className={`${INDUSTRY_COLORS[i % INDUSTRY_COLORS.length]} flex items-center justify-center text-[10px] font-medium text-white transition-all`}
                  style={{ width: `${pct}%` }}
                  title={`${ind.bucket}: $${ind.amount.toLocaleString()}`}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-gray-400">
            {summary.topIndustries.map((ind, i) => {
              const pct = (ind.amount / totalIndustryAmount) * 100;
              if (pct < 0.5) return null;
              return (
                <div key={ind.bucket} className="flex items-center gap-1.5">
                  <span
                    className={`inline-block h-2.5 w-2.5 rounded-sm ${INDUSTRY_COLORS[i % INDUSTRY_COLORS.length]}`}
                  />
                  <span>
                    {ind.bucket} ({pct.toFixed(1)}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
