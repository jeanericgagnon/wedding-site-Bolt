-- Backfill alex-jordan-demo with non-empty published site_json
-- Source of truth copied from testandkaras current site_json structure.

DO $$
DECLARE
  v_source_site_json jsonb;
BEGIN
  SELECT ws.site_json
    INTO v_source_site_json
  FROM wedding_sites ws
  WHERE ws.site_slug = 'testandkaras'
  LIMIT 1;

  IF v_source_site_json IS NULL THEN
    RAISE NOTICE 'Skipping backfill: source site_json missing for testandkaras';
    RETURN;
  END IF;

  UPDATE wedding_sites
  SET
    site_json = coalesce(site_json, '{}'::jsonb) || v_source_site_json || jsonb_build_object(
      'publishStatus', 'published',
      'lastPublishedAt', now()::text,
      'publishedVersion', coalesce((site_json->>'publishedVersion')::int, 1)
    ),
    is_published = true,
    published_at = coalesce(published_at, now()),
    updated_at = now()
  WHERE site_slug = 'alex-jordan-demo';
END $$;
