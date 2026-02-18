/*
  # Add Stripe Payment Fields to Wedding Sites

  ## Summary
  Adds payment tracking columns to the `wedding_sites` table to support a one-time
  Stripe Checkout payment flow. New users must complete payment before accessing
  onboarding/dashboard. Payment status transitions from `payment_required` to `active`
  only via webhook confirmation — never via success URL alone.

  ## New Columns on `wedding_sites`
  - `payment_status` (text, NOT NULL, default 'payment_required') — enum: payment_required | active | canceled
  - `stripe_customer_id` (text, nullable) — Stripe Customer object ID
  - `stripe_checkout_session_id` (text, nullable) — most recent Stripe Checkout Session ID
  - `paid_at` (timestamptz, nullable) — timestamp webhook confirmed payment

  ## Security Notes
  - `payment_status` defaults to `payment_required` for all new rows
  - Only the service role (webhook edge function) should transition to `active`
  - Authenticated users must NOT be able to self-elevate payment_status via RLS
  - Existing rows will get `payment_required` default — existing active users need a data migration
    or a permissive initial state (set below via UPDATE for existing rows)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wedding_sites' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE public.wedding_sites
      ADD COLUMN payment_status text NOT NULL DEFAULT 'payment_required'
        CHECK (payment_status IN ('payment_required', 'active', 'canceled'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wedding_sites' AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE public.wedding_sites ADD COLUMN stripe_customer_id text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wedding_sites' AND column_name = 'stripe_checkout_session_id'
  ) THEN
    ALTER TABLE public.wedding_sites ADD COLUMN stripe_checkout_session_id text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wedding_sites' AND column_name = 'paid_at'
  ) THEN
    ALTER TABLE public.wedding_sites ADD COLUMN paid_at timestamptz;
  END IF;
END $$;

-- Existing rows that already exist are considered active (grandfathered)
UPDATE public.wedding_sites
SET payment_status = 'active'
WHERE payment_status = 'payment_required';

-- Index for webhook lookups by checkout session
CREATE INDEX IF NOT EXISTS idx_wedding_sites_stripe_checkout_session_id
  ON public.wedding_sites(stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

-- Index for webhook lookups by customer
CREATE INDEX IF NOT EXISTS idx_wedding_sites_stripe_customer_id
  ON public.wedding_sites(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
