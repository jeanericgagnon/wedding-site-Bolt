-- Expand seating table shapes for floor-plan objects
ALTER TABLE seating_tables DROP CONSTRAINT IF EXISTS seating_tables_table_shape_check;

ALTER TABLE seating_tables
  ADD CONSTRAINT seating_tables_table_shape_check
  CHECK (table_shape IN ('round', 'rectangle', 'bar', 'dj_booth', 'dance_floor'));
