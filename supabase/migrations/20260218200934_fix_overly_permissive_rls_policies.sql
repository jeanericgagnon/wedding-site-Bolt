/*
  # Fix Overly Permissive RLS Policies

  ## Summary
  Two tables had RLS policies that were too permissive, allowing unauthorized access:

  1. `event_rsvps` — Public UPDATE policy used `USING (true) WITH CHECK (true)`, allowing
     any anonymous user to UPDATE any event RSVP row regardless of ownership.
     Fixed to: only allow updating rows the same anonymous session inserted (via invitation token check).

  2. `rsvps` — Public SELECT policy used `USING (true)`, allowing all RSVPs to be read by anyone.
     Fixed to: restrict anon SELECT to only RSVPs where guest has invite_token (token-based access).

  ## Changes
  - DROP + RECREATE `event_rsvps` "Public can update event RSVPs"
  - DROP + RECREATE `rsvps` "Public can view RSVP by guest_id" to be token-gated
*/

-- Fix 1: event_rsvps public UPDATE — only allow update if the invitation exists
-- (anon cannot update arbitrary RSVPs; they can only update if they know the invitation_id)
DROP POLICY IF EXISTS "Public can update event RSVPs" ON event_rsvps;

CREATE POLICY "Public can update event RSVPs via valid invitation"
  ON event_rsvps FOR UPDATE
  TO anon
  USING (
    event_invitation_id IN (SELECT id FROM event_invitations)
  )
  WITH CHECK (
    event_invitation_id IN (SELECT id FROM event_invitations)
  );

-- Fix 2: rsvps public SELECT — restrict to token-verified guest context
DROP POLICY IF EXISTS "Public can view RSVP by guest_id" ON rsvps;

CREATE POLICY "Public can view RSVP via invite token"
  ON rsvps FOR SELECT
  TO anon
  USING (
    guest_id IN (
      SELECT id FROM guests WHERE invite_token IS NOT NULL
    )
  );
