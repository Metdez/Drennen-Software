/**
 * Manual trigger for the data refresh orchestrator.
 *
 * Usage:
 *   npx tsx scripts/trigger-refresh.ts
 *   npx tsx scripts/trigger-refresh.ts --steps financials,fec
 *   npx tsx scripts/trigger-refresh.ts --force
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { runRefresh } from '../lib/refresh/orchestrator';
import type { RefreshOptions } from '../lib/refresh/types';

function parseArgs(argv: string[]): RefreshOptions {
  const options: RefreshOptions = {};

  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--steps' && argv[i + 1]) {
      options.steps = argv[i + 1].split(',').map((s) => s.trim());
      i++;
    } else if (argv[i] === '--force') {
      options.force = true;
    }
  }

  return options;
}

async function main() {
  const options = parseArgs(process.argv);

  console.log('=== Data Refresh Orchestrator ===');
  console.log(`Started at: ${new Date().toISOString()}`);
  if (options.steps) {
    console.log(`Steps filter: ${options.steps.join(', ')}`);
  }
  if (options.force) {
    console.log('Force mode: enabled');
  }
  console.log('');

  const run = await runRefresh(options);

  // Print results table
  console.log('┌──────────────┬───────────┬──────────┬──────────────────────────────┐');
  console.log('│ Step         │ Status    │ Duration │ Error                        │');
  console.log('├──────────────┼───────────┼──────────┼──────────────────────────────┤');

  for (const step of run.steps) {
    const name = step.name.padEnd(12);
    const status = step.status.padEnd(9);
    const duration = `${step.duration}ms`.padEnd(8);
    const error = (step.error ?? '').slice(0, 28).padEnd(28);
    console.log(`│ ${name} │ ${status} │ ${duration} │ ${error} │`);
  }

  console.log('└──────────────┴───────────┴──────────┴──────────────────────────────┘');
  console.log('');
  console.log(`Run ID: ${run.runId}`);
  console.log(`Completed at: ${run.completedAt?.toISOString()}`);

  const failed = run.steps.filter((s) => s.status === 'failed');
  if (failed.length > 0) {
    console.error(`\n${failed.length} step(s) failed.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
