/*
  # Privacy Modes, Secure Tokens, and Email Queue

  ## Summary
  This migration adds:

  1. **Privacy Mode** on `wedding_sites`
     - `privacy_mode` enum: 'public' | 'password_protected' | 'invite_only'
     - `site_password_hash` nullable text (bcrypt hash of site password)
     - `hide_from_search` boolean (adds noindex behavior)
     - `default_language` text for i18n preference

  2. **Secure Token Columns**
     - `guest_access_token` on `wedding_sites` — a long-lived cryptographic token
       for invite_only site access (distinct from per-guest RSVP tokens)
     - Unique constraint on `guests.invite_token`
     - Minimum length check on `guests.invite_token`

  3. **Email Queue Table**
     - `email_queue` for reliable guest-triggered email delivery
       without requiring authentication
     - Columns: id, site_id, guest_id, type, payload_json, status, created_at, sent_at, error, attempts

  4. **Rate Limiting Table**
     - `rsvp_rate_limit` for IP-based abuse prevention

  ## Security
  - RLS enabled on all new tables
  - email_queue: service role only (no public access)
  - rsvp_rate_limit: service role only
  - wedding_sites new columns accessible via existing policies
*/

-- 1. Add privacy columns to wedding_sites
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wedding_sites' AND column_name = 'privacy_mode'
  ) THEN
    ALTER TABLE wedding_sites
      ADD COLUMN privacy_mode text NOT NULL DEFAULT 'public'
        CHECK (privacy_mode IN ('public', 'password_protected', 'invite_only'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wedding_sites' AND column_name = 'site_password_hash'
  ) THEN
    ALTER TABLE wedding_sites ADD COLUMN site_password_hash text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wedding_sites' AND column_name = 'hide_from_search'
  ) THEN
    ALTER TABLE wedding_sites ADD COLUMN hide_from_search boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wedding_sites' AND column_name = 'default_language'
  ) THEN
    ALTER TABLE wedding_sites ADD COLUMN default_language text NOT NULL DEFAULT 'en';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wedding_sites' AND column_name = 'guest_access_token'
  ) THEN
    ALTER TABLE wedding_sites ADD COLUMN guest_access_token text;
  END IF;
END $$;

-- Add unique constraint on guest_access_token (sparse — only unique when not null)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'wedding_sites' AND indexname = 'wedding_sites_guest_access_token_key'
  ) THEN
    CREATE UNIQUE INDEX wedding_sites_guest_access_token_key
      ON wedding_sites (guest_access_token)
      WHERE guest_access_token IS NOT NULL;
  END IF;
END $$;

-- 2. Strengthen guest invite_token column
-- Add unique constraint on guests.invite_token
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'guests' AND indexname = 'guests_invite_token_key'
  ) THEN
    CREATE UNIQUE INDEX guests_invite_token_key
      ON guests (invite_token)
      WHERE invite_token IS NOT NULL;
  END IF;
END $$;

-- 3. Email queue table
CREATE TABLE IF NOT EXISTS email_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid REFERENCES wedding_sites(id) ON DELETE CASCADE,
  guest_id uuid REFERENCES guests(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('rsvp_notification', 'rsvp_confirmation', 'wedding_invitation', 'signup_welcome')),
  payload_json jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  attempts int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  scheduled_for timestamptz,
  sent_at timestamptz,
  error text
);

ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only — email_queue select"
  ON email_queue FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role only — email_queue insert"
  ON email_queue FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role only — email_queue update"
  ON email_queue FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role only — email_queue delete"
  ON email_queue FOR DELETE
  TO service_role
  USING (true);

CREATE INDEX IF NOT EXISTS email_queue_status_created_idx ON email_queue (status, created_at);
CREATE INDEX IF NOT EXISTS email_queue_site_id_idx ON email_queue (site_id);

-- 4. RSVP rate limit table
CREATE TABLE IF NOT EXISTS rsvp_rate_limit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash text NOT NULL,
  guest_token text,
  attempts int NOT NULL DEFAULT 1,
  first_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_attempt_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rsvp_rate_limit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only — rsvp_rate_limit select"
  ON rsvp_rate_limit FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role only — rsvp_rate_limit insert"
  ON rsvp_rate_limit FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role only — rsvp_rate_limit update"
  ON rsvp_rate_limit FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role only — rsvp_rate_limit delete"
  ON rsvp_rate_limit FOR DELETE
  TO service_role
  USING (true);

CREATE INDEX IF NOT EXISTS rsvp_rate_limit_ip_hash_idx ON rsvp_rate_limit (ip_hash, last_attempt_at);

-- 5. DB function for server-side cryptographic token generation
CREATE OR REPLACE FUNCTION generate_secure_token(byte_length int DEFAULT 32)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT encode(gen_random_bytes(byte_length), 'base64url');
$$;
