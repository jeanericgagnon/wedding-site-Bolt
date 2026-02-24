-- Add rotation support for seating canvas objects/tables
ALTER TABLE seating_tables
  ADD COLUMN IF NOT EXISTS rotation_deg integer NOT NULL DEFAULT 0;