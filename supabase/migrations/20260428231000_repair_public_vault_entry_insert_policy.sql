-- Repair public vault contribution inserts for published sites.

GRANT INSERT ON public.vault_entries TO anon, authenticated;

DROP POLICY IF EXISTS "Public can insert vault entries for published sites" ON public.vault_entries;

CREATE POLICY "Public can insert vault entries for published sites"
  ON public.vault_entries FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.wedding_sites ws
      WHERE ws.id = vault_entries.wedding_site_id
        AND ws.is_published = true
    )
    AND (
      vault_entries.vault_config_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.vault_configs vc
        WHERE vc.id = vault_entries.vault_config_id
          AND vc.wedding_site_id = vault_entries.wedding_site_id
          AND vc.is_enabled = true
      )
    )
  );
