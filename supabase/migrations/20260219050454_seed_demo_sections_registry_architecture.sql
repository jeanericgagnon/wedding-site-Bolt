/*
  # Seed Demo Site with Full 15-Section Registry Layout

  ## Summary
  Populates the `sections` table with a complete, polished wedding site layout
  for the demo site (alex-jordan), using the new registry-based section architecture.
  All section data is self-contained — no WeddingDataV1 dependency.

  ## What This Creates
  One record per section type in `sections`, each with a fully-formed `data` JSONB blob
  matching the Zod schemas defined in `src/sections/variants/`. The layout covers all 15
  section types specified in the architecture:

  1. hero::fullBleed
  2. countdown::simple
  3. story::twoColumn
  4. schedule::timeline
  5. venue::card
  6. travel::list
  7. accommodations::cards
  8. registry::cards
  9. gallery::masonry
  10. weddingParty::grid
  11. dressCode::moodBoard
  12. faq::accordion
  13. rsvp::multiEvent
  14. contact::form
  15. footerCta::rsvpPush

  ## Notes
  - Uses the demo site ID for the `alex-jordan` slug
  - All sections are visible by default
  - Uses ON CONFLICT DO UPDATE to be idempotent
*/

DO $$
DECLARE
  v_site_id uuid;
BEGIN
  SELECT id INTO v_site_id FROM wedding_sites WHERE site_slug = 'alex-jordan-7d75b92a' LIMIT 1;
  IF v_site_id IS NULL THEN RETURN; END IF;

  INSERT INTO sections (id, site_id, type, variant, data, "order", visible, schema_version, style_overrides, bindings)
  VALUES
    (
      'demo-hero-001', v_site_id, 'hero', 'fullBleed',
      '{"headline":"Alex & Jordan","subheadline":"September 20, 2025 · Napa Valley, California","eyebrow":"Join us to celebrate our wedding","backgroundImage":"https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=1920","overlayOpacity":50,"textAlign":"center","ctaLabel":"RSVP Now","ctaHref":"#rsvp","showDivider":true}',
      0, true, 1, '{}', '{}'
    ),
    (
      'demo-countdown-001', v_site_id, 'countdown', 'simple',
      '{"eyebrow":"Counting down to","headline":"Alex & Jordan","targetDate":"2025-09-20","messageAfter":"Today is the day! We are so happy you are here.","showSeconds":true,"background":"soft"}',
      1, true, 1, '{}', '{}'
    ),
    (
      'demo-story-001', v_site_id, 'story', 'twoColumn',
      '{"eyebrow":"Our Story","headline":"How it all began","body":"It started with a shared love of hiking and terrible coffee.\n\nWe met on a trail in Marin County — Alex had a broken water bottle and Jordan had an extra one. That small act of kindness turned into a five-mile conversation, then dinner, then years.\n\nNow we can''t imagine the trail without each other.","image":"https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=900","imageAlt":"Alex and Jordan on a trail","imagePosition":"right","quote":"The best thing to hold onto in life is each other.","quoteAttribution":"Audrey Hepburn","showDivider":true}',
      2, true, 1, '{}', '{}'
    ),
    (
      'demo-schedule-001', v_site_id, 'schedule', 'timeline',
      '{"eyebrow":"The big day","headline":"Day-of Schedule","date":"Saturday, September 20th, 2025","showDate":true,"events":[{"id":"1","time":"4:00 PM","label":"Guests Arrive","description":"Please be seated by 4:15 PM","location":"Vineyard Terrace","icon":""},{"id":"2","time":"4:30 PM","label":"Ceremony","description":"The exchange of vows","location":"Rose Garden","icon":""},{"id":"3","time":"5:30 PM","label":"Cocktail Hour","description":"Wine, hors d''oeuvres, and golden hour","location":"The Cellar Patio","icon":""},{"id":"4","time":"7:00 PM","label":"Dinner & Toasts","description":"Seated farm-to-table dinner","location":"Grand Barn","icon":""},{"id":"5","time":"9:00 PM","label":"Dancing","description":"Let''s celebrate!","location":"Grand Barn","icon":""},{"id":"6","time":"11:30 PM","label":"Farewell","description":"Safe travels home","location":"","icon":""}]}',
      3, true, 1, '{}', '{}'
    ),
    (
      'demo-venue-001', v_site_id, 'venue', 'card',
      '{"eyebrow":"Where we gather","headline":"Venue","venues":[{"id":"1","name":"Auberge du Soleil","role":"Ceremony & Reception","address":"180 Rutherford Hill Road","city":"Rutherford, CA 94573","time":"4:00 PM — Midnight","image":"https://images.pexels.com/photos/265722/pexels-photo-265722.jpeg?auto=compress&cs=tinysrgb&w=800","mapUrl":"https://maps.google.com","notes":"Shuttle service available from designated hotels. Please arrange transportation if not using the shuttle."}]}',
      4, true, 1, '{}', '{}'
    ),
    (
      'demo-travel-001', v_site_id, 'travel', 'list',
      '{"eyebrow":"Getting here","headline":"Travel & Accommodations","flightInfo":"The closest airports are San Francisco International (SFO, 75 min) and Oakland International (OAK, 80 min). Sacramento (SMF) is also an option at 60 minutes from the venue.","drivingInfo":"The venue is located on Rutherford Hill Road in Napa Valley. Take Hwy 29 North to Rutherford. We recommend building in extra time on weekends.","parkingInfo":"Complimentary self-parking is available on-site. A designated shuttle pick-up area is available if you prefer not to drive.","shuttleInfo":"Shuttles will run from the Westin Verasa and Napa Valley Marriott at 3:30 PM and 3:45 PM, returning at midnight and 12:30 AM.","generalNote":"We have secured room blocks at the hotels below. Mention our wedding when booking for the discounted group rate.","hotels":[{"id":"1","name":"Westin Verasa Napa","distance":"20 min from venue","price":"From $289/night","bookingCode":"ALEXJORDAN25","phone":"+1 (707) 257-1800","url":"","notes":"Shuttle to and from the venue included with room block rate."},{"id":"2","name":"Napa Valley Marriott","distance":"18 min from venue","price":"From $249/night","bookingCode":"WEDDING2025","phone":"+1 (707) 253-8600","url":"","notes":"Complimentary breakfast on Sunday."}]}',
      5, true, 1, '{}', '{}'
    ),
    (
      'demo-accommodations-001', v_site_id, 'accommodations', 'cards',
      '{"eyebrow":"Where to stay","headline":"Accommodations","generalNote":"We''ve reserved room blocks at two nearby hotels. Mention our wedding when booking to receive the group rate. Blocks expire August 1st, 2025.","blockNote":"Room blocks expire August 1, 2025. Book early — Napa fills up fast in September!","hotels":[{"id":"1","name":"Westin Verasa Napa","stars":4,"distance":"20 min from venue","priceRange":"$289 – $450/night","bookingCode":"ALEXJORDAN25","phone":"+1 (707) 257-1800","url":"","image":"https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg?auto=compress&cs=tinysrgb&w=800","notes":"Shuttle service to venue included. Rooftop pool. Full-service spa on property.","recommended":true},{"id":"2","name":"Napa Valley Marriott","stars":4,"distance":"18 min from venue","priceRange":"$249 – $350/night","bookingCode":"WEDDING2025","phone":"+1 (707) 253-8600","url":"","image":"https://images.pexels.com/photos/2869215/pexels-photo-2869215.jpeg?auto=compress&cs=tinysrgb&w=800","notes":"Complimentary Sunday brunch included. Pet-friendly rooms available.","recommended":false}]}',
      6, true, 1, '{}', '{}'
    ),
    (
      'demo-registry-001', v_site_id, 'registry', 'cards',
      '{"eyebrow":"Gift registry","headline":"Registry","message":"Your presence at our wedding is the greatest gift of all. For those who wish to celebrate us with a gift, we are registered at the following stores:","links":[{"id":"1","store":"Williams Sonoma","url":"#","description":"Cookware, kitchen tools, and entertaining essentials","logo":""},{"id":"2","store":"Crate & Barrel","url":"#","description":"Home décor, bedding, and tabletop","logo":""},{"id":"3","store":"REI","url":"#","description":"Outdoor gear and adventure equipment","logo":""}],"cashFundEnabled":true,"cashFundLabel":"Honeymoon Fund — Italy & Greece","cashFundUrl":"#","cashFundDescription":"Help us create lifelong memories on our honeymoon through the Amalfi Coast and Santorini."}',
      7, true, 1, '{}', '{}'
    ),
    (
      'demo-gallery-001', v_site_id, 'gallery', 'masonry',
      '{"eyebrow":"Our moments","headline":"Photos","showCaptions":false,"enableLightbox":true,"images":[{"id":"1","url":"https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=800","alt":"Alex and Jordan","caption":"","span":"2"},{"id":"2","url":"https://images.pexels.com/photos/265722/pexels-photo-265722.jpeg?auto=compress&cs=tinysrgb&w=800","alt":"Venue","caption":"","span":"1"},{"id":"3","url":"https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&cs=tinysrgb&w=800","alt":"Flowers","caption":"","span":"1"},{"id":"4","url":"https://images.pexels.com/photos/931177/pexels-photo-931177.jpeg?auto=compress&cs=tinysrgb&w=800","alt":"Detail shot","caption":"","span":"1"},{"id":"5","url":"https://images.pexels.com/photos/169198/pexels-photo-169198.jpeg?auto=compress&cs=tinysrgb&w=800","alt":"Rings","caption":"","span":"1"},{"id":"6","url":"https://images.pexels.com/photos/2959192/pexels-photo-2959192.jpeg?auto=compress&cs=tinysrgb&w=800","alt":"Couple portrait","caption":"","span":"2"}]}',
      8, true, 1, '{}', '{}'
    ),
    (
      'demo-party-001', v_site_id, 'weddingParty', 'grid',
      '{"eyebrow":"The crew","headline":"Wedding Party","subheadline":"","groupBySide":true,"partner1Label":"Alex''s Side","partner2Label":"Jordan''s Side","members":[{"id":"1","name":"Casey Rivera","role":"Maid of Honor","photo":"https://images.pexels.com/photos/1858175/pexels-photo-1858175.jpeg?auto=compress&cs=tinysrgb&w=400","note":"","side":"partner1"},{"id":"2","name":"Priya Patel","role":"Bridesmaid","photo":"https://images.pexels.com/photos/1036623/pexels-photo-1036623.jpeg?auto=compress&cs=tinysrgb&w=400","note":"","side":"partner1"},{"id":"3","name":"Mia Johnson","role":"Bridesmaid","photo":"https://images.pexels.com/photos/1065084/pexels-photo-1065084.jpeg?auto=compress&cs=tinysrgb&w=400","note":"","side":"partner1"},{"id":"4","name":"Sam Okafor","role":"Best Man","photo":"https://images.pexels.com/photos/1121796/pexels-photo-1121796.jpeg?auto=compress&cs=tinysrgb&w=400","note":"","side":"partner2"},{"id":"5","name":"Leo Martinez","role":"Groomsman","photo":"https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=400","note":"","side":"partner2"},{"id":"6","name":"Noah Kim","role":"Groomsman","photo":"https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=400","note":"","side":"partner2"}]}',
      9, true, 1, '{}', '{}'
    ),
    (
      'demo-dresscode-001', v_site_id, 'dressCode', 'moodBoard',
      '{"eyebrow":"What to wear","headline":"Dress Code","dressCode":"Black Tie Optional","description":"We invite you to dress to the nines — suits, tuxedos, floor-length gowns, and cocktail dresses are all welcome. Think vineyard-chic meets formal elegance.","colorNote":"Please reserve white, cream, and champagne tones for the wedding party.","avoidNote":"","additionalNote":"The ceremony is in an outdoor garden — consider your footwear. A light wrap is recommended for the evening.","colorPalette":[{"id":"1","color":"#1a1a2e","label":"Black"},{"id":"2","color":"#2c3e50","label":"Navy"},{"id":"3","color":"#5d4037","label":"Burgundy"},{"id":"4","color":"#795548","label":"Cognac"},{"id":"5","color":"#9e9e9e","label":"Silver"}],"moodImages":[{"id":"1","url":"https://images.pexels.com/photos/1536619/pexels-photo-1536619.jpeg?auto=compress&cs=tinysrgb&w=600","alt":"Elegant gown"},{"id":"2","url":"https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=600","alt":"Formal suit"},{"id":"3","url":"https://images.pexels.com/photos/1536619/pexels-photo-1536619.jpeg?auto=compress&cs=tinysrgb&w=600","alt":"Style inspiration"}]}',
      10, true, 1, '{}', '{}'
    ),
    (
      'demo-faq-001', v_site_id, 'faq', 'accordion',
      '{"eyebrow":"Questions","headline":"Frequently Asked Questions","subheadline":"Have a question not answered here? Reach out — we''re happy to help.","expandFirstByDefault":false,"items":[{"id":"1","question":"Is the event child-friendly?","answer":"We love your little ones! However, we have chosen to make our reception an adults-only celebration. We hope this gives you a chance to relax and enjoy the evening."},{"id":"2","question":"What is the dress code?","answer":"Black Tie Optional. We invite you to dress to impress — tuxedos, suits, evening gowns, and cocktail dresses are all welcome. Please avoid white, cream, and champagne."},{"id":"3","question":"Can I bring a plus-one?","answer":"Due to limited capacity, we can only accommodate guests who are specifically named on their invitation. If your invitation includes a plus-one, it will be indicated."},{"id":"4","question":"Is there parking at the venue?","answer":"Yes! Complimentary self-parking is available on-site. We also have a shuttle running from the Westin Verasa and Napa Valley Marriott."},{"id":"5","question":"What should I know about the outdoor ceremony?","answer":"The ceremony will take place in the Rose Garden. We recommend bringing a light jacket or wrap for the evening. The reception moves indoors to the Grand Barn."},{"id":"6","question":"What if I have dietary restrictions?","answer":"Please note any dietary needs in your RSVP form. We will do our best to accommodate vegetarian, vegan, and gluten-free guests. Just let us know!"}]}',
      11, true, 1, '{}', '{}'
    ),
    (
      'demo-rsvp-001', v_site_id, 'rsvp', 'multiEvent',
      '{"eyebrow":"Kindly reply by","headline":"RSVP","deadline":"August 1, 2025","confirmationMessage":"Thank you! We can''t wait to celebrate with you in Napa Valley.","declineMessage":"We''re so sorry you''ll miss it. You''ll be in our hearts on the day.","guestNote":"Please note any dietary restrictions or accessibility needs in the dietary field above.","events":[{"id":"1","label":"Ceremony & Reception","description":"Ceremony, cocktail hour, dinner, and dancing","date":"Saturday, September 20, 2025","location":"Auberge du Soleil, Rutherford CA"}]}',
      12, true, 1, '{}', '{}'
    ),
    (
      'demo-contact-001', v_site_id, 'contact', 'form',
      '{"eyebrow":"Need help?","headline":"Questions?","subheadline":"We''d love to hear from you.","introText":"Have a question about logistics, dietary needs, or anything else? Don''t hesitate to reach out.","emailSubject":"Wedding Question — Alex & Jordan","closingNote":"We''ll get back to you within 48 hours.","contacts":[{"id":"1","name":"Alex Chen","role":"Bride — General Inquiries","email":"alex.chen@example.com","phone":"","instagram":""},{"id":"2","name":"Casey Rivera","role":"Maid of Honor — Day-of Questions","email":"casey.rivera@example.com","phone":"+1 (415) 555-0192","instagram":""}]}',
      13, true, 1, '{}', '{}'
    ),
    (
      'demo-footer-001', v_site_id, 'footerCta', 'rsvpPush',
      '{"background":"dark","eyebrow":"","headline":"We hope to see you there","subtext":"September 20, 2025 · Napa Valley, California","ctaLabel":"RSVP Now","ctaHref":"#rsvp","showDivider":true,"footerNote":"Please RSVP by August 1, 2025","copyrightText":"Alex & Jordan · September 2025","poweredByLabel":""}',
      14, true, 1, '{}', '{}'
    )
  ON CONFLICT (id) DO UPDATE SET
    data = EXCLUDED.data,
    "order" = EXCLUDED."order",
    visible = EXCLUDED.visible,
    updated_at = now();
END $$;
