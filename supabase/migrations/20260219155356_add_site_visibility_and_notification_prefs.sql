/*
  # Add site_visibility and notification_prefs columns

  ## Summary
  Two columns used by the Settings page were missing from the wedding_sites table.

  ## Changes
  - wedding_sites: add `site_visibility` (text) — controls public/private access, defaults to 'public'
  - wedding_sites: add `notification_prefs` (jsonb) — stores per-user email notification preferences

  ## Notes
  - Both additions use IF NOT EXISTS guards to be safe on re-run
  - Existing rows get the default values automatically
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wedding_sites' AND column_name = 'site_visibility'
  ) THEN
    ALTER TABLE wedding_sites ADD COLUMN site_visibility text NOT NULL DEFAULT 'public';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wedding_sites' AND column_name = 'notification_prefs'
  ) THEN
    ALTER TABLE wedding_sites ADD COLUMN notification_prefs jsonb DEFAULT '{"rsvp": true, "photos": true, "digest": false, "updates": false}'::jsonb;
  END IF;
END $$;
