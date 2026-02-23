-- Harden vault attachment access by removing unauthenticated public reads.
-- Attachments should be accessed via server-resolved signed links after unlock checks.

DO $$
BEGIN
  EXECUTE 'DROP POLICY IF EXISTS "Public can read vault attachments" ON storage.objects';
END $$;
