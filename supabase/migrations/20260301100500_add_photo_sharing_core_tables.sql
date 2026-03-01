-- Add missing core photo sharing tables referenced by dashboard overview/photo pages

CREATE TABLE IF NOT EXISTS public.photo_albums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_site_id uuid NOT NULL REFERENCES public.wedding_sites(id) ON DELETE CASCADE,
  itinerary_event_id uuid NULL,
  name text NOT NULL,
  description text NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_photo_albums_site ON public.photo_albums(wedding_site_id);
CREATE INDEX IF NOT EXISTS idx_photo_albums_active ON public.photo_albums(wedding_site_id, is_active);

ALTER TABLE public.photo_albums ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY photo_albums_owner_select
    ON public.photo_albums FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.wedding_sites ws
        WHERE ws.id = photo_albums.wedding_site_id
          AND ws.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY photo_albums_owner_insert
    ON public.photo_albums FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.wedding_sites ws
        WHERE ws.id = photo_albums.wedding_site_id
          AND ws.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY photo_albums_owner_update
    ON public.photo_albums FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM public.wedding_sites ws
        WHERE ws.id = photo_albums.wedding_site_id
          AND ws.user_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.wedding_sites ws
        WHERE ws.id = photo_albums.wedding_site_id
          AND ws.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY photo_albums_owner_delete
    ON public.photo_albums FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM public.wedding_sites ws
        WHERE ws.id = photo_albums.wedding_site_id
          AND ws.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.photo_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_site_id uuid NOT NULL REFERENCES public.wedding_sites(id) ON DELETE CASCADE,
  album_id uuid NULL REFERENCES public.photo_albums(id) ON DELETE SET NULL,
  storage_path text NULL,
  image_url text NULL,
  caption text NULL,
  guest_name text NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_photo_uploads_site ON public.photo_uploads(wedding_site_id);
CREATE INDEX IF NOT EXISTS idx_photo_uploads_album ON public.photo_uploads(album_id);

ALTER TABLE public.photo_uploads ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY photo_uploads_owner_select
    ON public.photo_uploads FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.wedding_sites ws
        WHERE ws.id = photo_uploads.wedding_site_id
          AND ws.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY photo_uploads_owner_insert
    ON public.photo_uploads FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.wedding_sites ws
        WHERE ws.id = photo_uploads.wedding_site_id
          AND ws.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY photo_uploads_owner_update
    ON public.photo_uploads FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM public.wedding_sites ws
        WHERE ws.id = photo_uploads.wedding_site_id
          AND ws.user_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.wedding_sites ws
        WHERE ws.id = photo_uploads.wedding_site_id
          AND ws.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY photo_uploads_owner_delete
    ON public.photo_uploads FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM public.wedding_sites ws
        WHERE ws.id = photo_uploads.wedding_site_id
          AND ws.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
