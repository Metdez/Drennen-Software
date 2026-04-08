import { NextResponse } from 'next/server';
import { runAllHealthChecks, deriveOverallStatus } from '@/lib/monitoring/health-checks';

export const dynamic = 'force-dynamic';

export async function GET() {
  const checks = await runAllHealthChecks();
  const status = deriveOverallStatus(checks);

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      checks,
      version: '0.1.0',
    },
    {
      status: status === 'unhealthy' ? 503 : 200,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}
