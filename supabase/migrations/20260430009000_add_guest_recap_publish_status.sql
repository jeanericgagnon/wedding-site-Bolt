ALTER TABLE public.guest_hub_settings
  ADD COLUMN IF NOT EXISTS recap_status text NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS recap_published_at timestamptz,
  ADD COLUMN IF NOT EXISTS recap_closed_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'guest_hub_settings_recap_status_check'
  ) THEN
    ALTER TABLE public.guest_hub_settings
      ADD CONSTRAINT guest_hub_settings_recap_status_check
      CHECK (recap_status IN ('draft', 'private_link', 'published', 'closed'));
  END IF;
END $$;

UPDATE public.guest_hub_settings
SET recap_published_at = COALESCE(recap_published_at, updated_at, now())
WHERE recap_status = 'published' AND recap_published_at IS NULL;
