-- Phase 3: moderation controls for photo uploads

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'photo_uploads'
  ) THEN
    ALTER TABLE public.photo_uploads
      ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS is_flagged boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS moderated_at timestamptz,
      ADD COLUMN IF NOT EXISTS moderated_by uuid REFERENCES auth.users(id);

    CREATE INDEX IF NOT EXISTS idx_photo_uploads_hidden_flagged
      ON public.photo_uploads (photo_album_id, is_hidden, is_flagged, uploaded_at DESC);
  END IF;
END $$;
