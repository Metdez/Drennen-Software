export interface RefreshStep {
  name: string;
  status: 'started' | 'completed' | 'failed' | 'skipped';
  recordsProcessed: number;
  duration: number;
  error?: string;
}

export interface RefreshRun {
  runId: string;
  steps: RefreshStep[];
  startedAt: Date;
  completedAt?: Date;
}

export interface RefreshOptions {
  entities?: string[];
  steps?: string[];
  force?: boolean;
}
