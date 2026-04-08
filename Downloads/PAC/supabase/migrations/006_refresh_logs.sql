CREATE TABLE IF NOT EXISTS refresh_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id        UUID NOT NULL,
  step          TEXT NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'skipped')),
  records_processed INT DEFAULT 0,
  error_message TEXT,
  started_at    TIMESTAMPTZ DEFAULT now(),
  completed_at  TIMESTAMPTZ
);

CREATE INDEX idx_refresh_logs_run ON refresh_logs(run_id);
CREATE INDEX idx_refresh_logs_status ON refresh_logs(status);
