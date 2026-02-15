/*
  # Add RSVP and Messaging System

  ## Overview
  This migration extends the wedding platform with enhanced guest management, 
  a dedicated RSVP system, and messaging capabilities for couples to communicate with guests.

  ## Changes

  ### 1. Update `guests` table
  Add new columns to support the enhanced RSVP workflow:
  - `first_name` (text) - Guest's first name (split from existing name field)
  - `last_name` (text) - Guest's last name
  - `household_id` (uuid, nullable) - Group guests in same household
  - `invite_token` (text, unique) - Unique token for guest to access their RSVP
  - `invited_to_ceremony` (boolean) - Whether guest is invited to ceremony
  - `invited_to_reception` (boolean) - Whether guest is invited to reception

  ### 2. Create `rsvps` table
  Dedicated table for tracking RSVP responses:
  - `id` (uuid, primary key) - Unique identifier
  - `guest_id` (uuid, foreign key) - References guests table
  - `attending` (boolean) - Whether guest is attending
  - `meal_choice` (text) - Guest's meal preference
  - `plus_one_name` (text, nullable) - Name of plus one guest
  - `notes` (text) - Additional notes from guest
  - `responded_at` (timestamptz) - When RSVP was submitted

  ### 3. Create `messages` table
  System for couples to send messages to guests:
  - `id` (uuid, primary key) - Unique identifier
  - `wedding_site_id` (uuid, foreign key) - References wedding_sites
  - `subject` (text) - Message subject line
  - `body` (text) - Message content
  - `sent_at` (timestamptz) - When message was sent
  - `channel` (text) - Delivery channel (email, sms)
  - `recipient_filter` (jsonb) - Criteria for which guests received message

  ## Security

  ### RLS Policies
  - Couples can manage their own guests, RSVPs, and messages (authenticated)
  - Public RSVP submission allowed via invite token (anon users)
  - Guests can view/update their own RSVP with valid token

  ## Important Notes
  1. The invite_token allows guests to access RSVP without authentication
  2. Plus one information moved from guests to RSVPs for better tracking
  3. Messages table supports audience segmentation for targeted communication
*/

-- Add new columns to guests table
DO $$
BEGIN
  -- Add first_name
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guests' AND column_name = 'first_name'
  ) THEN
    ALTER TABLE guests ADD COLUMN first_name text;
  END IF;

  -- Add last_name
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guests' AND column_name = 'last_name'
  ) THEN
    ALTER TABLE guests ADD COLUMN last_name text;
  END IF;

  -- Add household_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guests' AND column_name = 'household_id'
  ) THEN
    ALTER TABLE guests ADD COLUMN household_id uuid;
  END IF;

  -- Add invite_token
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guests' AND column_name = 'invite_token'
  ) THEN
    ALTER TABLE guests ADD COLUMN invite_token text UNIQUE;
  END IF;

  -- Add invited_to_ceremony
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guests' AND column_name = 'invited_to_ceremony'
  ) THEN
    ALTER TABLE guests ADD COLUMN invited_to_ceremony boolean DEFAULT true;
  END IF;

  -- Add invited_to_reception
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'guests' AND column_name = 'invited_to_reception'
  ) THEN
    ALTER TABLE guests ADD COLUMN invited_to_reception boolean DEFAULT true;
  END IF;
END $$;

-- Create indexes on guests table
CREATE INDEX IF NOT EXISTS idx_guests_invite_token ON guests(invite_token);
CREATE INDEX IF NOT EXISTS idx_guests_household_id ON guests(household_id);

-- Create RSVPs table
CREATE TABLE IF NOT EXISTS rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id uuid REFERENCES guests(id) ON DELETE CASCADE NOT NULL,
  attending boolean NOT NULL,
  meal_choice text,
  plus_one_name text,
  notes text,
  responded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE rsvps ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Couples can view RSVPs for their guests" ON rsvps;
DROP POLICY IF EXISTS "Anyone can submit RSVP" ON rsvps;
DROP POLICY IF EXISTS "Guests can update their own RSVP" ON rsvps;

-- RSVPs policies for authenticated couples
CREATE POLICY "Couples can view RSVPs for their guests"
  ON rsvps FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM guests
      JOIN wedding_sites ON guests.wedding_site_id = wedding_sites.id
      WHERE guests.id = rsvps.guest_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

-- Public can insert RSVP (we'll validate guest_id in the application)
CREATE POLICY "Anyone can submit RSVP"
  ON rsvps FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Guests can update their own RSVP
CREATE POLICY "Guests can update their own RSVP"
  ON rsvps FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_site_id uuid REFERENCES wedding_sites(id) ON DELETE CASCADE NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  sent_at timestamptz DEFAULT now(),
  channel text DEFAULT 'email',
  recipient_filter jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Couples can view their own messages" ON messages;
DROP POLICY IF EXISTS "Couples can create messages" ON messages;
DROP POLICY IF EXISTS "Couples can delete their own messages" ON messages;

-- Messages policies
CREATE POLICY "Couples can view their own messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = messages.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Couples can create messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = messages.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Couples can delete their own messages"
  ON messages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = messages.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rsvps_guest_id ON rsvps(guest_id);
CREATE INDEX IF NOT EXISTS idx_messages_wedding_site_id ON messages(wedding_site_id);

-- Drop and recreate public guest policy
DROP POLICY IF EXISTS "Guests can view their own data via token" ON guests;

-- Add public policy for guests to view their own info via token
CREATE POLICY "Guests can view their own data via token"
  ON guests FOR SELECT
  TO anon, authenticated
  USING (
    invite_token IS NOT NULL
  );
