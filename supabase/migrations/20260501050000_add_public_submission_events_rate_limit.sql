CREATE TABLE IF NOT EXISTS public.public_submission_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_site_id uuid REFERENCES public.wedding_sites(id) ON DELETE CASCADE,
  site_slug text,
  scope text NOT NULL,
  subject text,
  requester_ip text,
  user_agent text,
  referrer text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.public_submission_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS public_submission_events_scope_created_idx
  ON public.public_submission_events(scope, created_at DESC);

CREATE INDEX IF NOT EXISTS public_submission_events_scope_ip_created_idx
  ON public.public_submission_events(scope, requester_ip, created_at DESC)
  WHERE requester_ip IS NOT NULL;

CREATE INDEX IF NOT EXISTS public_submission_events_scope_subject_created_idx
  ON public.public_submission_events(scope, subject, created_at DESC)
  WHERE subject IS NOT NULL;

CREATE INDEX IF NOT EXISTS public_submission_events_site_created_idx
  ON public.public_submission_events(wedding_site_id, created_at DESC)
  WHERE wedding_site_id IS NOT NULL;

DROP POLICY IF EXISTS "Public submission events visible to site owners" ON public.public_submission_events;
CREATE POLICY "Public submission events visible to site owners"
  ON public.public_submission_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.wedding_sites ws
      WHERE ws.id = public_submission_events.wedding_site_id
        AND (
          ws.user_id = auth.uid()
          OR public.dayof_has_site_role(ws.id, ARRAY['owner', 'admin', 'coordinator', 'planner', 'viewer'])
        )
    )
  );

DROP POLICY IF EXISTS "Public submission events service role insert" ON public.public_submission_events;
CREATE POLICY "Public submission events service role insert"
  ON public.public_submission_events
  FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public submission events service role manage" ON public.public_submission_events;
CREATE POLICY "Public submission events service role manage"
  ON public.public_submission_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
