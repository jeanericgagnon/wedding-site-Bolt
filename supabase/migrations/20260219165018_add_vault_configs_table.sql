/*
  # Add Vault Configs Table

  ## Summary
  Replaces the hardcoded 1/5/10-year vault system with a flexible, user-configurable
  vault system supporting up to 5 vaults per wedding site.

  ## New Tables
  - `vault_configs`
    - `id` (uuid, primary key)
    - `wedding_site_id` (uuid, FK to wedding_sites)
    - `vault_index` (integer 1-5) — position/slot number
    - `label` (text) — custom name, e.g. "1st Anniversary"
    - `duration_years` (integer) — how many years after wedding date to unlock
    - `is_enabled` (boolean) — whether this vault is active
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Changes to vault_entries
  - `vault_year` column now references duration_years directly (integer, no constraint)
    so existing entries remain valid; new entries use vault_config_id

  ## Security
  - RLS enabled on vault_configs
  - Owners can read/write their own configs
  - Public read for enabled vaults (needed for VaultContribute page)
*/

CREATE TABLE IF NOT EXISTS vault_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_site_id uuid NOT NULL REFERENCES wedding_sites(id) ON DELETE CASCADE,
  vault_index integer NOT NULL CHECK (vault_index BETWEEN 1 AND 5),
  label text NOT NULL DEFAULT '',
  duration_years integer NOT NULL DEFAULT 1 CHECK (duration_years >= 1 AND duration_years <= 100),
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (wedding_site_id, vault_index)
);

ALTER TABLE vault_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can read vault configs"
  ON vault_configs FOR SELECT
  TO authenticated
  USING (
    wedding_site_id IN (
      SELECT id FROM wedding_sites WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can insert vault configs"
  ON vault_configs FOR INSERT
  TO authenticated
  WITH CHECK (
    wedding_site_id IN (
      SELECT id FROM wedding_sites WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can update vault configs"
  ON vault_configs FOR UPDATE
  TO authenticated
  USING (
    wedding_site_id IN (
      SELECT id FROM wedding_sites WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    wedding_site_id IN (
      SELECT id FROM wedding_sites WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can delete vault configs"
  ON vault_configs FOR DELETE
  TO authenticated
  USING (
    wedding_site_id IN (
      SELECT id FROM wedding_sites WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Public can read enabled vault configs"
  ON vault_configs FOR SELECT
  TO anon
  USING (is_enabled = true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vault_entries' AND column_name = 'vault_config_id'
  ) THEN
    ALTER TABLE vault_entries ADD COLUMN vault_config_id uuid REFERENCES vault_configs(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_vault_configs_wedding_site ON vault_configs(wedding_site_id);
CREATE INDEX IF NOT EXISTS idx_vault_entries_vault_config ON vault_entries(vault_config_id);
