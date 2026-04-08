'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import type { Entity, PolicyPaper } from '@/lib/types/database';
import type { DonationWithDonor, PoliticianConnectionWithEntity } from '@/lib/profiles/types';
import { CurrencyDisplay } from '@/components/ui/CurrencyDisplay';

// ─── Props ──────────────────────────────────────────────────────────────────

interface ConnectionGraphProps {
  entity: Entity;
  donations: DonationWithDonor[];
  politicianConnections: PoliticianConnectionWithEntity[];
  policyPapers: PolicyPaper[];
}

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_DONORS = 10;
const MAX_POLITICIANS = 10;
const MAX_PAPERS = 5;

const LEAN_BORDER_COLORS: Record<string, string> = {
  right: 'border-red-500',
  left: 'border-blue-500',
  center: 'border-purple-500',
  libertarian: 'border-yellow-500',
  bipartisan: 'border-indigo-500',
};

// ─── Tooltip ────────────────────────────────────────────────────────────────

interface TooltipData {
  x: number;
  y: number;
  name: string;
  lines: string[];
}

function Tooltip({ data }: { data: TooltipData }) {
  return (
    <div
      className="pointer-events-none absolute z-50 rounded bg-gray-800 px-3 py-2 text-xs text-gray-200 shadow-lg ring-1 ring-gray-700"
      style={{ left: data.x, top: data.y - 8, transform: 'translate(-50%, -100%)' }}
    >
      <p className="font-semibold text-white">{data.name}</p>
      {data.lines.map((line, i) => (
        <p key={i} className="text-gray-400">{line}</p>
      ))}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatAmount(amount: number | null): string {
  if (amount === null) return 'N/A';
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
  return `$${amount.toLocaleString()}`;
}

function clampLineWidth(amount: number | null, maxAmount: number): number {
  if (!amount || !maxAmount) return 1;
  return Math.max(1, Math.min(5, (amount / maxAmount) * 5));
}

// ─── Prepared data types ────────────────────────────────────────────────────

interface DonorNode {
  id: string;
  name: string;
  slug: string | null;
  amount: number | null;
}

interface PoliticianNode {
  id: string;
  name: string;
  slug: string;
  connectionType: string | null;
}

interface PaperNode {
  id: string;
  title: string;
  score: number | null;
  url: string | null;
}

// ─── Mobile list view ───────────────────────────────────────────────────────

function MobileListView({
  donors,
  politicians,
  papers,
}: {
  donors: DonorNode[];
  politicians: PoliticianNode[];
  papers: PaperNode[];
}) {
  return (
    <div className="space-y-6">
      {/* Donors */}
      {donors.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-emerald-400">
            Top Donors
          </h3>
          <ul className="space-y-1.5">
            {donors.map((d) => (
              <li key={d.id} className="flex items-center justify-between rounded border border-emerald-800/40 bg-gray-900 px-3 py-2">
                {d.slug ? (
                  <Link href={`/entity/${d.slug}`} className="text-sm text-gray-200 hover:text-white">
                    {d.name}
                  </Link>
                ) : (
                  <span className="text-sm text-gray-200">{d.name}</span>
                )}
                <CurrencyDisplay amount={d.amount} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Politicians */}
      {politicians.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-sky-400">
            Connected Politicians
          </h3>
          <ul className="space-y-1.5">
            {politicians.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded border border-sky-800/40 bg-gray-900 px-3 py-2">
                <Link href={`/entity/${p.slug}`} className="text-sm text-gray-200 hover:text-white">
                  {p.name}
                </Link>
                {p.connectionType && (
                  <span className="text-xs text-gray-500">{p.connectionType}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Papers */}
      {papers.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-amber-400">
            Key Policy Papers
          </h3>
          <ul className="space-y-1.5">
            {papers.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 rounded border border-amber-800/40 bg-gray-900 px-3 py-2">
                <span className="text-sm text-gray-200 line-clamp-1">{p.title}</span>
                {p.score !== null && (
                  <span className="shrink-0 rounded bg-amber-900/50 px-1.5 py-0.5 text-xs font-mono text-amber-300">
                    {(p.score * 100).toFixed(0)}%
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Graph view ─────────────────────────────────────────────────────────────

interface NodePosition {
  x: number;
  y: number;
}

function GraphView({
  entity,
  donors,
  politicians,
  papers,
  maxDonationAmount,
}: {
  entity: Entity;
  donors: DonorNode[];
  politicians: PoliticianNode[];
  papers: PaperNode[];
  maxDonationAmount: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 600 });

  useEffect(() => {
    function measure() {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: Math.max(500, rect.width * 0.55) });
      }
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const { width, height } = dimensions;

  // Center entity position
  const center: NodePosition = { x: width / 2, y: height * 0.4 };

  // Donor positions — left column, evenly distributed vertically
  const donorPositions: NodePosition[] = donors.map((_, i) => ({
    x: width * 0.12,
    y: (height * 0.1) + ((height * 0.75) / Math.max(donors.length, 1)) * (i + 0.5),
  }));

  // Politician positions — right column
  const politicianPositions: NodePosition[] = politicians.map((_, i) => ({
    x: width * 0.88,
    y: (height * 0.1) + ((height * 0.75) / Math.max(politicians.length, 1)) * (i + 0.5),
  }));

  // Paper positions — bottom row
  const paperPositions: NodePosition[] = papers.map((_, i) => ({
    x: (width * 0.2) + ((width * 0.6) / Math.max(papers.length, 1)) * (i + 0.5),
    y: height * 0.88,
  }));

  const leanBorder = LEAN_BORDER_COLORS[entity.lean ?? ''] ?? 'border-gray-500';

  const handleNodeHover = useCallback(
    (e: React.MouseEvent, name: string, lines: string[]) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setTooltip({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        name,
        lines,
      });
    },
    [],
  );

  const clearTooltip = useCallback(() => setTooltip(null), []);

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden rounded-xl border border-gray-800 bg-gray-950">
      {/* SVG connection lines */}
      <svg
        className="absolute inset-0 pointer-events-none"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
      >
        {/* Donor lines */}
        {donorPositions.map((pos, i) => (
          <line
            key={`d-${donors[i].id}`}
            x1={pos.x + 60}
            y1={pos.y}
            x2={center.x - 70}
            y2={center.y}
            stroke="#10b981"
            strokeOpacity={0.5}
            strokeWidth={clampLineWidth(donors[i].amount, maxDonationAmount)}
          />
        ))}
        {/* Politician lines */}
        {politicianPositions.map((pos, i) => (
          <line
            key={`p-${politicians[i].id}`}
            x1={pos.x - 60}
            y1={pos.y}
            x2={center.x + 70}
            y2={center.y}
            stroke="#0ea5e9"
            strokeOpacity={0.5}
            strokeWidth={1.5}
          />
        ))}
        {/* Paper lines */}
        {paperPositions.map((pos, i) => (
          <line
            key={`pp-${papers[i].id}`}
            x1={pos.x}
            y1={pos.y - 16}
            x2={center.x}
            y2={center.y + 24}
            stroke="#f59e0b"
            strokeOpacity={0.5}
            strokeWidth={1.5}
          />
        ))}
      </svg>

      {/* Node layer */}
      <div className="relative" style={{ width, height }}>
        {/* Center entity node */}
        <div
          className={`absolute flex items-center justify-center rounded-xl border-2 ${leanBorder} bg-gray-900 px-5 py-3 shadow-lg`}
          style={{
            left: center.x,
            top: center.y,
            transform: 'translate(-50%, -50%)',
            maxWidth: 200,
          }}
        >
          <span className="text-center text-sm font-bold text-white leading-tight">{entity.name}</span>
        </div>

        {/* Donor nodes */}
        {donors.map((d, i) => {
          const pos = donorPositions[i];
          return (
            <div
              key={d.id}
              className="absolute cursor-pointer"
              style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, -50%)' }}
              onMouseMove={(e) =>
                handleNodeHover(e, d.name, [
                  `Amount: ${formatAmount(d.amount)}`,
                  'Type: Donor',
                ])
              }
              onMouseLeave={clearTooltip}
            >
              {d.slug ? (
                <Link href={`/entity/${d.slug}`}>
                  <div className="rounded-lg border border-emerald-600/50 bg-gray-900 px-3 py-1.5 text-center transition-colors hover:border-emerald-400 hover:bg-gray-800">
                    <p className="text-xs font-medium text-gray-200 line-clamp-1 max-w-[120px]">{d.name}</p>
                    <p className="text-[10px] font-mono text-emerald-400">{formatAmount(d.amount)}</p>
                  </div>
                </Link>
              ) : (
                <div className="rounded-lg border border-emerald-600/50 bg-gray-900 px-3 py-1.5 text-center">
                  <p className="text-xs font-medium text-gray-200 line-clamp-1 max-w-[120px]">{d.name}</p>
                  <p className="text-[10px] font-mono text-emerald-400">{formatAmount(d.amount)}</p>
                </div>
              )}
            </div>
          );
        })}

        {/* Politician nodes */}
        {politicians.map((p, i) => {
          const pos = politicianPositions[i];
          return (
            <div
              key={p.id}
              className="absolute cursor-pointer"
              style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, -50%)' }}
              onMouseMove={(e) =>
                handleNodeHover(e, p.name, [
                  `Connection: ${p.connectionType ?? 'Unknown'}`,
                  'Type: Politician',
                ])
              }
              onMouseLeave={clearTooltip}
            >
              <Link href={`/entity/${p.slug}`}>
                <div className="rounded-lg border border-sky-600/50 bg-gray-900 px-3 py-1.5 text-center transition-colors hover:border-sky-400 hover:bg-gray-800">
                  <p className="text-xs font-medium text-gray-200 line-clamp-1 max-w-[120px]">{p.name}</p>
                </div>
              </Link>
            </div>
          );
        })}

        {/* Paper nodes */}
        {papers.map((p, i) => {
          const pos = paperPositions[i];
          return (
            <div
              key={p.id}
              className="absolute"
              style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, -50%)' }}
              onMouseMove={(e) =>
                handleNodeHover(e, p.title, [
                  `Alignment: ${p.score !== null ? `${(p.score * 100).toFixed(0)}%` : 'N/A'}`,
                  'Type: Policy Paper',
                ])
              }
              onMouseLeave={clearTooltip}
            >
              <div className="rounded-lg border border-amber-600/50 bg-gray-900 px-3 py-1.5 text-center max-w-[140px]">
                <p className="text-[10px] font-medium text-gray-200 line-clamp-2">{p.title}</p>
                {p.score !== null && (
                  <p className="text-[10px] font-mono text-amber-400">{(p.score * 100).toFixed(0)}%</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tooltip overlay */}
      {tooltip && <Tooltip data={tooltip} />}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex flex-wrap gap-3 text-[10px] text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-4 rounded-sm bg-emerald-500/60" />
          Donors
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-4 rounded-sm bg-sky-500/60" />
          Politicians
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-4 rounded-sm bg-amber-500/60" />
          Papers
        </span>
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export function ConnectionGraph({
  entity,
  donations,
  politicianConnections,
  policyPapers,
}: ConnectionGraphProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function check() {
      setIsMobile(window.innerWidth < 768);
    }
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Prepare donor nodes — sort by amount DESC, limit
  const donors: DonorNode[] = [...donations]
    .sort((a, b) => (b.donation.amount ?? 0) - (a.donation.amount ?? 0))
    .slice(0, MAX_DONORS)
    .map((d) => ({
      id: d.donation.id,
      name: d.donor?.name ?? d.donation.donor_name,
      slug: d.donor?.slug ?? null,
      amount: d.donation.amount,
    }));

  // Prepare politician nodes — limit
  const politicians: PoliticianNode[] = politicianConnections
    .slice(0, MAX_POLITICIANS)
    .map((pc) => ({
      id: pc.connection.id,
      name: pc.politician.name,
      slug: pc.politician.slug,
      connectionType: pc.connection.connection_type,
    }));

  // Prepare paper nodes — sort by alignment score DESC, limit
  const papers: PaperNode[] = [...policyPapers]
    .sort((a, b) => (b.donor_alignment_score ?? 0) - (a.donor_alignment_score ?? 0))
    .slice(0, MAX_PAPERS)
    .map((p) => ({
      id: p.id,
      title: p.title,
      score: p.donor_alignment_score,
      url: p.url,
    }));

  // Empty state
  if (donors.length === 0 && politicians.length === 0 && papers.length === 0) {
    return (
      <div className="rounded-lg border border-gray-800 bg-gray-950 p-8 text-center text-gray-500">
        No connections data available
      </div>
    );
  }

  const maxDonationAmount = Math.max(...donors.map((d) => d.amount ?? 0), 1);

  // Build sr-only text alternative for the graph
  const srOnlyDescription = [
    `Connections for ${entity.name}:`,
    donors.length > 0
      ? `Donors: ${donors.map((d) => `${d.name} (${formatAmount(d.amount)})`).join(', ')}.`
      : null,
    politicians.length > 0
      ? `Connected politicians: ${politicians.map((p) => p.name).join(', ')}.`
      : null,
    papers.length > 0
      ? `Key policy papers: ${papers.map((p) => p.title).join(', ')}.`
      : null,
  ]
    .filter(Boolean)
    .join(' ');

  if (isMobile) {
    return <MobileListView donors={donors} politicians={politicians} papers={papers} />;
  }

  return (
    <div role="img" aria-label={`Connection graph for ${entity.name}`}>
      <div className="sr-only">{srOnlyDescription}</div>
      <GraphView
        entity={entity}
        donors={donors}
        politicians={politicians}
        papers={papers}
        maxDonationAmount={maxDonationAmount}
      />
    </div>
  );
}
