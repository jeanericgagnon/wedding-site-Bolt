/*
  # Restore published_json runtime column

  The publish flow writes a snapshot of the public builder project to
  wedding_sites.published_json. Some production databases can have the
  migration recorded without the runtime column, so keep this repair guarded.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'wedding_sites'
      AND column_name = 'published_json'
  ) THEN
    ALTER TABLE public.wedding_sites ADD COLUMN published_json jsonb;
  END IF;
END $$;
