/*
  # Add Site Expiry and Billing Type

  ## Summary
  Adds two columns to `wedding_sites` to track how long a site is active and whether
  the user is on a one-time purchase (2-year access) or a recurring subscription.

  ## New Columns on `wedding_sites`
  - `site_expires_at` (timestamptz, nullable) — when site access expires; NULL means never (recurring)
  - `billing_type` (text, default 'one_time') — enum: one_time | recurring

  ## Logic
  - On successful one-time payment: set site_expires_at = paid_at + 2 years, billing_type = 'one_time'
  - On subscription activation: set site_expires_at = NULL, billing_type = 'recurring'
  - On subscription cancellation: set billing_type = 'one_time', restore expiry from paid_at
  - Existing active rows are grandfathered with a 2-year expiry from now
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wedding_sites' AND column_name = 'billing_type'
  ) THEN
    ALTER TABLE public.wedding_sites
      ADD COLUMN billing_type text NOT NULL DEFAULT 'one_time'
        CHECK (billing_type IN ('one_time', 'recurring'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wedding_sites' AND column_name = 'site_expires_at'
  ) THEN
    ALTER TABLE public.wedding_sites ADD COLUMN site_expires_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wedding_sites' AND column_name = 'stripe_subscription_id'
  ) THEN
    ALTER TABLE public.wedding_sites ADD COLUMN stripe_subscription_id text;
  END IF;
END $$;

-- Grandfather existing active sites: give them a 2-year expiry from now
UPDATE public.wedding_sites
SET site_expires_at = now() + interval '2 years'
WHERE payment_status = 'active'
  AND site_expires_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_wedding_sites_site_expires_at
  ON public.wedding_sites(site_expires_at)
  WHERE site_expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wedding_sites_stripe_subscription_id
  ON public.wedding_sites(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;
