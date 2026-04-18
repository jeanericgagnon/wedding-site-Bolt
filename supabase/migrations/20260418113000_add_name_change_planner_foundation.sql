/*
  # Name change planner foundation

  Engine-first workflow foundation for a California-first / federal-first
  name change planning experience. This schema stores only structured intake,
  masked metadata, and generated workflow snapshots.
*/

CREATE TABLE IF NOT EXISTS name_change_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_site_id uuid NOT NULL UNIQUE REFERENCES wedding_sites(id) ON DELETE CASCADE,
  workflow_status text NOT NULL DEFAULT 'draft' CHECK (workflow_status IN ('draft', 'ready', 'in_progress', 'complete')),
  launch_state text NOT NULL DEFAULT 'california' CHECK (launch_state IN ('california')),
  legal_basis text NOT NULL DEFAULT 'marriage' CHECK (legal_basis IN ('marriage', 'court_order')),
  current_first_name text NOT NULL DEFAULT '',
  current_middle_name text,
  current_last_name text NOT NULL DEFAULT '',
  target_first_name text NOT NULL DEFAULT '',
  target_middle_name text,
  target_last_name text NOT NULL DEFAULT '',
  email text,
  phone_last4 text,
  county_residence text,
  marriage_state text,
  marriage_date date,
  urgency_level text NOT NULL DEFAULT 'standard' CHECK (urgency_level IN ('standard', 'expedited')),
  has_us_passport boolean NOT NULL DEFAULT false,
  passport_needs_update boolean NOT NULL DEFAULT false,
  has_real_id_license boolean NOT NULL DEFAULT false,
  is_us_citizen boolean NOT NULL DEFAULT true,
  employment_status text NOT NULL DEFAULT 'prefer_not_to_say' CHECK (employment_status IN ('employed', 'self_employed', 'not_employed', 'prefer_not_to_say')),
  change_reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  structured_intake jsonb NOT NULL DEFAULT '{}'::jsonb,
  latest_plan_summary jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS name_change_cases_site_idx ON name_change_cases(wedding_site_id);
ALTER TABLE name_change_cases ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS name_change_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_change_case_id uuid NOT NULL REFERENCES name_change_cases(id) ON DELETE CASCADE,
  document_kind text NOT NULL CHECK (document_kind IN ('marriage_certificate', 'court_order', 'current_drivers_license', 'current_passport', 'social_security_card', 'birth_certificate', 'proof_of_address', 'other')),
  display_name text NOT NULL DEFAULT '',
  storage_mode text NOT NULL DEFAULT 'metadata_only' CHECK (storage_mode IN ('none', 'metadata_only')),
  intake_status text NOT NULL DEFAULT 'not_started' CHECK (intake_status IN ('not_started', 'uploaded', 'reviewed')),
  file_name_masked text,
  issuing_authority text,
  issued_on date,
  expires_on date,
  extraction_confidence numeric(5,2),
  extracted_snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS name_change_documents_case_idx ON name_change_documents(name_change_case_id);
ALTER TABLE name_change_documents ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS name_change_extracted_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_change_case_id uuid NOT NULL REFERENCES name_change_cases(id) ON DELETE CASCADE,
  document_id uuid REFERENCES name_change_documents(id) ON DELETE SET NULL,
  field_key text NOT NULL CHECK (field_key IN ('first_name', 'middle_name', 'last_name', 'spouse_last_name', 'issuance_date', 'certificate_number', 'county', 'court_order_date')),
  field_label text NOT NULL DEFAULT '',
  field_value_masked text NOT NULL DEFAULT '',
  source_type text NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual', 'document_extract')),
  is_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS name_change_extracted_fields_case_idx ON name_change_extracted_fields(name_change_case_id);
ALTER TABLE name_change_extracted_fields ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS name_change_plan_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_change_case_id uuid NOT NULL REFERENCES name_change_cases(id) ON DELETE CASCADE,
  engine_version text NOT NULL,
  plan_payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS name_change_plan_snapshots_case_idx ON name_change_plan_snapshots(name_change_case_id, created_at DESC);
ALTER TABLE name_change_plan_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view name change cases"
  ON name_change_cases FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = name_change_cases.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can insert name change cases"
  ON name_change_cases FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = name_change_cases.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can update name change cases"
  ON name_change_cases FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = name_change_cases.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = name_change_cases.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can delete name change cases"
  ON name_change_cases FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM wedding_sites
      WHERE wedding_sites.id = name_change_cases.wedding_site_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can view name change documents"
  ON name_change_documents FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM name_change_cases
      JOIN wedding_sites ON wedding_sites.id = name_change_cases.wedding_site_id
      WHERE name_change_cases.id = name_change_documents.name_change_case_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can mutate name change documents"
  ON name_change_documents FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM name_change_cases
      JOIN wedding_sites ON wedding_sites.id = name_change_cases.wedding_site_id
      WHERE name_change_cases.id = name_change_documents.name_change_case_id
      AND wedding_sites.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM name_change_cases
      JOIN wedding_sites ON wedding_sites.id = name_change_cases.wedding_site_id
      WHERE name_change_cases.id = name_change_documents.name_change_case_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can view name change extracted fields"
  ON name_change_extracted_fields FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM name_change_cases
      JOIN wedding_sites ON wedding_sites.id = name_change_cases.wedding_site_id
      WHERE name_change_cases.id = name_change_extracted_fields.name_change_case_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can mutate name change extracted fields"
  ON name_change_extracted_fields FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM name_change_cases
      JOIN wedding_sites ON wedding_sites.id = name_change_cases.wedding_site_id
      WHERE name_change_cases.id = name_change_extracted_fields.name_change_case_id
      AND wedding_sites.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM name_change_cases
      JOIN wedding_sites ON wedding_sites.id = name_change_cases.wedding_site_id
      WHERE name_change_cases.id = name_change_extracted_fields.name_change_case_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can view name change plan snapshots"
  ON name_change_plan_snapshots FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM name_change_cases
      JOIN wedding_sites ON wedding_sites.id = name_change_cases.wedding_site_id
      WHERE name_change_cases.id = name_change_plan_snapshots.name_change_case_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can insert name change plan snapshots"
  ON name_change_plan_snapshots FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM name_change_cases
      JOIN wedding_sites ON wedding_sites.id = name_change_cases.wedding_site_id
      WHERE name_change_cases.id = name_change_plan_snapshots.name_change_case_id
      AND wedding_sites.user_id = auth.uid()
    )
  );
