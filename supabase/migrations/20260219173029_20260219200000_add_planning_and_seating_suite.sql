/*
  # Planning + Seating Suite

  ## Summary
  Adds full planning and seating management to the wedding dashboard.

  ## New Tables

  ### planning_tasks
  - Tasks with title, description, due_date, status (todo/in_progress/done), priority (low/medium/high)
  - Optional links to itinerary events and vendors
  - Supports auto-generated milestone checklists

  ### planning_budget_items
  - Budget line items per category with estimated, actual, and paid amounts
  - Optional vendor link and due date for payment tracking

  ### planning_vendors
  - Vendor directory with contact details, contract total, amount paid, balance due
  - next_payment_due for payment reminders

  ### seating_events
  - Links seating configuration to a specific itinerary event
  - One seating configuration per itinerary event per wedding site

  ### seating_tables
  - Tables with name, capacity, sort order, notes
  - Scoped to a seating_event

  ### seating_assignments
  - Guest-to-table assignments scoped to a seating_event
  - Optional seat_index for numbered seating
  - is_valid flag for RSVP drift detection

  ## Security
  - RLS enabled on all tables
  - Couple-only access via wedding site ownership
  - No public or anon access

  ## Indexes
  - wedding_site_id, status, due_date, priority for task queries
  - seating_event_id, table_id, guest_id for seating queries
*/

-- planning_tasks
CREATE TABLE IF NOT EXISTS planning_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_site_id uuid NOT NULL REFERENCES wedding_sites(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  due_date date,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  owner_name text NOT NULL DEFAULT '',
  linked_event_id uuid REFERENCES itinerary_events(id) ON DELETE SET NULL,
  linked_vendor_id uuid,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS planning_tasks_site_idx ON planning_tasks(wedding_site_id);
CREATE INDEX IF NOT EXISTS planning_tasks_status_idx ON planning_tasks(status);
CREATE INDEX IF NOT EXISTS planning_tasks_due_date_idx ON planning_tasks(due_date);
CREATE INDEX IF NOT EXISTS planning_tasks_priority_idx ON planning_tasks(priority);

ALTER TABLE planning_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view planning tasks"
  ON planning_tasks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = planning_tasks.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can insert planning tasks"
  ON planning_tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = planning_tasks.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can update planning tasks"
  ON planning_tasks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = planning_tasks.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = planning_tasks.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can delete planning tasks"
  ON planning_tasks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = planning_tasks.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

-- planning_vendors
CREATE TABLE IF NOT EXISTS planning_vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_site_id uuid NOT NULL REFERENCES wedding_sites(id) ON DELETE CASCADE,
  vendor_type text NOT NULL DEFAULT '',
  name text NOT NULL DEFAULT '',
  contact_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  website text NOT NULL DEFAULT '',
  contract_total numeric(12,2) NOT NULL DEFAULT 0,
  amount_paid numeric(12,2) NOT NULL DEFAULT 0,
  balance_due numeric(12,2) GENERATED ALWAYS AS (contract_total - amount_paid) STORED,
  next_payment_due date,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS planning_vendors_site_idx ON planning_vendors(wedding_site_id);
CREATE INDEX IF NOT EXISTS planning_vendors_payment_due_idx ON planning_vendors(next_payment_due);

ALTER TABLE planning_vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view planning vendors"
  ON planning_vendors FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = planning_vendors.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can insert planning vendors"
  ON planning_vendors FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = planning_vendors.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can update planning vendors"
  ON planning_vendors FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = planning_vendors.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = planning_vendors.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can delete planning vendors"
  ON planning_vendors FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = planning_vendors.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

-- planning_budget_items
CREATE TABLE IF NOT EXISTS planning_budget_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_site_id uuid NOT NULL REFERENCES wedding_sites(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT '',
  item_name text NOT NULL DEFAULT '',
  estimated_amount numeric(12,2) NOT NULL DEFAULT 0,
  actual_amount numeric(12,2) NOT NULL DEFAULT 0,
  paid_amount numeric(12,2) NOT NULL DEFAULT 0,
  due_date date,
  vendor_id uuid REFERENCES planning_vendors(id) ON DELETE SET NULL,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS planning_budget_site_idx ON planning_budget_items(wedding_site_id);
CREATE INDEX IF NOT EXISTS planning_budget_category_idx ON planning_budget_items(category);

ALTER TABLE planning_budget_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view budget items"
  ON planning_budget_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = planning_budget_items.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can insert budget items"
  ON planning_budget_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = planning_budget_items.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can update budget items"
  ON planning_budget_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = planning_budget_items.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = planning_budget_items.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can delete budget items"
  ON planning_budget_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = planning_budget_items.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

-- seating_events (one per itinerary_event per wedding site)
CREATE TABLE IF NOT EXISTS seating_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_site_id uuid NOT NULL REFERENCES wedding_sites(id) ON DELETE CASCADE,
  itinerary_event_id uuid NOT NULL REFERENCES itinerary_events(id) ON DELETE CASCADE,
  default_table_capacity integer NOT NULL DEFAULT 8,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(wedding_site_id, itinerary_event_id)
);

CREATE INDEX IF NOT EXISTS seating_events_site_idx ON seating_events(wedding_site_id);
CREATE INDEX IF NOT EXISTS seating_events_itinerary_idx ON seating_events(itinerary_event_id);

ALTER TABLE seating_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view seating events"
  ON seating_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = seating_events.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can insert seating events"
  ON seating_events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = seating_events.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can update seating events"
  ON seating_events FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = seating_events.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = seating_events.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can delete seating events"
  ON seating_events FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = seating_events.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

-- seating_tables
CREATE TABLE IF NOT EXISTS seating_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seating_event_id uuid NOT NULL REFERENCES seating_events(id) ON DELETE CASCADE,
  table_name text NOT NULL DEFAULT '',
  capacity integer NOT NULL DEFAULT 8,
  sort_order integer NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS seating_tables_event_idx ON seating_tables(seating_event_id);

ALTER TABLE seating_tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view seating tables"
  ON seating_tables FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM seating_events se
      JOIN wedding_sites ws ON ws.id = se.wedding_site_id
      WHERE se.id = seating_tables.seating_event_id
      AND ws.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can insert seating tables"
  ON seating_tables FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM seating_events se
      JOIN wedding_sites ws ON ws.id = se.wedding_site_id
      WHERE se.id = seating_tables.seating_event_id
      AND ws.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can update seating tables"
  ON seating_tables FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM seating_events se
      JOIN wedding_sites ws ON ws.id = se.wedding_site_id
      WHERE se.id = seating_tables.seating_event_id
      AND ws.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM seating_events se
      JOIN wedding_sites ws ON ws.id = se.wedding_site_id
      WHERE se.id = seating_tables.seating_event_id
      AND ws.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can delete seating tables"
  ON seating_tables FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM seating_events se
      JOIN wedding_sites ws ON ws.id = se.wedding_site_id
      WHERE se.id = seating_tables.seating_event_id
      AND ws.user_id = auth.uid()
    )
  );

-- seating_assignments
CREATE TABLE IF NOT EXISTS seating_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seating_event_id uuid NOT NULL REFERENCES seating_events(id) ON DELETE CASCADE,
  table_id uuid NOT NULL REFERENCES seating_tables(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  seat_index integer,
  is_valid boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(seating_event_id, guest_id)
);

CREATE INDEX IF NOT EXISTS seating_assignments_event_idx ON seating_assignments(seating_event_id);
CREATE INDEX IF NOT EXISTS seating_assignments_table_idx ON seating_assignments(table_id);
CREATE INDEX IF NOT EXISTS seating_assignments_guest_idx ON seating_assignments(guest_id);

ALTER TABLE seating_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view seating assignments"
  ON seating_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM seating_events se
      JOIN wedding_sites ws ON ws.id = se.wedding_site_id
      WHERE se.id = seating_assignments.seating_event_id
      AND ws.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can insert seating assignments"
  ON seating_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM seating_events se
      JOIN wedding_sites ws ON ws.id = se.wedding_site_id
      WHERE se.id = seating_assignments.seating_event_id
      AND ws.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can update seating assignments"
  ON seating_assignments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM seating_events se
      JOIN wedding_sites ws ON ws.id = se.wedding_site_id
      WHERE se.id = seating_assignments.seating_event_id
      AND ws.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM seating_events se
      JOIN wedding_sites ws ON ws.id = se.wedding_site_id
      WHERE se.id = seating_assignments.seating_event_id
      AND ws.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can delete seating assignments"
  ON seating_assignments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM seating_events se
      JOIN wedding_sites ws ON ws.id = se.wedding_site_id
      WHERE se.id = seating_assignments.seating_event_id
      AND ws.user_id = auth.uid()
    )
  );
