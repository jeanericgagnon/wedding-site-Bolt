/*
  # Add Wedding Planning Status Tracking

  1. New Columns
    - Add `planning_status` to `wedding_sites` table
      - Stores which stage the couple is in their planning
    - Add `venue_name` (text)
    - Add `venue_address` (text)
    - Add `venue_date` (date)
    - Add `expected_guest_count` (integer)
    - Add `invitations_sent_date` (date)
  
  2. Changes
    - Adds columns to track wedding planning progress
    - Allows couples to specify their current planning stage
*/

DO $$
BEGIN
  -- Add planning_status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wedding_sites' AND column_name = 'planning_status'
  ) THEN
    ALTER TABLE wedding_sites ADD COLUMN planning_status text;
  END IF;

  -- Add venue_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wedding_sites' AND column_name = 'venue_name'
  ) THEN
    ALTER TABLE wedding_sites ADD COLUMN venue_name text;
  END IF;

  -- Add venue_address column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wedding_sites' AND column_name = 'venue_address'
  ) THEN
    ALTER TABLE wedding_sites ADD COLUMN venue_address text;
  END IF;

  -- Add venue_date column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wedding_sites' AND column_name = 'venue_date'
  ) THEN
    ALTER TABLE wedding_sites ADD COLUMN venue_date date;
  END IF;

  -- Add expected_guest_count column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wedding_sites' AND column_name = 'expected_guest_count'
  ) THEN
    ALTER TABLE wedding_sites ADD COLUMN expected_guest_count integer;
  END IF;

  -- Add invitations_sent_date column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wedding_sites' AND column_name = 'invitations_sent_date'
  ) THEN
    ALTER TABLE wedding_sites ADD COLUMN invitations_sent_date date;
  END IF;
END $$;