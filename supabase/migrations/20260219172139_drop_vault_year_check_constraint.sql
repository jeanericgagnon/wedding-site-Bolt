/*
  # Drop restrictive vault_year check constraint

  ## Summary
  Removes the old hard-coded CHECK (vault_year IN (1, 5, 10)) constraint from
  vault_entries so that vaults with any duration (1–100 years) can store entries.
  This was a leftover from the original MVP that only supported 3 fixed milestones.
  The vault_configs table already supports arbitrary durations; this constraint
  was the only remaining blocker.

  ## Changes
  - vault_entries: drop constraint `vault_entries_vault_year_check`

  ## Notes
  1. No data loss — existing entries with vault_year IN (1,5,10) are unaffected.
  2. vault_configs.duration_years already enforces 1–100 via its own CHECK.
*/

ALTER TABLE vault_entries DROP CONSTRAINT IF EXISTS vault_entries_vault_year_check;
