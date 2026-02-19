/*
  # Add default_language column to wedding_sites

  ## Changes
  - Adds `default_language` (text, default 'en') to `wedding_sites`
  - Allows couples to set a preferred language for their public site

  ## Notes
  - Supported values: 'en', 'es' (extensible)
  - Falls back to browser language if null
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wedding_sites' AND column_name = 'default_language'
  ) THEN
    ALTER TABLE wedding_sites ADD COLUMN default_language text DEFAULT 'en';
  END IF;
END $$;
