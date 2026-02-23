/*
  # Seed default vault configs for Alex/Jordan demo-like sites

  Adds 1/5/10-year enabled vault configs for matching sites that currently
  have no vault configs. Safe/idempotent via ON CONFLICT.
*/

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT ws.id
    FROM public.wedding_sites ws
    WHERE (
      (lower(coalesce(ws.couple_name_1, '')) LIKE 'alex%' AND lower(coalesce(ws.couple_name_2, '')) LIKE 'jordan%')
      OR (lower(coalesce(ws.couple_name_1, '')) LIKE 'jordan%' AND lower(coalesce(ws.couple_name_2, '')) LIKE 'alex%')
    )
  LOOP
    INSERT INTO public.vault_configs (wedding_site_id, vault_index, label, duration_years, is_enabled)
    VALUES
      (rec.id, 1, '1-Year Anniversary Vault', 1, true),
      (rec.id, 2, '5-Year Anniversary Vault', 5, true),
      (rec.id, 3, '10-Year Anniversary Vault', 10, true)
    ON CONFLICT (wedding_site_id, vault_index)
    DO UPDATE SET
      label = EXCLUDED.label,
      duration_years = EXCLUDED.duration_years,
      is_enabled = true,
      updated_at = now();
  END LOOP;
END $$;
