/*
  # Update Demo Trigger with Template Architecture Data

  1. Changes
    - Update create_demo_wedding_data trigger to populate wedding_data (jsonb)
    - Add layout_config generation for demo user
    - Add active_template_id and site_slug for demo user
    - Maintains backward compatibility with legacy columns

  2. Notes
    - Creates proper WeddingDataV1 structure
    - Creates proper LayoutConfigV1 structure
    - Demo user will have fully functional Builder on first login
*/

CREATE OR REPLACE FUNCTION create_demo_wedding_data()
RETURNS TRIGGER AS $$
DECLARE
  v_demo_site_id uuid;
  v_welcome_dinner_id uuid;
  v_ceremony_id uuid;
  v_reception_id uuid;
  v_brunch_id uuid;
  v_venue_id text;
  v_welcome_venue_id text;
  v_brunch_venue_id text;
  v_ceremony_schedule_id text;
  v_reception_schedule_id text;
  v_wedding_data jsonb;
  v_layout_config jsonb;
BEGIN
  -- Only create demo data for demo email
  IF NEW.email = 'demo@dayof.love' THEN
    -- Generate IDs for venues and schedule items
    v_venue_id := 'venue-' || substring(md5(random()::text), 1, 8);
    v_welcome_venue_id := 'venue-' || substring(md5(random()::text), 1, 8);
    v_brunch_venue_id := 'venue-' || substring(md5(random()::text), 1, 8);
    v_ceremony_schedule_id := 'schedule-' || substring(md5(random()::text), 1, 8);
    v_reception_schedule_id := 'schedule-' || substring(md5(random()::text), 1, 8);

    -- Build wedding_data JSON
    v_wedding_data := jsonb_build_object(
      'version', '1',
      'couple', jsonb_build_object(
        'partner1Name', 'Alex Thompson',
        'partner2Name', 'Jordan Rivera',
        'story', 'We met five years ago at a coffee shop in San Francisco and have been inseparable ever since. From weekend hikes to cooking adventures, every moment together has been magical.'
      ),
      'event', jsonb_build_object(
        'weddingDateISO', '2026-06-15',
        'timezone', 'America/Los_Angeles'
      ),
      'venues', jsonb_build_array(
        jsonb_build_object(
          'id', v_venue_id,
          'name', 'Sunset Gardens Estate',
          'address', '123 Garden Lane, Napa Valley, CA 94558',
          'coordinates', jsonb_build_object(
            'lat', 38.2975,
            'lng', -122.2869
          )
        ),
        jsonb_build_object(
          'id', v_welcome_venue_id,
          'name', 'The Vineyard Restaurant',
          'address', '456 Wine Road, Napa Valley, CA 94558'
        ),
        jsonb_build_object(
          'id', v_brunch_venue_id,
          'name', 'Garden Terrace Café',
          'address', '123 Garden Lane, Napa Valley, CA 94558'
        )
      ),
      'schedule', jsonb_build_array(
        jsonb_build_object(
          'id', v_ceremony_schedule_id,
          'title', 'Wedding Ceremony',
          'startTimeISO', '2026-06-15T16:00:00',
          'endTimeISO', '2026-06-15T17:00:00',
          'venueId', v_venue_id,
          'description', 'Join us as we exchange vows in the beautiful Rose Garden'
        ),
        jsonb_build_object(
          'id', v_reception_schedule_id,
          'title', 'Reception',
          'startTimeISO', '2026-06-15T18:00:00',
          'endTimeISO', '2026-06-15T23:00:00',
          'venueId', v_venue_id,
          'description', 'Dinner, drinks, and dancing under the stars'
        )
      ),
      'rsvp', jsonb_build_object(
        'enabled', true,
        'deadlineISO', '2026-05-15'
      ),
      'registry', jsonb_build_object(
        'links', jsonb_build_array(
          jsonb_build_object(
            'label', 'Williams Sonoma',
            'url', 'https://www.williams-sonoma.com/registry'
          ),
          jsonb_build_object(
            'label', 'Amazon',
            'url', 'https://www.amazon.com/wedding/registry'
          )
        )
      ),
      'faq', jsonb_build_array(
        jsonb_build_object(
          'question', 'What should I wear?',
          'answer', 'Cocktail attire. The ceremony and reception will be outdoors, so please dress accordingly.'
        ),
        jsonb_build_object(
          'question', 'Is there parking available?',
          'answer', 'Yes, complimentary valet parking will be available at the venue.'
        ),
        jsonb_build_object(
          'question', 'Can I bring a plus one?',
          'answer', 'Please check your invitation for details about additional guests.'
        )
      ),
      'theme', jsonb_build_object(
        'colorScheme', 'warm'
      ),
      'media', jsonb_build_object(
        'heroImageUrl', 'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg',
        'gallery', jsonb_build_array()
      ),
      'meta', jsonb_build_object(
        'createdAtISO', now()::text,
        'updatedAtISO', now()::text
      )
    );

    -- Build layout_config JSON
    v_layout_config := jsonb_build_object(
      'version', '1',
      'templateId', 'base',
      'pages', jsonb_build_array(
        jsonb_build_object(
          'id', 'home',
          'path', '/',
          'sections', jsonb_build_array(
            jsonb_build_object(
              'id', 'hero-1',
              'type', 'hero',
              'variant', 'default',
              'enabled', true,
              'bindings', jsonb_build_object(),
              'settings', jsonb_build_object(),
              'meta', jsonb_build_object('createdAtISO', now()::text)
            ),
            jsonb_build_object(
              'id', 'story-1',
              'type', 'story',
              'variant', 'default',
              'enabled', true,
              'bindings', jsonb_build_object(),
              'settings', jsonb_build_object(),
              'meta', jsonb_build_object('createdAtISO', now()::text)
            ),
            jsonb_build_object(
              'id', 'venue-1',
              'type', 'venue',
              'variant', 'default',
              'enabled', true,
              'bindings', jsonb_build_object('venueIds', jsonb_build_array(v_venue_id)),
              'settings', jsonb_build_object(),
              'meta', jsonb_build_object('createdAtISO', now()::text)
            ),
            jsonb_build_object(
              'id', 'schedule-1',
              'type', 'schedule',
              'variant', 'default',
              'enabled', true,
              'bindings', jsonb_build_object('scheduleItemIds', jsonb_build_array(v_ceremony_schedule_id, v_reception_schedule_id)),
              'settings', jsonb_build_object(),
              'meta', jsonb_build_object('createdAtISO', now()::text)
            ),
            jsonb_build_object(
              'id', 'travel-1',
              'type', 'travel',
              'variant', 'default',
              'enabled', true,
              'bindings', jsonb_build_object(),
              'settings', jsonb_build_object(),
              'meta', jsonb_build_object('createdAtISO', now()::text)
            ),
            jsonb_build_object(
              'id', 'registry-1',
              'type', 'registry',
              'variant', 'default',
              'enabled', true,
              'bindings', jsonb_build_object(),
              'settings', jsonb_build_object(),
              'meta', jsonb_build_object('createdAtISO', now()::text)
            ),
            jsonb_build_object(
              'id', 'faq-1',
              'type', 'faq',
              'variant', 'default',
              'enabled', true,
              'bindings', jsonb_build_object(),
              'settings', jsonb_build_object(),
              'meta', jsonb_build_object('createdAtISO', now()::text)
            ),
            jsonb_build_object(
              'id', 'rsvp-1',
              'type', 'rsvp',
              'variant', 'default',
              'enabled', true,
              'bindings', jsonb_build_object(),
              'settings', jsonb_build_object(),
              'meta', jsonb_build_object('createdAtISO', now()::text)
            )
          )
        )
      )
    );

    -- Create wedding site with both legacy and new columns
    INSERT INTO wedding_sites (
      user_id, couple_name_1, couple_name_2, wedding_date,
      venue_name, venue_location, site_url, site_slug, hero_image_url, theme_settings,
      wedding_data, layout_config, active_template_id
    ) VALUES (
      NEW.id, 'Alex Thompson', 'Jordan Rivera', '2026-06-15',
      'Sunset Gardens Estate', '123 Garden Lane, Napa Valley, CA 94558',
      'alex-jordan-' || substring(NEW.id::text, 1, 8),
      'alex-jordan-' || substring(NEW.id::text, 1, 8),
      'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg',
      '{"primaryColor": "#8B7355", "accentColor": "#D4A574"}'::jsonb,
      v_wedding_data,
      v_layout_config,
      'base'
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

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_demo_user_created ON auth.users;
CREATE TRIGGER on_demo_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_demo_wedding_data();
