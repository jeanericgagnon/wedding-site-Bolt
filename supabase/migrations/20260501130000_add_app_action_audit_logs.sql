CREATE TABLE IF NOT EXISTS public.app_action_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_site_id uuid NOT NULL REFERENCES public.wedding_sites(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES auth.users(id),
  action_area text NOT NULL,
  action_type text NOT NULL,
  target_id text,
  target_label text,
  summary text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_action_audit_logs_site_created
  ON public.app_action_audit_logs(wedding_site_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_app_action_audit_logs_area_created
  ON public.app_action_audit_logs(action_area, created_at DESC);

ALTER TABLE public.app_action_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view app action audit logs" ON public.app_action_audit_logs;
CREATE POLICY "Owners can view app action audit logs"
  ON public.app_action_audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.wedding_sites ws
      WHERE ws.id = app_action_audit_logs.wedding_site_id
        AND ws.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Collaborators can view app action audit logs" ON public.app_action_audit_logs;
CREATE POLICY "Collaborators can view app action audit logs"
  ON public.app_action_audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.wedding_site_collaborators c
      WHERE c.wedding_site_id = app_action_audit_logs.wedding_site_id
        AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owners and collaborators can insert app action audit logs" ON public.app_action_audit_logs;
CREATE POLICY "Owners and collaborators can insert app action audit logs"
  ON public.app_action_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    actor_user_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM public.wedding_sites ws
        WHERE ws.id = app_action_audit_logs.wedding_site_id
          AND ws.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.wedding_site_collaborators c
        WHERE c.wedding_site_id = app_action_audit_logs.wedding_site_id
          AND c.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Service role can manage app action audit logs" ON public.app_action_audit_logs;
CREATE POLICY "Service role can manage app action audit logs"
  ON public.app_action_audit_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
