ALTER TABLE public.photo_albums
  ADD COLUMN IF NOT EXISTS ai_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS bucket_type text NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS ai_description text,
  ADD COLUMN IF NOT EXISTS sort_priority integer NOT NULL DEFAULT 50;

UPDATE public.photo_albums
SET ai_enabled = false,
    bucket_type = 'test',
    ai_description = COALESCE(ai_description, 'Internal QA/test bucket. Do not use for AI photo organization.'),
    sort_priority = 999
WHERE lower(name) ~ '(qa|e2e|smoke|browser guest upload|test)'
   OR lower(slug) ~ '(qa|e2e|smoke|browser|test)';

UPDATE public.photo_albums
SET bucket_type = CASE
    WHEN lower(name) ~ '(ceremony|vow|aisle)' THEN 'ceremony'
    WHEN lower(name) ~ '(reception|dinner|toast|speech|cake)' THEN 'reception'
    WHEN lower(name) ~ '(dance|party|dj)' THEN 'dance_floor'
    WHEN lower(name) ~ '(family|parents|friends)' THEN 'family_friends'
    WHEN lower(name) ~ '(venue|detail|decor|flower|ring)' THEN 'details'
    WHEN lower(name) ~ '(welcome|travel|weekend|brunch|rehearsal)' THEN 'weekend'
    WHEN lower(name) ~ '(couple|portrait|you two|romantic)' THEN 'couple'
    ELSE bucket_type
  END,
  ai_description = COALESCE(ai_description, CASE
    WHEN lower(name) ~ '(ceremony|vow|aisle)' THEN 'Use for ceremony moments, vows, aisle, processional, recessional, and emotional formal moments.'
    WHEN lower(name) ~ '(reception|dinner|toast|speech|cake)' THEN 'Use for reception moments, dinner, toasts, speeches, cake, and room energy.'
    WHEN lower(name) ~ '(dance|party|dj)' THEN 'Use for dance floor, party, DJ, late-night, and high-energy moments.'
    WHEN lower(name) ~ '(family|parents|friends)' THEN 'Use for family, friends, group candids, and guest connection moments.'
    WHEN lower(name) ~ '(venue|detail|decor|flower|ring)' THEN 'Use for venue, decor, florals, rings, invitations, tablescapes, food, and detail shots.'
    WHEN lower(name) ~ '(welcome|travel|weekend|brunch|rehearsal)' THEN 'Use for wedding-weekend, welcome party, travel, brunch, rehearsal, and destination context.'
    WHEN lower(name) ~ '(couple|portrait|you two|romantic)' THEN 'Use for couple portraits, romantic moments, and hero-worthy photos of the couple.'
    ELSE 'General guest photo bucket.'
  END)
WHERE ai_enabled = true;

CREATE TABLE IF NOT EXISTS public.photo_upload_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id uuid NOT NULL REFERENCES public.photo_uploads(id) ON DELETE CASCADE,
  wedding_site_id uuid NOT NULL REFERENCES public.wedding_sites(id) ON DELETE CASCADE,
  photo_album_id uuid REFERENCES public.photo_albums(id) ON DELETE SET NULL,
  file_sha256 text NOT NULL,
  perceptual_hash text,
  width integer,
  height integer,
  orientation integer,
  taken_at timestamptz,
  camera_make text,
  camera_model text,
  gps_lat numeric,
  gps_lng numeric,
  gps_altitude numeric,
  location_precision text,
  location_label text,
  event_match_id uuid REFERENCES public.itinerary_events(id) ON DELETE SET NULL,
  event_match_confidence numeric CHECK (event_match_confidence IS NULL OR (event_match_confidence >= 0 AND event_match_confidence <= 1)),
  event_match_reason text,
  metadata_source text NOT NULL DEFAULT 'upload',
  has_exif boolean NOT NULL DEFAULT false,
  has_gps boolean NOT NULL DEFAULT false,
  raw_exif jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (upload_id)
);

CREATE INDEX IF NOT EXISTS idx_photo_upload_metadata_site_taken
  ON public.photo_upload_metadata(wedding_site_id, taken_at);

CREATE INDEX IF NOT EXISTS idx_photo_upload_metadata_file_hash
  ON public.photo_upload_metadata(wedding_site_id, file_sha256);

CREATE INDEX IF NOT EXISTS idx_photo_upload_metadata_event
  ON public.photo_upload_metadata(event_match_id);

CREATE OR REPLACE FUNCTION public.update_photo_upload_metadata_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_photo_upload_metadata_updated_at ON public.photo_upload_metadata;
CREATE TRIGGER trg_photo_upload_metadata_updated_at
BEFORE UPDATE ON public.photo_upload_metadata
FOR EACH ROW EXECUTE FUNCTION public.update_photo_upload_metadata_updated_at();

ALTER TABLE public.photo_upload_metadata ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "photo_upload_metadata_owner_select" ON public.photo_upload_metadata;
CREATE POLICY "photo_upload_metadata_owner_select"
ON public.photo_upload_metadata FOR SELECT
TO authenticated
USING (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','coordinator','viewer']));

DROP POLICY IF EXISTS "photo_upload_metadata_owner_write" ON public.photo_upload_metadata;
CREATE POLICY "photo_upload_metadata_owner_write"
ON public.photo_upload_metadata FOR ALL
TO authenticated
USING (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','coordinator']))
WITH CHECK (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','coordinator']));
