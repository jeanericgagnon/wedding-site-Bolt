CREATE TABLE IF NOT EXISTS public.photo_upload_ai_analysis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id uuid NOT NULL REFERENCES public.photo_uploads(id) ON DELETE CASCADE,
  wedding_site_id uuid NOT NULL REFERENCES public.wedding_sites(id) ON DELETE CASCADE,
  photo_album_id uuid REFERENCES public.photo_albums(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'fallback', 'skipped', 'failed')),
  provider text NOT NULL DEFAULT 'fallback',
  model text NOT NULL DEFAULT 'metadata',
  source_hash text NOT NULL,
  detected_moment text,
  suggested_bucket_id uuid REFERENCES public.photo_albums(id) ON DELETE SET NULL,
  suggested_bucket_name text,
  bucket_confidence numeric NOT NULL DEFAULT 0 CHECK (bucket_confidence >= 0 AND bucket_confidence <= 1),
  quality_score numeric NOT NULL DEFAULT 0.5 CHECK (quality_score >= 0 AND quality_score <= 1),
  blur_score numeric NOT NULL DEFAULT 0 CHECK (blur_score >= 0 AND blur_score <= 1),
  people_count_range text,
  is_video boolean NOT NULL DEFAULT false,
  slideshow_priority integer NOT NULL DEFAULT 50 CHECK (slideshow_priority >= 0 AND slideshow_priority <= 100),
  caption text,
  tags text[] NOT NULL DEFAULT '{}',
  warnings text[] NOT NULL DEFAULT '{}',
  error_message text,
  raw_result jsonb NOT NULL DEFAULT '{}'::jsonb,
  analyzed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (upload_id)
);

CREATE INDEX IF NOT EXISTS idx_photo_upload_ai_analysis_site
  ON public.photo_upload_ai_analysis(wedding_site_id, analyzed_at DESC);

CREATE INDEX IF NOT EXISTS idx_photo_upload_ai_analysis_bucket
  ON public.photo_upload_ai_analysis(suggested_bucket_id);

CREATE OR REPLACE FUNCTION public.update_photo_upload_ai_analysis_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_photo_upload_ai_analysis_updated_at ON public.photo_upload_ai_analysis;
CREATE TRIGGER trg_photo_upload_ai_analysis_updated_at
BEFORE UPDATE ON public.photo_upload_ai_analysis
FOR EACH ROW EXECUTE FUNCTION public.update_photo_upload_ai_analysis_updated_at();

ALTER TABLE public.photo_upload_ai_analysis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "photo_upload_ai_analysis_owner_select" ON public.photo_upload_ai_analysis;
CREATE POLICY "photo_upload_ai_analysis_owner_select"
ON public.photo_upload_ai_analysis FOR SELECT
TO authenticated
USING (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','coordinator','viewer']));

DROP POLICY IF EXISTS "photo_upload_ai_analysis_owner_write" ON public.photo_upload_ai_analysis;
CREATE POLICY "photo_upload_ai_analysis_owner_write"
ON public.photo_upload_ai_analysis FOR ALL
TO authenticated
USING (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','coordinator']))
WITH CHECK (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','coordinator']));
