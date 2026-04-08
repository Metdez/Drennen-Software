import { createServiceRoleClient } from '@/lib/supabase/server';

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

export interface HealthCheckResult {
  status: 'up' | 'down';
  latencyMs?: number;
  details?: unknown;
}

export interface ApiKeyStatus {
  FEC_API_KEY: boolean;
  LDA_API_KEY: boolean;
  NYTIMES_API_KEY: boolean;
  NYTIMES_SECRET: boolean;
  OPENROUTER_API_KEY: boolean;
  NEXT_PUBLIC_SUPABASE_URL: boolean;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: boolean;
  SUPABASE_SERVICE_ROLE_KEY: boolean;
}

export interface RefreshRun {
  id: string;
  run_id: string;
  step: string;
  status: string;
  records_processed: number | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface AllHealthChecks {
  database: HealthCheckResult;
  entities: HealthCheckResult;
  lastRefresh: HealthCheckResult;
  apiKeys: HealthCheckResult;
}

// ────────────────────────────────────────────────────────────
// Individual checks
// ────────────────────────────────────────────────────────────

/**
 * Ping Supabase with a lightweight query and measure round-trip latency.
 */
export async function checkDatabase(): Promise<HealthCheckResult> {
  const supabase = createServiceRoleClient();
  const start = performance.now();

  try {
    const { error } = await supabase.from('entities').select('id', { count: 'exact', head: true });
    const latencyMs = Math.round(performance.now() - start);

    if (error) {
      return { status: 'down', latencyMs, details: error.message };
    }

    return { status: 'up', latencyMs };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    return { status: 'down', latencyMs, details: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Count entities and compare against the expected total (8).
 */
export async function checkEntities(): Promise<HealthCheckResult> {
  const supabase = createServiceRoleClient();
  const start = performance.now();

  try {
    const { count, error } = await supabase
      .from('entities')
      .select('*', { count: 'exact', head: true });

    const latencyMs = Math.round(performance.now() - start);

    if (error) {
      return { status: 'down', latencyMs, details: error.message };
    }

    const expected = 8;
    return {
      status: count === expected ? 'up' : 'down',
      latencyMs,
      details: { count, expected },
    };
  } catch (err) {
    return { status: 'down', details: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Query refresh_logs for the most recent completed run.
 * Handles the case where the table doesn't exist yet.
 */
export async function checkLastRefresh(): Promise<HealthCheckResult> {
  const supabase = createServiceRoleClient();
  const start = performance.now();

  try {
    const { data, error } = await supabase
      .from('refresh_logs')
      .select('*')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const latencyMs = Math.round(performance.now() - start);

    // Table may not exist yet — treat as degraded, not down
    if (error) {
      return {
        status: 'up',
        latencyMs,
        details: { lastRun: null, note: 'refresh_logs table not available yet' },
      };
    }

    if (!data) {
      return {
        status: 'up',
        latencyMs,
        details: { lastRun: null, note: 'No completed refresh runs found' },
      };
    }

    const completedAt = new Date(data.completed_at as string);
    const daysSince = (Date.now() - completedAt.getTime()) / (1000 * 60 * 60 * 24);

    return {
      status: daysSince <= 14 ? 'up' : 'down',
      latencyMs,
      details: { lastRun: data, daysSinceLastRefresh: Math.round(daysSince * 10) / 10 },
    };
  } catch (err) {
    return {
      status: 'up',
      details: { lastRun: null, note: err instanceof Error ? err.message : String(err) },
    };
  }
}

/**
 * Check which required environment variables are set (boolean per key).
 * Never exposes actual values.
 */
export function checkApiKeys(): HealthCheckResult {
  const keys: ApiKeyStatus = {
    FEC_API_KEY: !!process.env.FEC_API_KEY,
    LDA_API_KEY: !!process.env.LDA_API_KEY,
    NYTIMES_API_KEY: !!process.env.NYTIMES_API_KEY,
    NYTIMES_SECRET: !!process.env.NYTIMES_SECRET,
    OPENROUTER_API_KEY: !!process.env.OPENROUTER_API_KEY,
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  const allSet = Object.values(keys).every(Boolean);

  return {
    status: allSet ? 'up' : 'down',
    details: keys,
  };
}

// ────────────────────────────────────────────────────────────
// Run all checks
// ────────────────────────────────────────────────────────────

export async function runAllHealthChecks(): Promise<AllHealthChecks> {
  const [database, entities, lastRefresh] = await Promise.all([
    checkDatabase(),
    checkEntities(),
    checkLastRefresh(),
  ]);

  const apiKeys = checkApiKeys();

  return { database, entities, lastRefresh, apiKeys };
}

/**
 * Fetch the last N refresh runs from refresh_logs.
 * Returns empty array if table doesn't exist.
 */
export async function getRecentRefreshRuns(limit = 5): Promise<RefreshRun[]> {
  const supabase = createServiceRoleClient();

  try {
    const { data, error } = await supabase
      .from('refresh_logs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data as RefreshRun[];
  } catch {
    return [];
  }
}

/**
 * Derive overall system status from individual check results.
 */
export function deriveOverallStatus(checks: AllHealthChecks): 'healthy' | 'degraded' | 'unhealthy' {
  // Unhealthy if database is down
  if (checks.database.status === 'down') return 'unhealthy';

  // Degraded if entity count mismatch
  if (checks.entities.status === 'down') return 'degraded';

  // Degraded if last refresh > 14 days or no refresh yet
  const refreshDetails = checks.lastRefresh.details as { lastRun: unknown } | undefined;
  if (checks.lastRefresh.status === 'down' || !refreshDetails?.lastRun) return 'degraded';

  return 'healthy';
}
