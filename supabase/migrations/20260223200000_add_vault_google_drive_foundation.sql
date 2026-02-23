-- Vault Google Drive integration foundation

ALTER TABLE wedding_sites
  ADD COLUMN IF NOT EXISTS vault_storage_provider text NOT NULL DEFAULT 'supabase',
  ADD COLUMN IF NOT EXISTS vault_google_drive_connected boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS vault_google_drive_refresh_token text,
  ADD COLUMN IF NOT EXISTS vault_google_drive_access_token text,
  ADD COLUMN IF NOT EXISTS vault_google_drive_token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS vault_google_drive_root_folder_id text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wedding_sites_vault_storage_provider_check'
  ) THEN
    ALTER TABLE wedding_sites
      ADD CONSTRAINT wedding_sites_vault_storage_provider_check
      CHECK (vault_storage_provider IN ('supabase', 'google_drive'));
  END IF;
END $$;

ALTER TABLE vault_entries
  ADD COLUMN IF NOT EXISTS storage_provider text NOT NULL DEFAULT 'supabase',
  ADD COLUMN IF NOT EXISTS external_file_id text,
  ADD COLUMN IF NOT EXISTS external_file_url text,
  ADD COLUMN IF NOT EXISTS unlock_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'vault_entries_storage_provider_check'
  ) THEN
    ALTER TABLE vault_entries
      ADD CONSTRAINT vault_entries_storage_provider_check
      CHECK (storage_provider IN ('supabase', 'google_drive'));
  END IF;
END $$;
