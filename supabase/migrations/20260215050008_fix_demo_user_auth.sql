/*
  # Fix Demo User Authentication

  ## Overview
  Removes the manually inserted demo user from auth.users table and cleans up related data.
  This allows Supabase to properly create the user through its auth API.

  ## Changes
  1. Delete demo wedding data that references the manual user
  2. Delete the manually inserted demo user from auth.users
  3. Create a function to automatically create demo wedding data when a user with demo@dayof.love signs up

  ## Security
  - Properly uses Supabase's auth system instead of manual user insertion
  - Maintains data integrity with proper foreign key handling
*/

-- Delete demo wedding data first (to handle foreign key constraints)
DELETE FROM wedding_sites WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- Delete the manually inserted demo user
DELETE FROM auth.users WHERE email = 'demo@dayof.love';

-- Create a function to set up demo data for new demo users
CREATE OR REPLACE FUNCTION create_demo_wedding_data()
RETURNS TRIGGER AS $$
DECLARE
  demo_site_id uuid;
  household_1 uuid;
  household_2 uuid;
  household_3 uuid;
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

    -- Generate household IDs
    household_1 := gen_random_uuid();
    household_2 := gen_random_uuid();
    household_3 := gen_random_uuid();

    -- Create guests
    INSERT INTO guests (wedding_site_id, name, first_name, last_name, email, phone, plus_one_allowed, rsvp_status, meal_preference, household_id, invite_token, invited_to_ceremony, invited_to_reception, invitation_sent_at)
    VALUES 
      (demo_site_id, 'Sarah Mitchell', 'Sarah', 'Mitchell', 'sarah.mitchell@email.com', '555-0101', true, 'confirmed', 'Vegetarian', household_1, 'token-sarah-mitchell', true, true, now() - interval '30 days'),
      (demo_site_id, 'Michael Chen', 'Michael', 'Chen', 'michael.chen@email.com', '555-0102', false, 'confirmed', 'Chicken', household_2, 'token-michael-chen', true, true, now() - interval '30 days'),
      (demo_site_id, 'Emily Rodriguez', 'Emily', 'Rodriguez', 'emily.rodriguez@email.com', '555-0103', true, 'confirmed', 'Fish', household_3, 'token-emily-rodriguez', true, true, now() - interval '30 days'),
      (demo_site_id, 'David Park', 'David', 'Park', 'david.park@email.com', '555-0104', false, 'pending', null, null, 'token-david-park', true, true, now() - interval '25 days'),
      (demo_site_id, 'Jessica Taylor', 'Jessica', 'Taylor', 'jessica.taylor@email.com', '555-0105', true, 'pending', null, null, 'token-jessica-taylor', true, true, now() - interval '25 days'),
      (demo_site_id, 'James Wilson', 'James', 'Wilson', 'james.wilson@email.com', '555-0106', false, 'confirmed', 'Beef', null, 'token-james-wilson', true, true, now() - interval '20 days'),
      (demo_site_id, 'Amanda Brown', 'Amanda', 'Brown', 'amanda.brown@email.com', '555-0107', true, 'declined', null, null, 'token-amanda-brown', true, true, now() - interval '20 days'),
      (demo_site_id, 'Robert Lee', 'Robert', 'Lee', 'robert.lee@email.com', '555-0108', false, 'confirmed', 'Vegetarian', null, 'token-robert-lee', true, true, now() - interval '15 days'),
      (demo_site_id, 'Lisa Anderson', 'Lisa', 'Anderson', 'lisa.anderson@email.com', '555-0109', true, 'confirmed', 'Chicken', null, 'token-lisa-anderson', true, true, now() - interval '15 days'),
      (demo_site_id, 'Christopher Davis', 'Christopher', 'Davis', 'chris.davis@email.com', '555-0110', false, 'pending', null, null, 'token-chris-davis', true, true, now() - interval '10 days');

    -- Create RSVPs for confirmed/declined guests
    INSERT INTO rsvps (guest_id, attending, meal_choice, plus_one_name, notes, responded_at)
    SELECT g.id, true, 'Vegetarian', 'Marcus Mitchell', 'Looking forward to it!', now() - interval '28 days'
    FROM guests g WHERE g.email = 'sarah.mitchell@email.com' AND g.wedding_site_id = demo_site_id
    UNION ALL
    SELECT g.id, true, 'Chicken', null, 'Can''t wait to celebrate with you both!', now() - interval '27 days'
    FROM guests g WHERE g.email = 'michael.chen@email.com' AND g.wedding_site_id = demo_site_id
    UNION ALL
    SELECT g.id, true, 'Fish', 'Alex Rodriguez', 'So excited!', now() - interval '26 days'
    FROM guests g WHERE g.email = 'emily.rodriguez@email.com' AND g.wedding_site_id = demo_site_id
    UNION ALL
    SELECT g.id, true, 'Beef', null, 'Honored to be there!', now() - interval '18 days'
    FROM guests g WHERE g.email = 'james.wilson@email.com' AND g.wedding_site_id = demo_site_id
    UNION ALL
    SELECT g.id, false, null, null, 'Sorry, have a prior commitment', now() - interval '19 days'
    FROM guests g WHERE g.email = 'amanda.brown@email.com' AND g.wedding_site_id = demo_site_id
    UNION ALL
    SELECT g.id, true, 'Vegetarian', null, 'Congratulations!', now() - interval '13 days'
    FROM guests g WHERE g.email = 'robert.lee@email.com' AND g.wedding_site_id = demo_site_id
    UNION ALL
    SELECT g.id, true, 'Chicken', 'Tom Anderson', 'Wouldn''t miss it!', now() - interval '14 days'
    FROM guests g WHERE g.email = 'lisa.anderson@email.com' AND g.wedding_site_id = demo_site_id;

    -- Create photos
    INSERT INTO photos (wedding_site_id, url, thumbnail_url, caption, category, display_order, uploaded_at)
    VALUES 
      (demo_site_id, 'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg', 'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?w=300', 'Sunset at our venue', 'venue', 1, now() - interval '45 days'),
      (demo_site_id, 'https://images.pexels.com/photos/2788792/pexels-photo-2788792.jpeg', 'https://images.pexels.com/photos/2788792/pexels-photo-2788792.jpeg?w=300', 'The proposal moment', 'engagement', 2, now() - interval '40 days'),
      (demo_site_id, 'https://images.pexels.com/photos/3014856/pexels-photo-3014856.jpeg', 'https://images.pexels.com/photos/3014856/pexels-photo-3014856.jpeg?w=300', 'Our engagement photos', 'engagement', 3, now() - interval '38 days'),
      (demo_site_id, 'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg', 'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?w=300', 'The beautiful gardens', 'venue', 4, now() - interval '35 days'),
      (demo_site_id, 'https://images.pexels.com/photos/3014856/pexels-photo-3014856.jpeg', 'https://images.pexels.com/photos/3014856/pexels-photo-3014856.jpeg?w=300', 'Celebrating together', 'engagement', 5, now() - interval '32 days'),
      (demo_site_id, 'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg', 'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?w=300', 'The ceremony space', 'venue', 6, now() - interval '30 days');

    -- Create registry items
    INSERT INTO registry_items (wedding_site_id, item_name, description, price, store_name, item_url, image_url, quantity_needed, quantity_purchased, priority)
    VALUES 
      (demo_site_id, 'KitchenAid Stand Mixer', 'Professional 5-quart mixer in champagne', 449.99, 'Williams Sonoma', 'https://www.williams-sonoma.com', 'https://images.pexels.com/photos/4226804/pexels-photo-4226804.jpeg?w=300', 1, 0, 'high'),
      (demo_site_id, 'Le Creuset Dutch Oven', '7.25-quart enameled cast iron in sage', 399.95, 'Sur La Table', 'https://www.surlatable.com', 'https://images.pexels.com/photos/4226804/pexels-photo-4226804.jpeg?w=300', 1, 1, 'high'),
      (demo_site_id, 'Luxury Sheet Set', 'Egyptian cotton 800 thread count, king size', 249.00, 'Pottery Barn', 'https://www.potterybarn.com', 'https://images.pexels.com/photos/4226804/pexels-photo-4226804.jpeg?w=300', 2, 0, 'medium'),
      (demo_site_id, 'Coffee Maker', 'Programmable 12-cup with thermal carafe', 129.99, 'Crate & Barrel', 'https://www.crateandbarrel.com', 'https://images.pexels.com/photos/4226804/pexels-photo-4226804.jpeg?w=300', 1, 0, 'medium'),
      (demo_site_id, 'Dinnerware Set', '16-piece porcelain set in white', 189.99, 'West Elm', 'https://www.westelm.com', 'https://images.pexels.com/photos/4226804/pexels-photo-4226804.jpeg?w=300', 1, 0, 'high'),
      (demo_site_id, 'Bath Towel Set', 'Organic cotton 6-piece set', 99.99, 'Bed Bath & Beyond', 'https://www.bedbathandbeyond.com', 'https://images.pexels.com/photos/4226804/pexels-photo-4226804.jpeg?w=300', 2, 1, 'low'),
      (demo_site_id, 'Wine Glasses', 'Crystal stemware set of 8', 79.99, 'Crate & Barrel', 'https://www.crateandbarrel.com', 'https://images.pexels.com/photos/4226804/pexels-photo-4226804.jpeg?w=300', 1, 0, 'medium'),
      (demo_site_id, 'Outdoor Furniture Contribution', 'Help us furnish our patio!', 500.00, 'Cash Fund', null, 'https://images.pexels.com/photos/4226804/pexels-photo-4226804.jpeg?w=300', 1, 0, 'low');

    -- Create site content
    INSERT INTO site_content (wedding_site_id, section_type, title, content, display_order, is_visible)
    VALUES 
      (demo_site_id, 'story', 'Our Love Story', 'We met five years ago at a coffee shop in downtown San Francisco. Alex was reading a book about vintage motorcycles, and Jordan couldn''t resist asking about it. What started as a conversation about bikes turned into hours of talking about everything under the sun. We''ve been inseparable ever since.

After three amazing years together, Alex planned the perfect proposal during a weekend trip to Big Sur. As we watched the sunset from a cliff overlooking the ocean, Alex got down on one knee and asked the question that changed our lives forever.

Now we''re ready to celebrate our love with all of you at Sunset Gardens. We can''t wait to share this special day with our favorite people!', 1, true),
      (demo_site_id, 'schedule', 'Wedding Day Timeline', '3:00 PM - Guest Arrival & Cocktail Hour
Enjoy light refreshments and mingle with other guests in the garden courtyard.

4:00 PM - Ceremony
Join us as we exchange vows in the Rose Garden.

4:45 PM - Photos & Cocktails
Relax with cocktails while we capture some special moments.

6:00 PM - Reception & Dinner
Celebrate with us in the Grand Ballroom with dinner, drinks, and dancing!

9:00 PM - Cake Cutting
Watch us cut our wedding cake and enjoy a sweet treat.

10:30 PM - Last Dance
Join us for one final dance before we ride off into the sunset!', 2, true),
      (demo_site_id, 'travel', 'Travel & Accommodations', 'VENUE
Sunset Gardens Estate
123 Garden Lane
Napa Valley, CA 94558

HOTEL BLOCKS
We have reserved blocks of rooms at the following hotels:

Napa Valley Lodge
2230 Madison Street, Yountville, CA 94599
Book by May 15, 2026 using code "ALEXJORDAN"

Harvest Inn
1 Main Street, St. Helena, CA 94574
Book by May 15, 2026 using code "THOMPSON-RIVERA"

GETTING THERE
The nearest airport is San Francisco International (SFO), about 90 minutes away. We recommend renting a car for the drive up to Napa Valley.

PARKING
Ample free parking is available at the venue.', 3, true),
      (demo_site_id, 'faq', 'Frequently Asked Questions', 'What should I wear?
We suggest garden formal attire. Think light suits, cocktail dresses, and dressy separates. The ceremony will be outdoors on grass, so choose your footwear accordingly!

Can I bring a plus one?
Due to venue capacity, we can only accommodate plus ones for guests who received a "+1" on their invitation.

Will the wedding be indoors or outdoors?
The ceremony will be outdoors in the Rose Garden. The reception will be indoors in the Grand Ballroom.

What if it rains?
We have a beautiful indoor backup plan in case of inclement weather.

Are children welcome?
We love your little ones, but we''ve chosen to make our wedding an adults-only celebration.

What meal options will be available?
We''ll be serving a choice of beef, chicken, fish, or vegetarian. You''ll select your preference when you RSVP.

Will there be dancing?
Absolutely! We''ll have a DJ and a dance floor. Come ready to celebrate!', 4, true);

    -- Create messages
    INSERT INTO messages (wedding_site_id, subject, body, sent_at, channel, audience_filter, recipient_count)
    VALUES 
      (demo_site_id, 'Save the Date!', 'Dear friends and family,

We''re getting married! Please save the date for our wedding celebration on June 15, 2026 at Sunset Gardens Estate in Napa Valley, California.

Formal invitations will be sent soon. We can''t wait to celebrate with you!

With love,
Alex & Jordan', now() - interval '60 days', 'email', 'all', 10),
      (demo_site_id, 'RSVP Reminder', 'Hi everyone!

Just a friendly reminder that RSVPs are due by May 1st. If you haven''t already, please let us know if you can join us for our special day.

You can RSVP online using the link in your invitation email, or reach out to us directly if you have any questions.

Looking forward to celebrating with you!

Alex & Jordan', now() - interval '20 days', 'email', 'pending', 3),
      (demo_site_id, 'Thank You for Your RSVP!', 'Thank you so much for confirming your attendance at our wedding! We''re thrilled that you''ll be there to celebrate with us.

We''ve received your meal selection and will make sure everything is perfect for the big day. If you have any questions or need to update your information, please don''t hesitate to reach out.

See you on June 15th!

With gratitude,
Alex & Jordan', now() - interval '10 days', 'email', 'confirmed', 7);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically set up demo data for new demo users
DROP TRIGGER IF EXISTS on_demo_user_created ON auth.users;
CREATE TRIGGER on_demo_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_demo_wedding_data();
