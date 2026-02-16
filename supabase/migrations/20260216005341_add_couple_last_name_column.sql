/*
  # Add couple last name to wedding_sites
  
  1. Changes
    - Add `couple_last_name` column to `wedding_sites` table
    - Column allows null for backward compatibility with existing records
  
  2. Notes
    - This enables couples to create personalized URL slugs like "johnandjanes" or "johnandjane"
    - Existing records will have null for this field and can be updated later
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wedding_sites' AND column_name = 'couple_last_name'
  ) THEN
    ALTER TABLE wedding_sites ADD COLUMN couple_last_name text;
  END IF;
END $$;