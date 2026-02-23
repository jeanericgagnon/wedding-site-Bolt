/*
  # Vault media storage compatibility fix

  Re-applies vault media metadata + storage policies with compatibility for
  projects where wedding_sites.is_published may not exist.
*/

-- 1) Metadata columns (idempotent)
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

-- 2) Bucket setup + cost-safe caps
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vault-attachments',
  'vault-attachments',
  true,
  41943040,
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

-- 3) Policies (drop + recreate with compatibility)
DO $$
DECLARE
  has_is_published boolean;
  upload_check text;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'wedding_sites'
      AND column_name = 'is_published'
  ) INTO has_is_published;

  IF has_is_published THEN
    upload_check := 'bucket_id = ''vault-attachments'' AND (string_to_array(name, ''/''))[1] = ''public'' AND EXISTS (SELECT 1 FROM public.wedding_sites ws WHERE ws.id::text = (string_to_array(name, ''/''))[2] AND ws.is_published = true)';
  ELSE
    upload_check := 'bucket_id = ''vault-attachments'' AND (string_to_array(name, ''/''))[1] = ''public'' AND EXISTS (SELECT 1 FROM public.wedding_sites ws WHERE ws.id::text = (string_to_array(name, ''/''))[2])';
  END IF;

  EXECUTE 'DROP POLICY IF EXISTS "Public can read vault attachments" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "Anon and auth can upload vault attachments for published sites" ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS "Owners can delete vault attachments for own sites" ON storage.objects';

  EXECUTE '
    CREATE POLICY "Public can read vault attachments"
      ON storage.objects
      FOR SELECT
      TO public
      USING (bucket_id = ''vault-attachments'')
  ';

  EXECUTE format('
    CREATE POLICY "Anon and auth can upload vault attachments for published sites"
      ON storage.objects
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (%s)
  ', upload_check);

  EXECUTE '
    CREATE POLICY "Owners can delete vault attachments for own sites"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id = ''vault-attachments''
        AND (string_to_array(name, ''/''))[1] = ''public''
        AND EXISTS (
          SELECT 1
          FROM public.wedding_sites ws
          WHERE ws.id::text = (string_to_array(name, ''/''))[2]
            AND ws.user_id = auth.uid()
        )
      )
  ';
END $$;
