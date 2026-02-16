/*
  # Add Destination Wedding and Venue Location Features

  1. New Columns
    - Add `is_destination_wedding` (boolean) to track if wedding is at a destination
    - Add `venue_latitude` (numeric) to store venue location
    - Add `venue_longitude` (numeric) to store venue location
  
  2. Changes
    - Allows couples to specify if their wedding is a destination wedding
    - Stores venue coordinates for map display
*/

DO $$
BEGIN
  -- Add is_destination_wedding column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wedding_sites' AND column_name = 'is_destination_wedding'
  ) THEN
    ALTER TABLE wedding_sites ADD COLUMN is_destination_wedding boolean DEFAULT false;
  END IF;

  -- Add venue_latitude column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wedding_sites' AND column_name = 'venue_latitude'
  ) THEN
    ALTER TABLE wedding_sites ADD COLUMN venue_latitude numeric(10, 8);
  END IF;

  -- Add venue_longitude column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wedding_sites' AND column_name = 'venue_longitude'
  ) THEN
    ALTER TABLE wedding_sites ADD COLUMN venue_longitude numeric(11, 8);
  END IF;
END $$;