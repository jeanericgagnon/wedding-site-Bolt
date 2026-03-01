/*
  Lightweight application error logging table.
*/

CREATE TABLE IF NOT EXISTS app_error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL,
  severity text NOT NULL DEFAULT 'error',
  route text,
  message text NOT NULL,
  stack text,
  fingerprint text,
  wedding_site_id uuid REFERENCES wedding_sites(id) ON DELETE SET NULL,
  user_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_app_error_logs_created_at ON app_error_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_error_logs_fingerprint_created_at ON app_error_logs(fingerprint, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_error_logs_site_created_at ON app_error_logs(wedding_site_id, created_at DESC);

ALTER TABLE app_error_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view app error logs for their sites" ON app_error_logs;
CREATE POLICY "Owners can view app error logs for their sites"
  ON app_error_logs FOR SELECT
  TO authenticated
  USING (
    wedding_site_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM wedding_sites ws
      WHERE ws.id = app_error_logs.wedding_site_id
      AND ws.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role can manage app error logs" ON app_error_logs;
CREATE POLICY "Service role can manage app error logs"
  ON app_error_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
