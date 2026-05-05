CREATE TABLE IF NOT EXISTS public.internal_ai_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_site_id uuid REFERENCES public.wedding_sites(id) ON DELETE CASCADE,
  upload_id uuid REFERENCES public.photo_uploads(id) ON DELETE SET NULL,
  feature text NOT NULL DEFAULT 'photo_vision',
  provider text NOT NULL,
  model text NOT NULL,
  input_tokens integer NOT NULL DEFAULT 0,
  cached_input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  total_tokens integer NOT NULL DEFAULT 0,
  estimated_cost_usd numeric(12, 6) NOT NULL DEFAULT 0,
  raw_usage jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.internal_ai_usage_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "internal_ai_usage_events_service_select" ON public.internal_ai_usage_events;
CREATE POLICY "internal_ai_usage_events_service_select"
ON public.internal_ai_usage_events FOR SELECT
TO service_role
USING (true);

DROP POLICY IF EXISTS "internal_ai_usage_events_service_insert" ON public.internal_ai_usage_events;
CREATE POLICY "internal_ai_usage_events_service_insert"
ON public.internal_ai_usage_events FOR INSERT
TO service_role
WITH CHECK (true);

DROP POLICY IF EXISTS "internal_ai_usage_events_service_update" ON public.internal_ai_usage_events;
CREATE POLICY "internal_ai_usage_events_service_update"
ON public.internal_ai_usage_events FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "internal_ai_usage_events_service_delete" ON public.internal_ai_usage_events;
CREATE POLICY "internal_ai_usage_events_service_delete"
ON public.internal_ai_usage_events FOR DELETE
TO service_role
USING (true);

CREATE INDEX IF NOT EXISTS idx_internal_ai_usage_events_site_created
  ON public.internal_ai_usage_events(wedding_site_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_internal_ai_usage_events_feature_model_created
  ON public.internal_ai_usage_events(feature, provider, model, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_internal_ai_usage_events_created_site
  ON public.internal_ai_usage_events(created_at DESC, wedding_site_id);
