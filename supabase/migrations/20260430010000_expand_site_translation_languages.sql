DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.site_translations'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%language%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.site_translations DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE public.site_translations
  ADD CONSTRAINT site_translations_language_check
  CHECK (language IN ('es', 'fr', 'it', 'de', 'pt'));
