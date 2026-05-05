CREATE TABLE IF NOT EXISTS public.photo_ai_bucket_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_site_id uuid NOT NULL REFERENCES public.wedding_sites(id) ON DELETE CASCADE,
  upload_id uuid REFERENCES public.photo_uploads(id) ON DELETE CASCADE,
  previous_bucket_id uuid REFERENCES public.photo_albums(id) ON DELETE SET NULL,
  suggested_bucket_id uuid REFERENCES public.photo_albums(id) ON DELETE SET NULL,
  chosen_bucket_id uuid REFERENCES public.photo_albums(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('accepted', 'rejected', 'manual')),
  confidence numeric CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_photo_ai_bucket_corrections_site_recent
  ON public.photo_ai_bucket_corrections(wedding_site_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_photo_ai_bucket_corrections_upload
  ON public.photo_ai_bucket_corrections(upload_id);

ALTER TABLE public.photo_ai_bucket_corrections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "photo_ai_bucket_corrections_select" ON public.photo_ai_bucket_corrections;
CREATE POLICY "photo_ai_bucket_corrections_select"
ON public.photo_ai_bucket_corrections FOR SELECT
TO authenticated
USING (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','coordinator','viewer']));

DROP POLICY IF EXISTS "photo_ai_bucket_corrections_insert" ON public.photo_ai_bucket_corrections;
CREATE POLICY "photo_ai_bucket_corrections_insert"
ON public.photo_ai_bucket_corrections FOR INSERT
TO authenticated
WITH CHECK (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','coordinator']));

DROP POLICY IF EXISTS "photo_ai_bucket_corrections_update" ON public.photo_ai_bucket_corrections;
CREATE POLICY "photo_ai_bucket_corrections_update"
ON public.photo_ai_bucket_corrections FOR UPDATE
TO authenticated
USING (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','coordinator']))
WITH CHECK (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','coordinator']));
