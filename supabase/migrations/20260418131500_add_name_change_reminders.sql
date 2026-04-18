/*
  # Name change reminder scaffolding

  Persists generated reminder suggestions per name-change case so planner/admin
  follow-up can survive reloads and evolve beyond UI-local suggestions.
*/

CREATE TABLE IF NOT EXISTS name_change_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_change_case_id uuid NOT NULL REFERENCES name_change_cases(id) ON DELETE CASCADE,
  reminder_key text NOT NULL,
  label text NOT NULL DEFAULT '',
  reason text NOT NULL DEFAULT '',
  depends_on_step_id text NOT NULL DEFAULT '',
  suggested_offset_days integer NOT NULL DEFAULT 0,
  urgency text NOT NULL DEFAULT 'medium' CHECK (urgency IN ('high', 'medium', 'low')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'sent', 'dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(name_change_case_id, reminder_key)
);

CREATE INDEX IF NOT EXISTS name_change_reminders_case_idx ON name_change_reminders(name_change_case_id, suggested_offset_days ASC);
ALTER TABLE name_change_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view name change reminders"
  ON name_change_reminders FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM name_change_cases
      JOIN wedding_sites ON wedding_sites.id = name_change_cases.wedding_site_id
      WHERE name_change_cases.id = name_change_reminders.name_change_case_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can mutate name change reminders"
  ON name_change_reminders FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM name_change_cases
      JOIN wedding_sites ON wedding_sites.id = name_change_cases.wedding_site_id
      WHERE name_change_cases.id = name_change_reminders.name_change_case_id
      AND wedding_sites.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM name_change_cases
      JOIN wedding_sites ON wedding_sites.id = name_change_cases.wedding_site_id
      WHERE name_change_cases.id = name_change_reminders.name_change_case_id
      AND wedding_sites.user_id = auth.uid()
    )
  );
