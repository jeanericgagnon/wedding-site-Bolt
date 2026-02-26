-- Phase 2 seed: capture optional guest email for photo uploads

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'photo_uploads'
  ) THEN
    ALTER TABLE public.photo_uploads
      ADD COLUMN IF NOT EXISTS guest_email text;

    CREATE INDEX IF NOT EXISTS idx_photo_uploads_guest_email
      ON public.photo_uploads (guest_email)
      WHERE guest_email IS NOT NULL;
  END IF;
END $$;
