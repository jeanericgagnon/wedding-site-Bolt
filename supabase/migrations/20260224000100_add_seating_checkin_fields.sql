-- Add day-of check-in tracking on seating assignments
ALTER TABLE seating_assignments
  ADD COLUMN IF NOT EXISTS checked_in_at timestamptz;

ALTER TABLE seating_assignments
  ADD COLUMN IF NOT EXISTS checked_in_by uuid REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS seating_assignments_checked_in_idx
  ON seating_assignments(seating_event_id, checked_in_at);
