-- Add canvas position fields for draggable table layout
ALTER TABLE seating_tables
  ADD COLUMN IF NOT EXISTS layout_x integer NOT NULL DEFAULT 24;

ALTER TABLE seating_tables
  ADD COLUMN IF NOT EXISTS layout_y integer NOT NULL DEFAULT 24;