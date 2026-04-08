import { createServiceRoleClient } from '../supabase/server';
import type { RefreshOptions, RefreshRun, RefreshStep } from './types';

const STEPS = [
  { name: 'financials', label: 'financial ingestion' },
  { name: 'fec', label: 'FEC ingestion' },
  { name: 'lobbying', label: 'lobbying ingestion' },
  { name: 'contracts', label: 'contract ingestion' },
  { name: 'policies', label: 'policy scraping' },
  { name: 'legislation', label: 'legislation ingestion' },
  { name: 'donors', label: 'donor resolution' },
  { name: 'analysis', label: 'AI analysis' },
] as const;

export async function runRefresh(options: RefreshOptions = {}): Promise<RefreshRun> {
  const supabase = createServiceRoleClient();
  const runId = crypto.randomUUID();
  const startedAt = new Date();
  const completedSteps: RefreshStep[] = [];

  const stepsToRun = options.steps
    ? STEPS.filter((s) => options.steps!.includes(s.name))
    : STEPS;

  for (const step of stepsToRun) {
    const stepStart = Date.now();

    // Insert 'started' log
    const { data: logRow, error: insertError } = await supabase
      .from('refresh_logs')
      .insert({
        run_id: runId,
        step: step.name,
        status: 'started',
        records_processed: 0,
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (insertError) {
      console.error(`Failed to insert log for step "${step.name}":`, insertError.message);
      completedSteps.push({
        name: step.name,
        status: 'failed',
        recordsProcessed: 0,
        duration: Date.now() - stepStart,
        error: `Log insert failed: ${insertError.message}`,
      });
      continue;
    }

    try {
      // Placeholder: log what would run. Wire actual script calls here later.
      console.log(`[${step.name}] Would run ${step.label}`);

      const duration = Date.now() - stepStart;

      // Update log to 'completed'
      await supabase
        .from('refresh_logs')
        .update({
          status: 'completed',
          records_processed: 0,
          completed_at: new Date().toISOString(),
        })
        .eq('id', logRow.id);

      completedSteps.push({
        name: step.name,
        status: 'completed',
        recordsProcessed: 0,
        duration,
      });
    } catch (err) {
      const duration = Date.now() - stepStart;
      const errorMessage = err instanceof Error ? err.message : String(err);

      // Update log to 'failed'
      await supabase
        .from('refresh_logs')
        .update({
          status: 'failed',
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
        })
        .eq('id', logRow.id);

      completedSteps.push({
        name: step.name,
        status: 'failed',
        recordsProcessed: 0,
        duration,
        error: errorMessage,
      });
    }
  }

  const completedAt = new Date();

  return {
    runId,
    steps: completedSteps,
    startedAt,
    completedAt,
  };
}
