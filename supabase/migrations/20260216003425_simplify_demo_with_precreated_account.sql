/*
  # Simplify Demo with Pre-created Account

  ## Overview
  Removes the trigger approach and creates a permanent demo account with pre-populated data.
  This avoids trigger complexity and RLS issues.

  ## Changes
  1. Drops the trigger and function
  2. Creates a permanent demo user directly in auth.users
  3. Pre-populates all demo data
*/

-- Drop trigger approach
DROP TRIGGER IF EXISTS on_demo_user_created ON auth.users;
DROP FUNCTION IF EXISTS create_demo_wedding_data();

-- Clear any existing demo data
DELETE FROM auth.users WHERE email = 'demo@dayof.love';

-- We cannot directly insert into auth.users from migrations
-- Instead, we'll create an initialization function that can be called
-- This function will check if demo exists and create it if not

CREATE OR REPLACE FUNCTION initialize_demo_account()
RETURNS void AS $$
DECLARE
  v_demo_user_id uuid;
  v_demo_site_id uuid;
  v_welcome_dinner_id uuid;
  v_ceremony_id uuid;
  v_reception_id uuid;
  v_brunch_id uuid;
  v_user_count integer;
BEGIN
  -- Check if demo user already exists
  SELECT COUNT(*) INTO v_user_count FROM auth.users WHERE email = 'demo@dayof.love';
  
  IF v_user_count > 0 THEN
    -- Demo already exists, get the user ID and check if they have a site
    SELECT id INTO v_demo_user_id FROM auth.users WHERE email = 'demo@dayof.love' LIMIT 1;
    SELECT COUNT(*) INTO v_user_count FROM wedding_sites WHERE user_id = v_demo_user_id;
    
    IF v_user_count > 0 THEN
      -- Demo data already exists, exit
      RETURN;
    END IF;
  ELSE
    -- Try to create demo user (this will only work if called with proper permissions)
    BEGIN
      INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        'dddddddd-dddd-dddd-dddd-dddddddddddd',
        'authenticated',
        'authenticated',
        'demo@dayof.love',
        crypt('demo-password-12345', gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{}'::jsonb,
        now(),
        now(),
        '',
        ''
      ) RETURNING id INTO v_demo_user_id;
    EXCEPTION
      WHEN OTHERS THEN
        -- If we can't create the user, try to get existing one
        SELECT id INTO v_demo_user_id FROM auth.users WHERE email = 'demo@dayof.love' LIMIT 1;
        IF v_demo_user_id IS NULL THEN
          RAISE EXCEPTION 'Cannot create or find demo user';
        END IF;
    END;
  END IF;

  -- Create wedding site
  INSERT INTO wedding_sites (
    user_id, couple_name_1, couple_name_2, wedding_date,
    venue_name, venue_location, site_url, hero_image_url, theme_settings
  ) VALUES (
    v_demo_user_id, 'Alex Thompson', 'Jordan Rivera', '2026-06-15',
    'Sunset Gardens Estate', '123 Garden Lane, Napa Valley, CA 94558',
    'alex-jordan-demo', 'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg',
    '{"primaryColor": "#8B7355", "accentColor": "#D4A574"}'::jsonb
  ) RETURNING id INTO v_demo_site_id;

  -- Create 68 confirmed guests
  INSERT INTO guests (wedding_site_id, name, first_name, last_name, email, rsvp_status, meal_preference, invite_token, invited_to_ceremony, invited_to_reception)
  SELECT v_demo_site_id, 'Confirmed Guest ' || s, 'Confirmed', 'Guest' || s, 'confirmed' || s || '@demo.com', 'confirmed',
    CASE (s % 4) WHEN 0 THEN 'Beef' WHEN 1 THEN 'Chicken' WHEN 2 THEN 'Fish' ELSE 'Vegetarian' END,
    'token-c-' || s, true, true
  FROM generate_series(1, 68) s;

  -- Create 22 declined guests
  INSERT INTO guests (wedding_site_id, name, first_name, last_name, email, rsvp_status, invite_token, invited_to_ceremony, invited_to_reception)
  SELECT v_demo_site_id, 'Declined Guest ' || s, 'Declined', 'Guest' || s, 'declined' || s || '@demo.com', 'declined', 'token-d-' || s, true, true
  FROM generate_series(1, 22) s;

  -- Create 30 pending guests
  INSERT INTO guests (wedding_site_id, name, first_name, last_name, email, rsvp_status, invite_token, invited_to_ceremony, invited_to_reception)
  SELECT v_demo_site_id, 'Pending Guest ' || s, 'Pending', 'Guest' || s, 'pending' || s || '@demo.com', 'pending', 'token-p-' || s, true, true
  FROM generate_series(1, 30) s;

  -- Create events
  INSERT INTO itinerary_events (wedding_site_id, event_name, description, event_date, start_time, location_name, display_order)
  VALUES 
    (v_demo_site_id, 'Welcome Dinner', 'Kick off the weekend', '2026-06-14', '18:00', 'The Vineyard Restaurant', 1),
    (v_demo_site_id, 'Ceremony', 'Exchange vows in the Rose Garden', '2026-06-15', '16:00', 'Rose Garden', 2),
    (v_demo_site_id, 'Reception', 'Dinner, drinks, and dancing', '2026-06-15', '18:00', 'Grand Ballroom', 3),
    (v_demo_site_id, 'Sunday Brunch', 'Farewell brunch', '2026-06-16', '10:00', 'Garden Terrace Café', 4);

  SELECT id INTO v_welcome_dinner_id FROM itinerary_events WHERE wedding_site_id = v_demo_site_id AND event_name = 'Welcome Dinner';
  SELECT id INTO v_ceremony_id FROM itinerary_events WHERE wedding_site_id = v_demo_site_id AND event_name = 'Ceremony';
  SELECT id INTO v_reception_id FROM itinerary_events WHERE wedding_site_id = v_demo_site_id AND event_name = 'Reception';
  SELECT id INTO v_brunch_id FROM itinerary_events WHERE wedding_site_id = v_demo_site_id AND event_name = 'Sunday Brunch';

  -- Invite all to ceremony and reception
  INSERT INTO event_invitations (event_id, guest_id)
  SELECT v_ceremony_id, id FROM guests WHERE wedding_site_id = v_demo_site_id;
  
  INSERT INTO event_invitations (event_id, guest_id)
  SELECT v_reception_id, id FROM guests WHERE wedding_site_id = v_demo_site_id;

  -- RSVPs for confirmed guests (ceremony + reception)
  INSERT INTO event_rsvps (event_invitation_id, attending)
  SELECT ei.id, true
  FROM event_invitations ei
  JOIN guests g ON g.id = ei.guest_id
  WHERE g.wedding_site_id = v_demo_site_id
  AND g.rsvp_status = 'confirmed'
  AND ei.event_id IN (v_ceremony_id, v_reception_id);

  -- Welcome dinner: invite first 40, 28 attend
  INSERT INTO event_invitations (event_id, guest_id)
  SELECT v_welcome_dinner_id, id 
  FROM guests 
  WHERE wedding_site_id = v_demo_site_id 
  AND rsvp_status = 'confirmed'
  ORDER BY name LIMIT 40;

  INSERT INTO event_rsvps (event_invitation_id, attending)
  SELECT ei.id, true
  FROM event_invitations ei
  JOIN guests g ON g.id = ei.guest_id
  WHERE g.wedding_site_id = v_demo_site_id
  AND ei.event_id = v_welcome_dinner_id
  ORDER BY g.name LIMIT 28;

  -- Brunch: invite first 60, 42 attend
  INSERT INTO event_invitations (event_id, guest_id)
  SELECT v_brunch_id, id 
  FROM guests 
  WHERE wedding_site_id = v_demo_site_id 
  AND rsvp_status = 'confirmed'
  ORDER BY name LIMIT 60;

  INSERT INTO event_rsvps (event_invitation_id, attending)
  SELECT ei.id, true
  FROM event_invitations ei
  JOIN guests g ON g.id = ei.guest_id
  WHERE g.wedding_site_id = v_demo_site_id
  AND ei.event_id = v_brunch_id
  ORDER BY g.name LIMIT 42;

  -- Main RSVPs for confirmed
  INSERT INTO rsvps (guest_id, attending, meal_choice)
  SELECT id, true, meal_preference
  FROM guests
  WHERE wedding_site_id = v_demo_site_id
  AND rsvp_status = 'confirmed';

  -- Main RSVPs for declined
  INSERT INTO rsvps (guest_id, attending)
  SELECT id, false
  FROM guests
  WHERE wedding_site_id = v_demo_site_id
  AND rsvp_status = 'declined';

  -- Photos
  INSERT INTO photos (wedding_site_id, url, caption, category, display_order)
  VALUES 
    (v_demo_site_id, 'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg', 'Sunset venue', 'venue', 1),
    (v_demo_site_id, 'https://images.pexels.com/photos/2788792/pexels-photo-2788792.jpeg', 'The proposal', 'engagement', 2);

  -- Registry
  INSERT INTO registry_items (wedding_site_id, item_name, price, store_name, quantity_needed, quantity_purchased, priority)
  VALUES 
    (v_demo_site_id, 'KitchenAid Stand Mixer', 449.99, 'Williams Sonoma', 1, 0, 'high'),
    (v_demo_site_id, 'Le Creuset Dutch Oven', 399.95, 'Sur La Table', 1, 1, 'high');

  -- Content
  INSERT INTO site_content (wedding_site_id, section_type, title, content, display_order)
  VALUES 
    (v_demo_site_id, 'story', 'Our Story', 'We met five years ago and fell in love!', 1);

  -- Messages
  INSERT INTO messages (wedding_site_id, subject, body, channel, audience_filter, recipient_count)
  VALUES 
    (v_demo_site_id, 'Save the Date!', 'June 15, 2026', 'email', 'all', 120);

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Call the function to initialize demo
SELECT initialize_demo_account();