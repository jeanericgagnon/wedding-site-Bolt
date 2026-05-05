CREATE TABLE IF NOT EXISTS public.email_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid REFERENCES public.wedding_sites(id) ON DELETE CASCADE,
  guest_id uuid REFERENCES public.guests(id) ON DELETE SET NULL,
  type text NOT NULL,
  payload_json jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  attempts int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  scheduled_for timestamptz,
  sent_at timestamptz,
  error text
);

ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role only — email_queue select" ON public.email_queue;
CREATE POLICY "Service role only — email_queue select"
  ON public.email_queue FOR SELECT
  TO service_role
  USING (true);

DROP POLICY IF EXISTS "Service role only — email_queue insert" ON public.email_queue;
CREATE POLICY "Service role only — email_queue insert"
  ON public.email_queue FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role only — email_queue update" ON public.email_queue;
CREATE POLICY "Service role only — email_queue update"
  ON public.email_queue FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role only — email_queue delete" ON public.email_queue;
CREATE POLICY "Service role only — email_queue delete"
  ON public.email_queue FOR DELETE
  TO service_role
  USING (true);

CREATE INDEX IF NOT EXISTS email_queue_status_created_idx ON public.email_queue (status, created_at);
CREATE INDEX IF NOT EXISTS email_queue_site_id_idx ON public.email_queue (site_id);

ALTER TABLE public.guest_prospect_optins
  ADD COLUMN IF NOT EXISTS recap_email_queued_at timestamptz,
  ADD COLUMN IF NOT EXISTS recap_email_queue_id uuid REFERENCES public.email_queue(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS future_event_email_queued_at timestamptz,
  ADD COLUMN IF NOT EXISTS future_event_email_queue_id uuid REFERENCES public.email_queue(id) ON DELETE SET NULL;

DO $$
BEGIN
  ALTER TABLE public.email_queue
    DROP CONSTRAINT IF EXISTS email_queue_type_check;

  ALTER TABLE public.email_queue
    ADD CONSTRAINT email_queue_type_check
    CHECK (type IN (
      'rsvp_notification',
      'rsvp_confirmation',
      'wedding_invitation',
      'signup_welcome',
      'guest_recap_available',
      'prospect_future_event'
    ));
END $$;

CREATE INDEX IF NOT EXISTS idx_guest_prospect_optins_recap_queue
  ON public.guest_prospect_optins(wedding_site_id, recap_email_queued_at)
  WHERE email IS NOT NULL AND wants_photo_updates = true;

CREATE INDEX IF NOT EXISTS idx_guest_prospect_optins_future_queue
  ON public.guest_prospect_optins(wedding_site_id, future_event_email_queued_at)
  WHERE email IS NOT NULL AND wants_own_event_info = true;
