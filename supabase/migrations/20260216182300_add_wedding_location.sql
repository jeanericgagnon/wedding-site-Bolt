/*
  # Add wedding location field

  1. Changes
    - Add `wedding_location` column to `wedding_sites` table to store city/general location info
    - This is different from `venue_address` which stores specific venue address
    
  2. Purpose
    - Support Quick Start and Guided Setup flows where users provide general location
    - Allow storing city-level location separate from specific venue details
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wedding_sites' AND column_name = 'wedding_location'
  ) THEN
    ALTER TABLE wedding_sites ADD COLUMN wedding_location text;
  END IF;
END $$;
