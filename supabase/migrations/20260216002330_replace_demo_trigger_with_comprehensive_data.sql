/*
  # Replace Demo Data Trigger with Comprehensive Data

  ## Overview
  Replaces the existing demo data trigger function to create a comprehensive demo with:
  - 120 guests (68 confirmed, 30 pending, 22 declined)
  - 4 events with proper invitations and RSVPs
  - Consistent RSVP counts across all views

  ## Changes
  1. Drops existing trigger function
  2. Creates new comprehensive demo data trigger function
  3. Recreates trigger

  ## Notes
  - Function only triggers for demo@dayof.love email
  - Creates data automatically when demo user signs up
  - All RSVP counts will be consistent (68/120)
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_demo_user_created ON auth.users;
DROP FUNCTION IF EXISTS create_demo_wedding_data();

-- Create new comprehensive demo data function
CREATE OR REPLACE FUNCTION create_demo_wedding_data()
RETURNS TRIGGER AS $$
DECLARE
  demo_site_id uuid;
  welcome_dinner_id uuid;
  ceremony_id uuid;
  reception_id uuid;
  brunch_id uuid;
  guest_ids uuid[];
  guest_id uuid;
  invitation_id uuid;
  i integer;
BEGIN
  -- Only create demo data for the demo email
  IF NEW.email = 'demo@dayof.love' THEN
    -- Create wedding site
    INSERT INTO wedding_sites (
      user_id,
      couple_name_1,
      couple_name_2,
      wedding_date,
      venue_name,
      venue_location,
      site_url,
      hero_image_url,
      theme_settings
    ) VALUES (
      NEW.id,
      'Alex Thompson',
      'Jordan Rivera',
      '2026-06-15',
      'Sunset Gardens Estate',
      '123 Garden Lane, Napa Valley, CA 94558',
      'alex-jordan-2026-' || substring(NEW.id::text, 1, 8),
      'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg',
      '{"primaryColor": "#8B7355", "accentColor": "#D4A574", "fontFamily": "Playfair Display"}'::jsonb
    ) RETURNING id INTO demo_site_id;

    -- Create 68 confirmed guests
    INSERT INTO guests (wedding_site_id, name, first_name, last_name, email, rsvp_status, meal_preference, invite_token, invited_to_ceremony, invited_to_reception)
    SELECT 
      demo_site_id,
      'Guest ' || i,
      'Guest',
      CAST(i AS text),
      'guest' || i || '@demo.com',
      'confirmed',
      CASE (i % 4)
        WHEN 0 THEN 'Beef'
        WHEN 1 THEN 'Chicken'
        WHEN 2 THEN 'Fish'
        ELSE 'Vegetarian'
      END,
      'token-' || i,
      true,
      true
    FROM generate_series(1, 68) AS i;

    -- Create 22 declined guests
    INSERT INTO guests (wedding_site_id, name, first_name, last_name, email, rsvp_status, invite_token, invited_to_ceremony, invited_to_reception)
    SELECT 
      demo_site_id,
      'Guest ' || i,
      'Guest',
      CAST(i AS text),
      'guest' || i || '@demo.com',
      'declined',
      'token-' || i,
      true,
      true
    FROM generate_series(69, 90) AS i;

    -- Create 30 pending guests
    INSERT INTO guests (wedding_site_id, name, first_name, last_name, email, rsvp_status, invite_token, invited_to_ceremony, invited_to_reception)
    SELECT 
      demo_site_id,
      'Guest ' || i,
      'Guest',
      CAST(i AS text),
      'guest' || i || '@demo.com',
      'pending',
      'token-' || i,
      true,
      true
    FROM generate_series(91, 120) AS i;

    -- Create itinerary events
    INSERT INTO itinerary_events (wedding_site_id, event_name, description, event_date, start_time, location_name, display_order, is_visible)
    VALUES 
      (demo_site_id, 'Welcome Dinner', 'Kick off the weekend with close family and friends', '2026-06-14', '18:00', 'The Vineyard Restaurant', 1, true),
      (demo_site_id, 'Ceremony', 'Join us as we exchange vows in the Rose Garden', '2026-06-15', '16:00', 'Sunset Gardens Estate - Rose Garden', 2, true),
      (demo_site_id, 'Reception', 'Celebrate with dinner, drinks, and dancing', '2026-06-15', '18:00', 'Sunset Gardens Estate - Grand Ballroom', 3, true),
      (demo_site_id, 'Sunday Brunch', 'Farewell brunch before everyone heads home', '2026-06-16', '10:00', 'Garden Terrace Café', 4, true);

    -- Get event IDs
    SELECT id INTO welcome_dinner_id FROM itinerary_events WHERE wedding_site_id = demo_site_id AND event_name = 'Welcome Dinner';
    SELECT id INTO ceremony_id FROM itinerary_events WHERE wedding_site_id = demo_site_id AND event_name = 'Ceremony';
    SELECT id INTO reception_id FROM itinerary_events WHERE wedding_site_id = demo_site_id AND event_name = 'Reception';
    SELECT id INTO brunch_id FROM itinerary_events WHERE wedding_site_id = demo_site_id AND event_name = 'Sunday Brunch';

    -- Get all guest IDs
    SELECT array_agg(id ORDER BY name) INTO guest_ids FROM guests WHERE wedding_site_id = demo_site_id;

    -- Invite all guests to Ceremony and Reception
    FOR i IN 1..array_length(guest_ids, 1) LOOP
      guest_id := guest_ids[i];
      
      -- Ceremony invitation
      INSERT INTO event_invitations (event_id, guest_id) VALUES (ceremony_id, guest_id);
      
      -- Reception invitation
      INSERT INTO event_invitations (event_id, guest_id) VALUES (reception_id, guest_id);
      
      -- Create RSVP for confirmed guests (first 68)
      IF i <= 68 THEN
        -- Ceremony RSVP
        INSERT INTO event_rsvps (event_invitation_id, attending)
        SELECT ei.id, true
        FROM event_invitations ei
        WHERE ei.event_id = ceremony_id AND ei.guest_id = guest_id;
        
        -- Reception RSVP
        INSERT INTO event_rsvps (event_invitation_id, attending)
        SELECT ei.id, true
        FROM event_invitations ei
        WHERE ei.event_id = reception_id AND ei.guest_id = guest_id;
      END IF;
    END LOOP;

    -- Invite first 40 to Welcome Dinner (28 will attend)
    FOR i IN 1..40 LOOP
      IF i <= array_length(guest_ids, 1) THEN
        guest_id := guest_ids[i];
        INSERT INTO event_invitations (event_id, guest_id) VALUES (welcome_dinner_id, guest_id);
        
        -- First 28 attend
        IF i <= 28 THEN
          INSERT INTO event_rsvps (event_invitation_id, attending)
          SELECT ei.id, true
          FROM event_invitations ei
          WHERE ei.event_id = welcome_dinner_id AND ei.guest_id = guest_id;
        END IF;
      END IF;
    END LOOP;

    -- Invite first 60 to Brunch (42 will attend)
    FOR i IN 1..60 LOOP
      IF i <= array_length(guest_ids, 1) THEN
        guest_id := guest_ids[i];
        INSERT INTO event_invitations (event_id, guest_id) VALUES (brunch_id, guest_id);
        
        -- First 42 attend
        IF i <= 42 THEN
          INSERT INTO event_rsvps (event_invitation_id, attending)
          SELECT ei.id, true
          FROM event_invitations ei
          WHERE ei.event_id = brunch_id AND ei.guest_id = guest_id;
        END IF;
      END IF;
    END LOOP;

    -- Create photos
    INSERT INTO photos (wedding_site_id, url, thumbnail_url, caption, category, display_order)
    VALUES 
      (demo_site_id, 'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg', 'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?w=300', 'Sunset at our venue', 'venue', 1),
      (demo_site_id, 'https://images.pexels.com/photos/2788792/pexels-photo-2788792.jpeg', 'https://images.pexels.com/photos/2788792/pexels-photo-2788792.jpeg?w=300', 'The proposal moment', 'engagement', 2),
      (demo_site_id, 'https://images.pexels.com/photos/3014856/pexels-photo-3014856.jpeg', 'https://images.pexels.com/photos/3014856/pexels-photo-3014856.jpeg?w=300', 'Our engagement photos', 'engagement', 3);

    -- Create registry items
    INSERT INTO registry_items (wedding_site_id, item_name, description, price, store_name, quantity_needed, quantity_purchased, priority)
    VALUES 
      (demo_site_id, 'KitchenAid Stand Mixer', 'Professional 5-quart mixer', 449.99, 'Williams Sonoma', 1, 0, 'high'),
      (demo_site_id, 'Le Creuset Dutch Oven', '7.25-quart enameled cast iron', 399.95, 'Sur La Table', 1, 1, 'high'),
      (demo_site_id, 'Luxury Sheet Set', 'Egyptian cotton 800 thread count', 249.00, 'Pottery Barn', 2, 0, 'medium'),
      (demo_site_id, 'Coffee Maker', 'Programmable 12-cup with thermal carafe', 129.99, 'Crate & Barrel', 1, 0, 'medium');

    -- Create site content
    INSERT INTO site_content (wedding_site_id, section_type, title, content, display_order, is_visible)
    VALUES 
      (demo_site_id, 'story', 'Our Love Story', 'We met five years ago at a coffee shop. What started as a conversation about bikes turned into hours of talking about everything. Now we''re ready to celebrate our love with all of you!', 1, true),
      (demo_site_id, 'faq', 'FAQ', 'What should I wear? Garden formal attire. Will there be dancing? Absolutely!', 2, true);

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER on_demo_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_demo_wedding_data();