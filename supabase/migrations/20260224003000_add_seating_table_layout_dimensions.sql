-- Add visual layout dimensions for seating table rendering
ALTER TABLE seating_tables
  ADD COLUMN IF NOT EXISTS layout_width integer NOT NULL DEFAULT 260;

ALTER TABLE seating_tables
  ADD COLUMN IF NOT EXISTS layout_height integer NOT NULL DEFAULT 150;
