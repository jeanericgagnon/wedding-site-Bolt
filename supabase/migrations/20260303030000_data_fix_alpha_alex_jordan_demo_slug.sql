-- DATA-FIX-ALPHA
-- Ensure a published wedding site is resolvable at /site/alex-jordan-demo

DO $$
DECLARE
  v_demo_user_id uuid := 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  v_existing_demo_email_user_id uuid;
  v_site_id uuid;
  v_now timestamptz := now();
  v_site_json jsonb := jsonb_build_object(
    'publishStatus', 'published',
    'publishedVersion', 1,
    'lastPublishedAt', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'pages', jsonb_build_array(
      jsonb_build_object(
        'id', 'home',
        'title', 'Home',
        'slug', 'home',
        'sections', jsonb_build_array()
      )
    )
  );
BEGIN
  -- Ensure demo user id resolves safely.
  SELECT id INTO v_existing_demo_email_user_id
  FROM auth.users
  WHERE email = 'demo@dayof.love'
  LIMIT 1;

  IF v_existing_demo_email_user_id IS NOT NULL THEN
    v_demo_user_id := v_existing_demo_email_user_id;
  ELSIF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_demo_user_id) THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role
    ) VALUES (
      v_demo_user_id,
      '00000000-0000-0000-0000-000000000000',
      'demo@dayof.love',
      '$2a$10$rZ5qR5z5z5z5z5z5z5z5z.abcdefghijklmnopqrstuvwxyz123456',
      v_now,
      v_now,
      v_now,
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      'authenticated',
      'authenticated'
    );
  END IF;

  -- Prefer updating an existing alex-jordan row if present
  SELECT id INTO v_site_id
  FROM wedding_sites
  WHERE site_slug = 'alex-jordan-demo'
     OR site_url = 'alex-jordan-demo'
     OR site_url = 'alex-jordan-demo.dayof.love'
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 1;

  IF v_site_id IS NULL THEN
    SELECT id INTO v_site_id
    FROM wedding_sites
    WHERE user_id = v_demo_user_id
    ORDER BY updated_at DESC NULLS LAST
    LIMIT 1;
  END IF;

  IF v_site_id IS NULL THEN
    INSERT INTO wedding_sites (
      user_id,
      couple_name_1,
      couple_name_2,
      wedding_date,
      venue_name,
      venue_location,
      site_slug,
      site_url,
      is_published,
      published_at,
      site_json,
      wedding_data,
      created_at,
      updated_at
    ) VALUES (
      v_demo_user_id,
      'Alex Thompson',
      'Jordan Rivera',
      '2026-06-15',
      'Sunset Gardens Estate',
      '123 Garden Lane, Napa Valley, CA 94558',
      'alex-jordan-demo',
      'alex-jordan-demo',
      true,
      v_now,
      v_site_json,
      '{}'::jsonb,
      v_now,
      v_now
    )
    RETURNING id INTO v_site_id;
  ELSE
    UPDATE wedding_sites
    SET
      site_slug = 'alex-jordan-demo',
      site_url = 'alex-jordan-demo',
      is_published = true,
      published_at = coalesce(published_at, v_now),
      site_json = coalesce(site_json, v_site_json) || jsonb_build_object(
        'publishStatus', 'published',
        'publishedVersion', coalesce((site_json->>'publishedVersion')::int, 1),
        'lastPublishedAt', to_char(v_now at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      ),
      updated_at = v_now
    WHERE id = v_site_id;
  END IF;
END $$;
