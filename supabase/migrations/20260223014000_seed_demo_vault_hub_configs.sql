/*
  # Seed demo vault hub configs (1/5/10 years)

  Ensures the demo site always has enabled vault configs so the public
  vault hub shows multiple vault cards in demos.
*/

DO $$
DECLARE
  demo_site_id uuid;
BEGIN
  SELECT ws.id INTO demo_site_id
  FROM public.wedding_sites ws
  WHERE ws.user_id = '00000000-0000-0000-0000-000000000001'
  ORDER BY ws.created_at ASC
  LIMIT 1;

  IF demo_site_id IS NULL THEN
    RAISE NOTICE 'Demo wedding site not found; skipping demo vault seed.';
    RETURN;
  END IF;

  INSERT INTO public.vault_configs (wedding_site_id, vault_index, label, duration_years, is_enabled)
  VALUES
    (demo_site_id, 1, '1-Year Anniversary Vault', 1, true),
    (demo_site_id, 2, '5-Year Anniversary Vault', 5, true),
    (demo_site_id, 3, '10-Year Anniversary Vault', 10, true)
  ON CONFLICT (wedding_site_id, vault_index)
  DO UPDATE SET
    label = EXCLUDED.label,
    duration_years = EXCLUDED.duration_years,
    is_enabled = true,
    updated_at = now();
END $$;
