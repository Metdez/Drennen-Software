'use client';

import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from 'recharts';
import type { Financial } from '@/lib/types/database';
import { StatCard } from '@/components/ui/StatCard';

function formatCurrency(value: number | null): string {
  if (value === null) return 'N/A';
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

interface FinancialChartProps {
  financials: Financial[];
  entityName: string;
}

export function FinancialChart({ financials, entityName }: FinancialChartProps) {
  if (financials.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl bg-gray-900 p-6">
        <p className="text-gray-400">No financial data available</p>
      </div>
    );
  }

  // Sort by fiscal_year ascending; filter out entries missing revenue
  const sorted = [...financials].sort((a, b) => a.fiscal_year - b.fiscal_year);

  // Build chart data — only include years that have at least one non-null value
  const chartData = sorted
    .filter(
      (f) =>
        f.total_revenue !== null ||
        f.total_expenses !== null ||
        f.total_assets !== null
    )
    .map((f) => ({
      fiscal_year: f.fiscal_year,
      total_revenue: f.total_revenue,
      total_expenses: f.total_expenses,
      total_assets: f.total_assets,
      source_filing_url: f.source_filing_url,
    }));

  // Summary stats
  const revenueEntries = sorted.filter((f) => f.total_revenue !== null);
  const totalRevenue = revenueEntries.reduce(
    (sum, f) => sum + (f.total_revenue ?? 0),
    0
  );
  const avgRevenue =
    revenueEntries.length > 0 ? totalRevenue / revenueEntries.length : null;

  const earliest = revenueEntries[0];
  const latest = revenueEntries[revenueEntries.length - 1];
  let growthRate: number | null = null;
  let growthTrend: 'up' | 'down' | 'flat' = 'flat';

  if (
    earliest &&
    latest &&
    earliest !== latest &&
    earliest.total_revenue &&
    latest.total_revenue &&
    earliest.total_revenue !== 0
  ) {
    growthRate =
      ((latest.total_revenue - earliest.total_revenue) /
        Math.abs(earliest.total_revenue)) *
      100;
    growthTrend = growthRate > 0 ? 'up' : growthRate < 0 ? 'down' : 'flat';
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleBarClick(data: any) {
    const url = data?.source_filing_url;
    if (typeof url === 'string' && url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  // Custom tooltip
  function CustomTooltip({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number | null; color: string }>;
    label?: string | number;
  }) {
    if (!active || !payload || payload.length === 0) return null;
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-800 p-3 shadow-lg">
        <p className="mb-1 text-sm font-semibold text-gray-200">
          FY {label}
        </p>
        {payload.map((entry) => (
          <p key={entry.name} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label={`Total ${revenueEntries.length}-Year Revenue`}
          value={formatCurrency(totalRevenue)}
        />
        <StatCard
          label="Average Annual Revenue"
          value={formatCurrency(avgRevenue)}
        />
        <StatCard
          label="Revenue Growth Rate"
          value={growthRate !== null ? `${growthRate.toFixed(1)}%` : 'N/A'}
          trend={growthRate !== null ? growthTrend : undefined}
        />
      </div>

      {/* Chart */}
      <div
        className="rounded-xl bg-gray-900 p-6"
        role="img"
        aria-label={`Financial overview chart for ${entityName} showing revenue, expenses, and assets from ${chartData[0]?.fiscal_year ?? 'N/A'} to ${chartData[chartData.length - 1]?.fiscal_year ?? 'N/A'}`}
      >
        <h3 className="mb-4 text-lg font-semibold text-gray-100">
          {entityName} — Financial Overview
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="fiscal_year"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              axisLine={{ stroke: '#4b5563' }}
            />
            <YAxis
              tickFormatter={(v: number) => formatCurrency(v)}
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              axisLine={{ stroke: '#4b5563' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              wrapperStyle={{ paddingTop: 16, color: '#d1d5db' }}
            />
            <Bar
              dataKey="total_revenue"
              name="Total Revenue"
              fill="#10b981"
              onClick={handleBarClick}
              cursor="pointer"
            />
            <Bar
              dataKey="total_expenses"
              name="Total Expenses"
              fill="#f43f5e"
              onClick={handleBarClick}
              cursor="pointer"
            />
            <Line
              type="monotone"
              dataKey="total_assets"
              name="Total Assets"
              stroke="#38bdf8"
              strokeDasharray="5 5"
              strokeWidth={2}
              dot={{ fill: '#38bdf8', r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
