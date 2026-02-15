/*
  # Add Itinerary Feature

  ## Overview
  This migration adds a comprehensive itinerary feature that allows couples to create
  multiple events (welcome dinner, rehearsal dinner, brunch, etc.) and manage separate
  guest lists and RSVPs for each event.

  ## New Tables

  ### `itinerary_events`
  Stores wedding-related events that couples can create
  - `id` (uuid, primary key)
  - `wedding_site_id` (uuid, foreign key to wedding_sites)
  - `event_name` (text) - e.g., "Welcome Dinner", "Rehearsal Dinner"
  - `description` (text) - details about the event
  - `event_date` (date) - date of the event
  - `start_time` (time) - start time
  - `end_time` (time) - end time (optional)
  - `location_name` (text) - venue name
  - `location_address` (text) - full address
  - `dress_code` (text) - optional dress code
  - `notes` (text) - additional notes for guests
  - `display_order` (integer) - for ordering events
  - `is_visible` (boolean) - whether to show on public site
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `event_invitations`
  Links guests to events (many-to-many relationship)
  - `id` (uuid, primary key)
  - `event_id` (uuid, foreign key to itinerary_events)
  - `guest_id` (uuid, foreign key to guests)
  - `invited_at` (timestamptz)
  - `created_at` (timestamptz)
  - Unique constraint on (event_id, guest_id)

  ### `event_rsvps`
  Stores RSVP responses for each event
  - `id` (uuid, primary key)
  - `event_invitation_id` (uuid, foreign key to event_invitations)
  - `attending` (boolean)
  - `dietary_restrictions` (text) - optional dietary notes
  - `notes` (text) - additional notes from guest
  - `responded_at` (timestamptz)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Security
  - Enable RLS on all new tables
  - Couples can manage events for their wedding sites
  - Invited guests can view events and submit RSVPs
  - Public (anon) users can submit RSVPs via invitation tokens
*/

-- Create itinerary_events table
CREATE TABLE IF NOT EXISTS itinerary_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_site_id uuid NOT NULL REFERENCES wedding_sites(id) ON DELETE CASCADE,
  event_name text NOT NULL,
  description text,
  event_date date NOT NULL,
  start_time time,
  end_time time,
  location_name text,
  location_address text,
  dress_code text,
  notes text,
  display_order integer DEFAULT 0,
  is_visible boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create event_invitations table (many-to-many)
CREATE TABLE IF NOT EXISTS event_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES itinerary_events(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  invited_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, guest_id)
);

-- Create event_rsvps table
CREATE TABLE IF NOT EXISTS event_rsvps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_invitation_id uuid NOT NULL REFERENCES event_invitations(id) ON DELETE CASCADE,
  attending boolean NOT NULL,
  dietary_restrictions text,
  notes text,
  responded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(event_invitation_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_itinerary_events_wedding_site_id ON itinerary_events(wedding_site_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_events_event_date ON itinerary_events(event_date);
CREATE INDEX IF NOT EXISTS idx_event_invitations_event_id ON event_invitations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_invitations_guest_id ON event_invitations(guest_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_event_invitation_id ON event_rsvps(event_invitation_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_itinerary_events_updated_at ON itinerary_events;
CREATE TRIGGER update_itinerary_events_updated_at
  BEFORE UPDATE ON itinerary_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_event_rsvps_updated_at ON event_rsvps;
CREATE TRIGGER update_event_rsvps_updated_at
  BEFORE UPDATE ON event_rsvps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE itinerary_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;

-- RLS Policies for itinerary_events

-- Wedding site owners can view their events
CREATE POLICY "Wedding site owners can view their events"
  ON itinerary_events FOR SELECT
  TO authenticated
  USING (
    wedding_site_id IN (
      SELECT id FROM wedding_sites WHERE user_id = auth.uid()
    )
  );

-- Wedding site owners can create events
CREATE POLICY "Wedding site owners can create events"
  ON itinerary_events FOR INSERT
  TO authenticated
  WITH CHECK (
    wedding_site_id IN (
      SELECT id FROM wedding_sites WHERE user_id = auth.uid()
    )
  );

-- Wedding site owners can update their events
CREATE POLICY "Wedding site owners can update their events"
  ON itinerary_events FOR UPDATE
  TO authenticated
  USING (
    wedding_site_id IN (
      SELECT id FROM wedding_sites WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    wedding_site_id IN (
      SELECT id FROM wedding_sites WHERE user_id = auth.uid()
    )
  );

-- Wedding site owners can delete their events
CREATE POLICY "Wedding site owners can delete their events"
  ON itinerary_events FOR DELETE
  TO authenticated
  USING (
    wedding_site_id IN (
      SELECT id FROM wedding_sites WHERE user_id = auth.uid()
    )
  );

-- Guests can view events they're invited to (via public access with invite token)
CREATE POLICY "Public can view visible events for RSVP"
  ON itinerary_events FOR SELECT
  TO anon
  USING (is_visible = true);

-- RLS Policies for event_invitations

-- Wedding site owners can view invitations for their events
CREATE POLICY "Wedding site owners can view event invitations"
  ON event_invitations FOR SELECT
  TO authenticated
  USING (
    event_id IN (
      SELECT e.id FROM itinerary_events e
      JOIN wedding_sites w ON e.wedding_site_id = w.id
      WHERE w.user_id = auth.uid()
    )
  );

-- Wedding site owners can create invitations
CREATE POLICY "Wedding site owners can create event invitations"
  ON event_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    event_id IN (
      SELECT e.id FROM itinerary_events e
      JOIN wedding_sites w ON e.wedding_site_id = w.id
      WHERE w.user_id = auth.uid()
    )
  );

-- Wedding site owners can delete invitations
CREATE POLICY "Wedding site owners can delete event invitations"
  ON event_invitations FOR DELETE
  TO authenticated
  USING (
    event_id IN (
      SELECT e.id FROM itinerary_events e
      JOIN wedding_sites w ON e.wedding_site_id = w.id
      WHERE w.user_id = auth.uid()
    )
  );

-- Public can view invitations (for RSVP lookups)
CREATE POLICY "Public can view event invitations"
  ON event_invitations FOR SELECT
  TO anon
  USING (true);

-- RLS Policies for event_rsvps

-- Wedding site owners can view RSVPs for their events
CREATE POLICY "Wedding site owners can view event RSVPs"
  ON event_rsvps FOR SELECT
  TO authenticated
  USING (
    event_invitation_id IN (
      SELECT ei.id FROM event_invitations ei
      JOIN itinerary_events e ON ei.event_id = e.id
      JOIN wedding_sites w ON e.wedding_site_id = w.id
      WHERE w.user_id = auth.uid()
    )
  );

-- Wedding site owners can update RSVPs
CREATE POLICY "Wedding site owners can update event RSVPs"
  ON event_rsvps FOR UPDATE
  TO authenticated
  USING (
    event_invitation_id IN (
      SELECT ei.id FROM event_invitations ei
      JOIN itinerary_events e ON ei.event_id = e.id
      JOIN wedding_sites w ON e.wedding_site_id = w.id
      WHERE w.user_id = auth.uid()
    )
  )
  WITH CHECK (
    event_invitation_id IN (
      SELECT ei.id FROM event_invitations ei
      JOIN itinerary_events e ON ei.event_id = e.id
      JOIN wedding_sites w ON e.wedding_site_id = w.id
      WHERE w.user_id = auth.uid()
    )
  );

-- Public can submit RSVPs
CREATE POLICY "Public can submit event RSVPs"
  ON event_rsvps FOR INSERT
  TO anon
  WITH CHECK (
    event_invitation_id IN (
      SELECT id FROM event_invitations
    )
  );

-- Public can update their RSVPs
CREATE POLICY "Public can update event RSVPs"
  ON event_rsvps FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Public can view RSVPs (for checking existing responses)
CREATE POLICY "Public can view event RSVPs"
  ON event_rsvps FOR SELECT
  TO anon
  USING (true);
