/*
  # Vault media storage + metadata hardening

  ## Summary
  Enables first-class photo/video/voice uploads for Vault by:
  - adding `media_type` metadata to `vault_entries`
  - creating `vault-attachments` storage bucket
  - adding storage policies for upload/read/delete

  ## Notes
  - Upload path expected by app: `public/{wedding_site_id}/{vault_config_id}/{file}`
  - Public read is enabled to support share-link playback of uploaded media
*/

-- 1) Add media metadata columns to vault_entries
ALTER TABLE public.vault_entries
  ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS mime_type text,
  ADD COLUMN IF NOT EXISTS size_bytes bigint,
  ADD COLUMN IF NOT EXISTS duration_seconds int;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'vault_entries_media_type_check'
      AND conrelid = 'public.vault_entries'::regclass
  ) THEN
    ALTER TABLE public.vault_entries
      ADD CONSTRAINT vault_entries_media_type_check
      CHECK (media_type IN ('text', 'photo', 'video', 'voice'));
  END IF;
END $$;

-- 2) Create/ensure vault-attachments bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vault-attachments',
  'vault-attachments',
  true,
  104857600, -- 100 MB
  ARRAY[
    'image/jpeg','image/jpg','image/png','image/webp','image/gif',
    'video/mp4','video/webm','video/quicktime',
    'audio/mpeg','audio/mp3','audio/wav','audio/webm','audio/ogg','audio/mp4','audio/aac','audio/x-m4a'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3) Storage policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public can read vault attachments'
  ) THEN
    CREATE POLICY "Public can read vault attachments"
      ON storage.objects
      FOR SELECT
      TO public
      USING (bucket_id = 'vault-attachments');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Anon and auth can upload vault attachments for published sites'
  ) THEN
    CREATE POLICY "Anon and auth can upload vault attachments for published sites"
      ON storage.objects
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (
        bucket_id = 'vault-attachments'
        AND (string_to_array(name, '/'))[1] = 'public'
        AND EXISTS (
          SELECT 1
          FROM public.wedding_sites ws
          WHERE ws.id::text = (string_to_array(name, '/'))[2]
            AND ws.is_published = true
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Owners can delete vault attachments for own sites'
  ) THEN
    CREATE POLICY "Owners can delete vault attachments for own sites"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'vault-attachments'
        AND (string_to_array(name, '/'))[1] = 'public'
        AND EXISTS (
          SELECT 1
          FROM public.wedding_sites ws
          WHERE ws.id::text = (string_to_array(name, '/'))[2]
            AND ws.user_id = auth.uid()
        )
      );
  END IF;
END $$;
