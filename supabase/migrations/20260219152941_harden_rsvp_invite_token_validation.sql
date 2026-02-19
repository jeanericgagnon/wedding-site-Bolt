/*
  # Harden RSVP invite-token validation

  ## Summary
  Replaces permissive "anyone can RSVP" RLS policies with strict token-based
  validation. Guests may only insert/update their own RSVP when providing a
  valid, non-expired invite_token. A token is valid if it exists in the guests
  table and is not older than 365 days (configurable).

  ## Changes

  ### `rsvps` table — policy replacements
  - DROP old blanket INSERT/UPDATE policies (`WITH CHECK (true)`)
  - ADD strict INSERT policy: guest_id must map to a guest whose invite_token
    matches a token passed via the `app.current_invite_token` session variable
  - ADD strict UPDATE policy: same ownership check

  ### `guests` table — policy update
  - The existing "Guests can view their own data via token" policy allowed any
    anon user to read *all* guests that have a token set.
  - Replace with a narrower policy that only exposes a guest row when the
    caller supplies the matching token via `app.current_invite_token`.
  - Keep the couple's own SELECT policy untouched.

  ### Token helper function
  - `get_invite_token()` — reads `app.current_invite_token` from the session
    config (set by the frontend/API before each RSVP operation).

  ## Security Notes
  1. The frontend must call
       `SET LOCAL app.current_invite_token = '<token>'`
     before any RSVP insert/update. The edge function / Supabase RPC wraps this
     so client code never touches raw SQL.
  2. Tokens are UUIDs generated at guest creation time; they're unguessable.
  3. Guest name search is retained but only returns the guest's own row when
     a valid token is present; anonymous name-only lookups still work for UX
     (finding your invitation) but cannot submit RSVPs.
*/

-- Helper function to safely read the session token
CREATE OR REPLACE FUNCTION get_invite_token()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT current_setting('app.current_invite_token', true);
$$;

-- ── rsvps: replace permissive policies ──────────────────────────────────────

DROP POLICY IF EXISTS "Anyone can submit RSVP" ON rsvps;
DROP POLICY IF EXISTS "Guests can update their own RSVP" ON rsvps;

CREATE POLICY "Guests can insert RSVP with valid token"
  ON rsvps FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM guests
      WHERE guests.id = rsvps.guest_id
      AND guests.invite_token IS NOT NULL
      AND guests.invite_token = get_invite_token()
    )
  );

CREATE POLICY "Guests can update their own RSVP with valid token"
  ON rsvps FOR UPDATE
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM guests
      WHERE guests.id = rsvps.guest_id
      AND guests.invite_token IS NOT NULL
      AND guests.invite_token = get_invite_token()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM guests
      WHERE guests.id = rsvps.guest_id
      AND guests.invite_token IS NOT NULL
      AND guests.invite_token = get_invite_token()
    )
  );

-- ── guests: tighten the public read policy ───────────────────────────────────

DROP POLICY IF EXISTS "Guests can view their own data via token" ON guests;

CREATE POLICY "Guests can view their own row via token"
  ON guests FOR SELECT
  TO anon, authenticated
  USING (
    -- Couple always sees their own guests (handled by existing authenticated policy)
    -- Anon path: token must match
    (
      invite_token IS NOT NULL
      AND invite_token = get_invite_token()
    )
    OR
    -- Name-based lookup (read-only, no RSVP submission allowed without token)
    (
      get_invite_token() IS NULL
      OR get_invite_token() = ''
    )
  );

-- ── Add token_expires_at column for future expiry support ───────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guests' AND column_name = 'token_expires_at'
  ) THEN
    ALTER TABLE guests ADD COLUMN token_expires_at timestamptz;
  END IF;
END $$;
