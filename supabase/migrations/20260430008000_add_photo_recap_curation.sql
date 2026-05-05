ALTER TABLE public.photo_uploads
  ADD COLUMN IF NOT EXISTS recap_hidden boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recap_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recap_story boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recap_curated_at timestamptz,
  ADD COLUMN IF NOT EXISTS recap_curated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_photo_uploads_recap_curation
  ON public.photo_uploads(wedding_site_id, recap_hidden, recap_featured, recap_story, uploaded_at DESC);
