/*
  # Create wedding-media storage bucket

  ## Summary
  The `wedding-media` bucket did not exist, causing all uploads to fail with a
  storage error. This migration creates the bucket and adds the minimum required
  RLS storage policies.

  ## Changes
  1. Creates `wedding-media` public bucket (images served via public URL)
  2. INSERT policy: authenticated users may upload only into their own weddingId folder
  3. SELECT policy: anyone may read objects (public site guests need to view photos)
  4. DELETE policy: authenticated users may delete only their own objects

  ## Notes
  - The bucket is set to public so `getPublicUrl()` works without signing
  - Upload path pattern is `{weddingId}/{timestamp}_{random}.{ext}` — the policy
    checks that the first path segment matches a wedding site owned by the user
*/

-- Create the bucket (idempotent via DO block)
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'wedding-media',
    'wedding-media',
    true,
    10485760,  -- 10 MB
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
  )
  ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;
END $$;

-- Authenticated users can upload to their own wedding folder
CREATE POLICY "Authenticated users can upload wedding media"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'wedding-media'
    AND (
      SELECT COUNT(*) FROM public.wedding_sites
      WHERE id::text = (string_to_array(name, '/'))[1]
        AND user_id = auth.uid()
    ) > 0
  );

-- Anyone can read media (guests viewing the public wedding site)
CREATE POLICY "Public can read wedding media"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'wedding-media');

-- Authenticated users can delete their own wedding media
CREATE POLICY "Authenticated users can delete own wedding media"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'wedding-media'
    AND (
      SELECT COUNT(*) FROM public.wedding_sites
      WHERE id::text = (string_to_array(name, '/'))[1]
        AND user_id = auth.uid()
    ) > 0
  );
