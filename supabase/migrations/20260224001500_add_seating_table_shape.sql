-- Add visual shape metadata for seating tables
ALTER TABLE seating_tables
  ADD COLUMN IF NOT EXISTS table_shape text NOT NULL DEFAULT 'round';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'seating_tables_table_shape_check'
  ) THEN
    ALTER TABLE seating_tables
      ADD CONSTRAINT seating_tables_table_shape_check
      CHECK (table_shape IN ('round', 'rectangle'));
  END IF;
END $$;