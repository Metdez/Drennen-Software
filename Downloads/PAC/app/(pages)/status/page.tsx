import type { Metadata } from 'next';
import {
  runAllHealthChecks,
  deriveOverallStatus,
  getRecentRefreshRuns,
  type ApiKeyStatus,
  type RefreshRun,
} from '@/lib/monitoring/health-checks';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'System Status',
  description: 'Health and operational status of the Think Tank Influence Tracker.',
};

// ────────────────────────────────────────────────────────────
// Status badge colors
// ────────────────────────────────────────────────────────────

function statusColor(status: 'healthy' | 'degraded' | 'unhealthy') {
  switch (status) {
    case 'healthy':
      return 'bg-emerald-500';
    case 'degraded':
      return 'bg-amber-500';
    case 'unhealthy':
      return 'bg-red-500';
  }
}

function statusLabel(status: 'healthy' | 'degraded' | 'unhealthy') {
  switch (status) {
    case 'healthy':
      return 'All Systems Operational';
    case 'degraded':
      return 'Degraded Performance';
    case 'unhealthy':
      return 'System Unhealthy';
  }
}

function checkStatusDot(up: boolean) {
  return up ? 'bg-emerald-500' : 'bg-red-500';
}

// ────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────

export default async function StatusPage() {
  const checks = await runAllHealthChecks();
  const overall = deriveOverallStatus(checks);
  const recentRuns = await getRecentRefreshRuns(5);

  const refreshDetails = checks.lastRefresh.details as {
    lastRun: RefreshRun | null;
    daysSinceLastRefresh?: number;
    note?: string;
  } | null;

  const entityDetails = checks.entities.details as {
    count: number | null;
    expected: number;
  } | null;

  const apiKeys = checks.apiKeys.details as ApiKeyStatus | null;

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-12 text-gray-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-white">System Status</h1>
        <p className="mb-8 text-sm text-gray-400">
          Real-time health of the Think Tank Influence Tracker
        </p>

        {/* Overall status banner */}
        <div className="mb-8 flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-900 p-5">
          <span className={`inline-block h-4 w-4 rounded-full ${statusColor(overall)}`} />
          <span className="text-lg font-semibold text-white">{statusLabel(overall)}</span>
        </div>

        {/* Checks grid */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          {/* Database */}
          <Card title="Database">
            <Row label="Status">
              <Dot up={checks.database.status === 'up'} />
              <span className="ml-2">{checks.database.status === 'up' ? 'Connected' : 'Down'}</span>
            </Row>
            {checks.database.latencyMs !== undefined && (
              <Row label="Latency">
                <span>{checks.database.latencyMs} ms</span>
              </Row>
            )}
          </Card>

          {/* Entities */}
          <Card title="Tracked Entities">
            <Row label="Count">
              <span>
                {entityDetails?.count ?? '?'} / {entityDetails?.expected ?? 8} expected
              </span>
            </Row>
            <Row label="Status">
              <Dot up={checks.entities.status === 'up'} />
              <span className="ml-2">{checks.entities.status === 'up' ? 'OK' : 'Mismatch'}</span>
            </Row>
          </Card>

          {/* Last Refresh */}
          <Card title="Last Data Refresh">
            {refreshDetails?.lastRun ? (
              <>
                <Row label="Completed">
                  <span>{formatDate(refreshDetails.lastRun.completed_at)}</span>
                </Row>
                <Row label="Days ago">
                  <span>{refreshDetails.daysSinceLastRefresh ?? '?'}</span>
                </Row>
              </>
            ) : (
              <Row label="Status">
                <span className="text-gray-500">{refreshDetails?.note ?? 'Never'}</span>
              </Row>
            )}
          </Card>

          {/* API Keys */}
          <Card title="API Keys">
            {apiKeys &&
              Object.entries(apiKeys).map(([key, isSet]) => (
                <Row key={key} label={key}>
                  {isSet ? (
                    <span className="text-emerald-400">&#10003;</span>
                  ) : (
                    <span className="text-red-400">&#10007;</span>
                  )}
                </Row>
              ))}
          </Card>
        </div>

        {/* Recent refresh runs */}
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-5">
          <h2 className="mb-4 text-lg font-semibold text-white">Recent Refresh Runs</h2>
          {recentRuns.length === 0 ? (
            <p className="text-sm text-gray-500">No refresh runs recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400">
                    <th className="pb-2 pr-4 font-medium">Step</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 pr-4 font-medium">Records</th>
                    <th className="pb-2 font-medium">Started</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRuns.map((run) => (
                    <tr key={run.id} className="border-b border-gray-800/50">
                      <td className="py-2 pr-4 font-mono text-xs">{run.step}</td>
                      <td className="py-2 pr-4">
                        <RunStatusBadge status={run.status} />
                      </td>
                      <td className="py-2 pr-4">{run.records_processed ?? '-'}</td>
                      <td className="py-2 text-gray-400">{formatDate(run.started_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-gray-600">
          Version 0.1.0 &middot; Last checked {new Date().toISOString()}
        </p>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-400">
        {title}
      </h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-400">{label}</span>
      <span className="flex items-center text-gray-100">{children}</span>
    </div>
  );
}

function Dot({ up }: { up: boolean }) {
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${checkStatusDot(up)}`} />;
}

function RunStatusBadge({ status }: { status: string }) {
  const color =
    status === 'completed'
      ? 'text-emerald-400 bg-emerald-400/10'
      : status === 'running'
        ? 'text-blue-400 bg-blue-400/10'
        : status === 'failed'
          ? 'text-red-400 bg-red-400/10'
          : 'text-gray-400 bg-gray-400/10';

  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${color}`}>
      {status}
    </span>
  );
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
