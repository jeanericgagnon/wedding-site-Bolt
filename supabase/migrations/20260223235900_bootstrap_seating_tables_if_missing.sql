-- Bootstrap seating core tables if they are missing in remote environments
-- Safe no-op when tables already exist.

CREATE TABLE IF NOT EXISTS seating_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_site_id uuid,
  itinerary_event_id uuid,
  default_table_capacity integer NOT NULL DEFAULT 8,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS seating_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seating_event_id uuid NOT NULL REFERENCES seating_events(id) ON DELETE CASCADE,
  table_name text NOT NULL,
  capacity integer NOT NULL DEFAULT 8,
  sort_order integer NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS seating_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seating_event_id uuid NOT NULL REFERENCES seating_events(id) ON DELETE CASCADE,
  table_id uuid NOT NULL REFERENCES seating_tables(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL,
  seat_index integer,
  is_valid boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(seating_event_id, guest_id)
);

CREATE INDEX IF NOT EXISTS seating_tables_event_idx ON seating_tables(seating_event_id);
CREATE INDEX IF NOT EXISTS seating_assignments_event_idx ON seating_assignments(seating_event_id);
CREATE INDEX IF NOT EXISTS seating_assignments_table_idx ON seating_assignments(table_id);
CREATE INDEX IF NOT EXISTS seating_assignments_guest_idx ON seating_assignments(guest_id);
