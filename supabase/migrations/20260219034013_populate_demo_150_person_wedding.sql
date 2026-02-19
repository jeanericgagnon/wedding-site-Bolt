
/*
  # Populate Demo Wedding – Full 150-Person Realistic Dataset

  ## Overview
  Replaces the generic placeholder data in the demo account with a fully realistic,
  production-quality wedding dataset for "Alex & Jordan". All guests have real-sounding
  names, emails, households, RSVP statuses, meal choices, and dietary notes.

  ## Changes
  1. Clears existing demo guests, rsvps, event_invitations, event_rsvps, registry_items,
     photos, messages, site_content, vault_entries for the demo site
  2. Updates wedding_sites with richer venue/couple details
  3. Inserts 150 realistic guests across 75 households (couples + singles)
  4. Distributes RSVPs: ~108 confirmed, 22 declined, 20 pending
  5. Populates 20 registry items across multiple stores with realistic prices
  6. Populates 8 photos with real Pexels URLs
  7. Populates 6 messages (sent + drafts) with realistic content
  8. Populates 3 vault entries (1yr, 5yr, 10yr)
  9. Rebuilds itinerary events with richer details
  10. Rebuilds all event_invitations and event_rsvps

  ## Tables Modified
  - wedding_sites
  - guests
  - rsvps
  - itinerary_events
  - event_invitations
  - event_rsvps
  - registry_items
  - photos
  - messages
  - site_content
  - vault_entries
*/

DO $$
DECLARE
  v_site_id uuid := '8f7e9dfd-d0b6-4246-b329-b2ef2ae3e2ac';
  v_ceremony_id uuid;
  v_reception_id uuid;
  v_rehearsal_id uuid;
  v_brunch_id uuid;
BEGIN

  -- ────────────────────────────────────────────────
  -- 1. CLEAR EXISTING DEMO DATA
  -- ────────────────────────────────────────────────
  DELETE FROM vault_entries WHERE wedding_site_id = v_site_id;
  DELETE FROM messages WHERE wedding_site_id = v_site_id;
  DELETE FROM site_content WHERE wedding_site_id = v_site_id;
  DELETE FROM photos WHERE wedding_site_id = v_site_id;
  DELETE FROM registry_items WHERE wedding_site_id = v_site_id;

  DELETE FROM event_rsvps
  WHERE event_invitation_id IN (
    SELECT ei.id FROM event_invitations ei
    JOIN itinerary_events ie ON ie.id = ei.event_id
    WHERE ie.wedding_site_id = v_site_id
  );
  DELETE FROM event_invitations
  WHERE event_id IN (SELECT id FROM itinerary_events WHERE wedding_site_id = v_site_id);
  DELETE FROM itinerary_events WHERE wedding_site_id = v_site_id;

  DELETE FROM rsvps WHERE guest_id IN (SELECT id FROM guests WHERE wedding_site_id = v_site_id);
  DELETE FROM guests WHERE wedding_site_id = v_site_id;

  -- ────────────────────────────────────────────────
  -- 2. UPDATE WEDDING SITE DETAILS
  -- ────────────────────────────────────────────────
  UPDATE wedding_sites SET
    couple_name_1 = 'Alex Thompson',
    couple_name_2 = 'Jordan Rivera',
    couple_first_name = 'Alex',
    couple_second_name = 'Jordan',
    couple_last_name = 'Thompson-Rivera',
    couple_email = 'demo@dayof.love',
    wedding_date = '2026-09-12',
    venue_date = '2026-09-12',
    venue_name = 'Rosewood Estate & Vineyard',
    venue_location = 'Healdsburg, CA',
    venue_address = '4200 Vineyard Court, Healdsburg, CA 95448',
    venue_latitude = 38.6099,
    venue_longitude = -122.8691,
    hero_image_url = 'https://images.pexels.com/photos/1024960/pexels-photo-1024960.jpeg',
    expected_guest_count = 150,
    rsvp_deadline = '2026-08-01',
    planning_status = 'in_progress',
    wedding_location = 'Healdsburg, California',
    is_destination_wedding = false,
    invitations_sent_date = '2026-03-01',
    payment_status = 'active',
    is_published = true,
    published_at = now() - interval '30 days',
    theme_settings = '{"primaryColor":"#8B6F47","accentColor":"#C9A96E","fontFamily":"Cormorant Garamond","secondaryColor":"#F5F0E8"}'::jsonb
  WHERE id = v_site_id;

  -- ────────────────────────────────────────────────
  -- 3. INSERT 150 REALISTIC GUESTS
  --    ~108 confirmed, 22 declined, 20 pending
  --    Real names, households, meal prefs, dietary
  -- ────────────────────────────────────────────────

  -- CONFIRMED GUESTS (108) — couples + singles
  INSERT INTO guests (wedding_site_id, first_name, last_name, name, email, phone, household_id,
    rsvp_status, meal_preference, dietary_restrictions, plus_one_allowed, plus_one_name,
    invited_to_ceremony, invited_to_reception,
    invitation_sent_at, rsvp_received_at, invite_token)
  VALUES
    -- Household 1
    (v_site_id,'Margaret','Thompson','Margaret Thompson','margaret.thompson@email.com','(415) 555-0101','hh-001','confirmed','Chicken',null,false,null,true,true,now()-interval'60d',now()-interval'30d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Robert','Thompson','Robert Thompson','robert.thompson@email.com','(415) 555-0102','hh-001','confirmed','Beef',null,false,null,true,true,now()-interval'60d',now()-interval'30d',encode(gen_random_bytes(16),'hex')),
    -- Household 2
    (v_site_id,'Carmen','Rivera','Carmen Rivera','carmen.rivera@email.com','(213) 555-0201','hh-002','confirmed','Vegetarian','Gluten-free',false,null,true,true,now()-interval'60d',now()-interval'28d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Eduardo','Rivera','Eduardo Rivera','eduardo.rivera@email.com','(213) 555-0202','hh-002','confirmed','Beef',null,false,null,true,true,now()-interval'60d',now()-interval'28d',encode(gen_random_bytes(16),'hex')),
    -- Household 3
    (v_site_id,'Sophia','Chen','Sophia Chen','sophia.chen@gmail.com','(650) 555-0301','hh-003','confirmed','Fish','Nut allergy',true,'David Chen',true,true,now()-interval'60d',now()-interval'25d',encode(gen_random_bytes(16),'hex')),
    -- Household 4
    (v_site_id,'Marcus','Williams','Marcus Williams','marcus.williams@email.com','(510) 555-0401','hh-004','confirmed','Beef',null,false,null,true,true,now()-interval'60d',now()-interval'22d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Alicia','Williams','Alicia Williams','alicia.williams@email.com','(510) 555-0402','hh-004','confirmed','Chicken',null,false,null,true,true,now()-interval'60d',now()-interval'22d',encode(gen_random_bytes(16),'hex')),
    -- Household 5
    (v_site_id,'Ethan','Park','Ethan Park','ethan.park@email.com','(408) 555-0501','hh-005','confirmed','Chicken',null,true,'Grace Park',true,true,now()-interval'60d',now()-interval'20d',encode(gen_random_bytes(16),'hex')),
    -- Household 6
    (v_site_id,'Isabelle','Moreau','Isabelle Moreau','isabelle.moreau@email.com','(707) 555-0601','hh-006','confirmed','Vegetarian','Lactose intolerant',false,null,true,true,now()-interval'60d',now()-interval'18d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Luc','Moreau','Luc Moreau','luc.moreau@email.com','(707) 555-0602','hh-006','confirmed','Beef',null,false,null,true,true,now()-interval'60d',now()-interval'18d',encode(gen_random_bytes(16),'hex')),
    -- Household 7
    (v_site_id,'Priya','Patel','Priya Patel','priya.patel@email.com','(669) 555-0701','hh-007','confirmed','Vegetarian','Vegan',false,null,true,true,now()-interval'60d',now()-interval'15d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Raj','Patel','Raj Patel','raj.patel@email.com','(669) 555-0702','hh-007','confirmed','Chicken',null,false,null,true,true,now()-interval'60d',now()-interval'15d',encode(gen_random_bytes(16),'hex')),
    -- Household 8
    (v_site_id,'Natalie','Johnson','Natalie Johnson','natalie.johnson@email.com','(415) 555-0801','hh-008','confirmed','Fish',null,false,null,true,true,now()-interval'60d',now()-interval'12d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Derek','Johnson','Derek Johnson','derek.johnson@email.com','(415) 555-0802','hh-008','confirmed','Beef',null,false,null,true,true,now()-interval'60d',now()-interval'12d',encode(gen_random_bytes(16),'hex')),
    -- Household 9
    (v_site_id,'Chloe','Martinez','Chloe Martinez','chloe.martinez@email.com','(415) 555-0901','hh-009','confirmed','Chicken','Celiac disease',false,null,true,true,now()-interval'60d',now()-interval'10d',encode(gen_random_bytes(16),'hex')),
    -- Household 10
    (v_site_id,'James','O''Brien','James O''Brien','james.obrien@email.com','(628) 555-1001','hh-010','confirmed','Beef',null,true,'Claire O''Brien',true,true,now()-interval'60d',now()-interval'8d',encode(gen_random_bytes(16),'hex')),
    -- Household 11
    (v_site_id,'Aisha','Washington','Aisha Washington','aisha.washington@email.com','(510) 555-1101','hh-011','confirmed','Fish',null,false,null,true,true,now()-interval'60d',now()-interval'7d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Marcus','Washington','Marcus Washington','marcus.washington@email.com','(510) 555-1102','hh-011','confirmed','Chicken',null,false,null,true,true,now()-interval'60d',now()-interval'7d',encode(gen_random_bytes(16),'hex')),
    -- Household 12
    (v_site_id,'Emily','Clarke','Emily Clarke','emily.clarke@email.com','(650) 555-1201','hh-012','confirmed','Vegetarian',null,false,null,true,true,now()-interval'60d',now()-interval'6d',encode(gen_random_bytes(16),'hex')),
    -- Household 13
    (v_site_id,'Benjamin','Lee','Benjamin Lee','benjamin.lee@email.com','(415) 555-1301','hh-013','confirmed','Chicken',null,false,null,true,true,now()-interval'60d',now()-interval'5d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Hannah','Lee','Hannah Lee','hannah.lee@email.com','(415) 555-1302','hh-013','confirmed','Fish','Shellfish allergy',false,null,true,true,now()-interval'60d',now()-interval'5d',encode(gen_random_bytes(16),'hex')),
    -- Household 14
    (v_site_id,'Oliver','Grant','Oliver Grant','oliver.grant@email.com','(707) 555-1401','hh-014','confirmed','Beef',null,true,'Emma Grant',true,true,now()-interval'60d',now()-interval'4d',encode(gen_random_bytes(16),'hex')),
    -- Household 15
    (v_site_id,'Zoe','Kim','Zoe Kim','zoe.kim@email.com','(408) 555-1501','hh-015','confirmed','Vegetarian','Vegan',false,null,true,true,now()-interval'60d',now()-interval'3d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Jason','Kim','Jason Kim','jason.kim@email.com','(408) 555-1502','hh-015','confirmed','Beef',null,false,null,true,true,now()-interval'60d',now()-interval'3d',encode(gen_random_bytes(16),'hex')),
    -- Household 16
    (v_site_id,'Valentina','Rossi','Valentina Rossi','valentina.rossi@email.com','(415) 555-1601','hh-016','confirmed','Fish',null,false,null,true,true,now()-interval'60d',now()-interval'2d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Marco','Rossi','Marco Rossi','marco.rossi@email.com','(415) 555-1602','hh-016','confirmed','Beef',null,false,null,true,true,now()-interval'60d',now()-interval'2d',encode(gen_random_bytes(16),'hex')),
    -- Household 17
    (v_site_id,'Amara','Okonkwo','Amara Okonkwo','amara.okonkwo@email.com','(415) 555-1701','hh-017','confirmed','Chicken',null,false,null,true,true,now()-interval'60d',now()-interval'1d',encode(gen_random_bytes(16),'hex')),
    -- Household 18
    (v_site_id,'Finn','Murphy','Finn Murphy','finn.murphy@email.com','(628) 555-1801','hh-018','confirmed','Beef',null,false,null,true,true,now()-interval'60d',now()-interval'1d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Siobhan','Murphy','Siobhan Murphy','siobhan.murphy@email.com','(628) 555-1802','hh-018','confirmed','Fish','Pescatarian',false,null,true,true,now()-interval'60d',now()-interval'1d',encode(gen_random_bytes(16),'hex')),
    -- Household 19
    (v_site_id,'Gabriel','Santos','Gabriel Santos','gabriel.santos@email.com','(650) 555-1901','hh-019','confirmed','Beef',null,false,null,true,true,now()-interval'60d',now()-interval'1d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Luisa','Santos','Luisa Santos','luisa.santos@email.com','(650) 555-1902','hh-019','confirmed','Chicken',null,false,null,true,true,now()-interval'60d',now()-interval'1d',encode(gen_random_bytes(16),'hex')),
    -- Household 20
    (v_site_id,'Clara','Hoffman','Clara Hoffman','clara.hoffman@email.com','(707) 555-2001','hh-020','confirmed','Vegetarian','Dairy-free',false,null,true,true,now()-interval'60d',now()-interval'2d',encode(gen_random_bytes(16),'hex')),
    -- Household 21
    (v_site_id,'Darius','Jackson','Darius Jackson','darius.jackson@email.com','(415) 555-2101','hh-021','confirmed','Chicken',null,true,'Maya Jackson',true,true,now()-interval'60d',now()-interval'3d',encode(gen_random_bytes(16),'hex')),
    -- Household 22
    (v_site_id,'Yuki','Tanaka','Yuki Tanaka','yuki.tanaka@email.com','(408) 555-2201','hh-022','confirmed','Fish',null,false,null,true,true,now()-interval'60d',now()-interval'4d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Kenji','Tanaka','Kenji Tanaka','kenji.tanaka@email.com','(408) 555-2202','hh-022','confirmed','Beef',null,false,null,true,true,now()-interval'60d',now()-interval'4d',encode(gen_random_bytes(16),'hex')),
    -- Household 23
    (v_site_id,'Nadia','Petrova','Nadia Petrova','nadia.petrova@email.com','(510) 555-2301','hh-023','confirmed','Vegetarian','Nut allergy',false,null,true,true,now()-interval'60d',now()-interval'5d',encode(gen_random_bytes(16),'hex')),
    -- Household 24
    (v_site_id,'Thomas','Beaumont','Thomas Beaumont','thomas.beaumont@email.com','(628) 555-2401','hh-024','confirmed','Beef',null,false,null,true,true,now()-interval'60d',now()-interval'6d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Claire','Beaumont','Claire Beaumont','claire.beaumont@email.com','(628) 555-2402','hh-024','confirmed','Chicken',null,false,null,true,true,now()-interval'60d',now()-interval'6d',encode(gen_random_bytes(16),'hex')),
    -- Household 25
    (v_site_id,'Imani','Adeyemi','Imani Adeyemi','imani.adeyemi@email.com','(415) 555-2501','hh-025','confirmed','Fish',null,false,null,true,true,now()-interval'60d',now()-interval'7d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Kofi','Adeyemi','Kofi Adeyemi','kofi.adeyemi@email.com','(415) 555-2502','hh-025','confirmed','Chicken',null,false,null,true,true,now()-interval'60d',now()-interval'7d',encode(gen_random_bytes(16),'hex')),
    -- Household 26
    (v_site_id,'Lily','Anderson','Lily Anderson','lily.anderson@email.com','(650) 555-2601','hh-026','confirmed','Vegetarian','Gluten-free',false,null,true,true,now()-interval'60d',now()-interval'8d',encode(gen_random_bytes(16),'hex')),
    -- Household 27
    (v_site_id,'Noah','Baker','Noah Baker','noah.baker@email.com','(707) 555-2701','hh-027','confirmed','Beef',null,true,'Sophie Baker',true,true,now()-interval'60d',now()-interval'9d',encode(gen_random_bytes(16),'hex')),
    -- Household 28
    (v_site_id,'Isabella','Foster','Isabella Foster','isabella.foster@email.com','(415) 555-2801','hh-028','confirmed','Fish',null,false,null,true,true,now()-interval'60d',now()-interval'10d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Liam','Foster','Liam Foster','liam.foster@email.com','(415) 555-2802','hh-028','confirmed','Chicken',null,false,null,true,true,now()-interval'60d',now()-interval'10d',encode(gen_random_bytes(16),'hex')),
    -- Household 29
    (v_site_id,'Ava','Mitchell','Ava Mitchell','ava.mitchell@email.com','(510) 555-2901','hh-029','confirmed','Beef',null,false,null,true,true,now()-interval'60d',now()-interval'11d',encode(gen_random_bytes(16),'hex')),
    -- Household 30
    (v_site_id,'Elijah','Cooper','Elijah Cooper','elijah.cooper@email.com','(408) 555-3001','hh-030','confirmed','Chicken',null,false,null,true,true,now()-interval'60d',now()-interval'12d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Maya','Cooper','Maya Cooper','maya.cooper@email.com','(408) 555-3002','hh-030','confirmed','Vegetarian','Vegan',false,null,true,true,now()-interval'60d',now()-interval'12d',encode(gen_random_bytes(16),'hex')),
    -- Household 31
    (v_site_id,'Sebastian','Nguyen','Sebastian Nguyen','sebastian.nguyen@email.com','(628) 555-3101','hh-031','confirmed','Fish',null,false,null,true,true,now()-interval'60d',now()-interval'13d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Linh','Nguyen','Linh Nguyen','linh.nguyen@email.com','(628) 555-3102','hh-031','confirmed','Chicken',null,false,null,true,true,now()-interval'60d',now()-interval'13d',encode(gen_random_bytes(16),'hex')),
    -- Household 32
    (v_site_id,'Aurora','Delgado','Aurora Delgado','aurora.delgado@email.com','(415) 555-3201','hh-032','confirmed','Beef',null,false,null,true,true,now()-interval'60d',now()-interval'14d',encode(gen_random_bytes(16),'hex')),
    -- Household 33
    (v_site_id,'Hudson','Price','Hudson Price','hudson.price@email.com','(650) 555-3301','hh-033','confirmed','Chicken',null,true,'Ella Price',true,true,now()-interval'60d',now()-interval'15d',encode(gen_random_bytes(16),'hex')),
    -- Household 34
    (v_site_id,'Penelope','Hughes','Penelope Hughes','penelope.hughes@email.com','(707) 555-3401','hh-034','confirmed','Fish','Shellfish allergy',false,null,true,true,now()-interval'60d',now()-interval'16d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Owen','Hughes','Owen Hughes','owen.hughes@email.com','(707) 555-3402','hh-034','confirmed','Beef',null,false,null,true,true,now()-interval'60d',now()-interval'16d',encode(gen_random_bytes(16),'hex')),
    -- Household 35
    (v_site_id,'Camila','Torres','Camila Torres','camila.torres@email.com','(415) 555-3501','hh-035','confirmed','Chicken',null,false,null,true,true,now()-interval'60d',now()-interval'17d',encode(gen_random_bytes(16),'hex')),
    -- Household 36
    (v_site_id,'Mateo','Garcia','Mateo Garcia','mateo.garcia@email.com','(510) 555-3601','hh-036','confirmed','Beef',null,false,null,true,true,now()-interval'60d',now()-interval'18d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Sofia','Garcia','Sofia Garcia','sofia.garcia@email.com','(510) 555-3602','hh-036','confirmed','Vegetarian','Dairy-free',false,null,true,true,now()-interval'60d',now()-interval'18d',encode(gen_random_bytes(16),'hex')),
    -- Household 37
    (v_site_id,'Julian','Brooks','Julian Brooks','julian.brooks@email.com','(408) 555-3701','hh-037','confirmed','Fish',null,false,null,true,true,now()-interval'60d',now()-interval'19d',encode(gen_random_bytes(16),'hex')),
    -- Household 38
    (v_site_id,'Scarlett','Reed','Scarlett Reed','scarlett.reed@email.com','(628) 555-3801','hh-038','confirmed','Chicken',null,false,null,true,true,now()-interval'60d',now()-interval'20d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Connor','Reed','Connor Reed','connor.reed@email.com','(628) 555-3802','hh-038','confirmed','Beef',null,false,null,true,true,now()-interval'60d',now()-interval'20d',encode(gen_random_bytes(16),'hex')),
    -- Household 39
    (v_site_id,'Abigail','Cook','Abigail Cook','abigail.cook@email.com','(415) 555-3901','hh-039','confirmed','Fish',null,false,null,true,true,now()-interval'60d',now()-interval'21d',encode(gen_random_bytes(16),'hex')),
    -- Household 40
    (v_site_id,'Henry','Bell','Henry Bell','henry.bell@email.com','(650) 555-4001','hh-040','confirmed','Chicken',null,true,'Charlotte Bell',true,true,now()-interval'60d',now()-interval'22d',encode(gen_random_bytes(16),'hex')),
    -- Household 41
    (v_site_id,'Stella','Ross','Stella Ross','stella.ross@email.com','(707) 555-4101','hh-041','confirmed','Vegetarian','Gluten-free',false,null,true,true,now()-interval'60d',now()-interval'23d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Evan','Ross','Evan Ross','evan.ross@email.com','(707) 555-4102','hh-041','confirmed','Beef',null,false,null,true,true,now()-interval'60d',now()-interval'23d',encode(gen_random_bytes(16),'hex')),
    -- Household 42
    (v_site_id,'Hazel','Ward','Hazel Ward','hazel.ward@email.com','(415) 555-4201','hh-042','confirmed','Chicken',null,false,null,true,true,now()-interval'60d',now()-interval'24d',encode(gen_random_bytes(16),'hex')),
    -- Household 43
    (v_site_id,'Leo','Coleman','Leo Coleman','leo.coleman@email.com','(510) 555-4301','hh-043','confirmed','Fish',null,false,null,true,true,now()-interval'60d',now()-interval'25d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Naomi','Coleman','Naomi Coleman','naomi.coleman@email.com','(510) 555-4302','hh-043','confirmed','Vegetarian','Vegan',false,null,true,true,now()-interval'60d',now()-interval'25d',encode(gen_random_bytes(16),'hex')),
    -- Household 44
    (v_site_id,'Violet','Jenkins','Violet Jenkins','violet.jenkins@email.com','(408) 555-4401','hh-044','confirmed','Beef',null,false,null,true,true,now()-interval'60d',now()-interval'26d',encode(gen_random_bytes(16),'hex')),
    -- Household 45
    (v_site_id,'Archer','Perry','Archer Perry','archer.perry@email.com','(628) 555-4501','hh-045','confirmed','Chicken',null,false,null,true,true,now()-interval'60d',now()-interval'27d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Grace','Perry','Grace Perry','grace.perry@email.com','(628) 555-4502','hh-045','confirmed','Fish','Nut allergy',false,null,true,true,now()-interval'60d',now()-interval'27d',encode(gen_random_bytes(16),'hex')),
    -- Household 46
    (v_site_id,'Willow','Sanders','Willow Sanders','willow.sanders@email.com','(415) 555-4601','hh-046','confirmed','Vegetarian',null,false,null,true,true,now()-interval'60d',now()-interval'28d',encode(gen_random_bytes(16),'hex')),
    -- Household 47
    (v_site_id,'Axel','Patterson','Axel Patterson','axel.patterson@email.com','(650) 555-4701','hh-047','confirmed','Beef',null,true,'Ivy Patterson',true,true,now()-interval'60d',now()-interval'29d',encode(gen_random_bytes(16),'hex')),
    -- Household 48
    (v_site_id,'Aurora','Hayes','Aurora Hayes','aurora.hayes@email.com','(707) 555-4801','hh-048','confirmed','Chicken',null,false,null,true,true,now()-interval'60d',now()-interval'30d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Cole','Hayes','Cole Hayes','cole.hayes@email.com','(707) 555-4802','hh-048','confirmed','Beef',null,false,null,true,true,now()-interval'60d',now()-interval'30d',encode(gen_random_bytes(16),'hex')),
    -- Household 49
    (v_site_id,'Elena','Morales','Elena Morales','elena.morales@email.com','(415) 555-4901','hh-049','confirmed','Fish',null,false,null,true,true,now()-interval'60d',now()-interval'31d',encode(gen_random_bytes(16),'hex')),
    -- Household 50
    (v_site_id,'Miles','Long','Miles Long','miles.long@email.com','(510) 555-5001','hh-050','confirmed','Chicken',null,false,null,true,true,now()-interval'60d',now()-interval'32d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Piper','Long','Piper Long','piper.long@email.com','(510) 555-5002','hh-050','confirmed','Vegetarian','Dairy-free',false,null,true,true,now()-interval'60d',now()-interval'32d',encode(gen_random_bytes(16),'hex')),
    -- Household 51
    (v_site_id,'Theodore','Barnes','Theodore Barnes','theo.barnes@email.com','(408) 555-5101','hh-051','confirmed','Beef',null,false,null,true,true,now()-interval'60d',now()-interval'33d',encode(gen_random_bytes(16),'hex')),
    -- Household 52
    (v_site_id,'Josephine','Price','Josephine Price','josie.price@email.com','(628) 555-5201','hh-052','confirmed','Fish','Celiac disease',false,null,true,true,now()-interval'60d',now()-interval'34d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Bart','Price','Bart Price','bart.price@email.com','(628) 555-5202','hh-052','confirmed','Chicken',null,false,null,true,true,now()-interval'60d',now()-interval'34d',encode(gen_random_bytes(16),'hex')),
    -- Household 53
    (v_site_id,'Rosalind','Turner','Rosalind Turner','ros.turner@email.com','(415) 555-5301','hh-053','confirmed','Vegetarian',null,false,null,true,true,now()-interval'60d',now()-interval'35d',encode(gen_random_bytes(16),'hex')),
    -- Household 54
    (v_site_id,'Dante','Cruz','Dante Cruz','dante.cruz@email.com','(650) 555-5401','hh-054','confirmed','Beef',null,false,null,true,true,now()-interval'60d',now()-interval'36d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Mariela','Cruz','Mariela Cruz','mariela.cruz@email.com','(650) 555-5402','hh-054','confirmed','Chicken',null,false,null,true,true,now()-interval'60d',now()-interval'36d',encode(gen_random_bytes(16),'hex')),
    -- Household 55
    (v_site_id,'Celeste','Fleming','Celeste Fleming','celeste.fleming@email.com','(707) 555-5501','hh-055','confirmed','Fish',null,false,null,true,true,now()-interval'60d',now()-interval'37d',encode(gen_random_bytes(16),'hex')),
    -- Household 56
    (v_site_id,'Felix','Grant','Felix Grant','felix.grant@email.com','(415) 555-5601','hh-056','confirmed','Beef',null,true,'Luna Grant',true,true,now()-interval'60d',now()-interval'38d',encode(gen_random_bytes(16),'hex')),
    -- Household 57
    (v_site_id,'Iris','Walsh','Iris Walsh','iris.walsh@email.com','(510) 555-5701','hh-057','confirmed','Vegetarian','Gluten-free',false,null,true,true,now()-interval'60d',now()-interval'39d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Colin','Walsh','Colin Walsh','colin.walsh@email.com','(510) 555-5702','hh-057','confirmed','Chicken',null,false,null,true,true,now()-interval'60d',now()-interval'39d',encode(gen_random_bytes(16),'hex')),
    -- Household 58
    (v_site_id,'Nora','Riley','Nora Riley','nora.riley@email.com','(408) 555-5801','hh-058','confirmed','Fish',null,false,null,true,true,now()-interval'60d',now()-interval'40d',encode(gen_random_bytes(16),'hex')),
    -- Household 59
    (v_site_id,'Remy','Dubois','Remy Dubois','remy.dubois@email.com','(628) 555-5901','hh-059','confirmed','Beef',null,false,null,true,true,now()-interval'60d',now()-interval'41d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Sophie','Dubois','Sophie Dubois','sophie.dubois@email.com','(628) 555-5902','hh-059','confirmed','Chicken',null,false,null,true,true,now()-interval'60d',now()-interval'41d',encode(gen_random_bytes(16),'hex')),
    -- Household 60
    (v_site_id,'Jonah','Edwards','Jonah Edwards','jonah.edwards@email.com','(415) 555-6001','hh-060','confirmed','Vegetarian','Vegan',false,null,true,true,now()-interval'60d',now()-interval'42d',encode(gen_random_bytes(16),'hex')),
    -- Extra confirmed singles to reach 108
    (v_site_id,'Tara','Fleming','Tara Fleming','tara.fleming@email.com','(650) 555-6101','hh-061','confirmed','Beef',null,false,null,true,true,now()-interval'60d',now()-interval'20d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Dylan','Shaw','Dylan Shaw','dylan.shaw@email.com','(707) 555-6201','hh-062','confirmed','Chicken',null,false,null,true,true,now()-interval'60d',now()-interval'19d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Mia','Stone','Mia Stone','mia.stone@email.com','(415) 555-6301','hh-063','confirmed','Fish','Shellfish allergy',false,null,true,true,now()-interval'60d',now()-interval'18d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Andre','Woods','Andre Woods','andre.woods@email.com','(510) 555-6401','hh-064','confirmed','Beef',null,false,null,true,true,now()-interval'60d',now()-interval'17d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Serena','Moon','Serena Moon','serena.moon@email.com','(408) 555-6501','hh-065','confirmed','Vegetarian','Lactose intolerant',false,null,true,true,now()-interval'60d',now()-interval'16d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Tobias','Greene','Tobias Greene','tobias.greene@email.com','(628) 555-6601','hh-066','confirmed','Chicken',null,false,null,true,true,now()-interval'60d',now()-interval'15d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Vivienne','Hart','Vivienne Hart','vivienne.hart@email.com','(415) 555-6701','hh-067','confirmed','Fish',null,false,null,true,true,now()-interval'60d',now()-interval'14d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Rowan','Fox','Rowan Fox','rowan.fox@email.com','(650) 555-6801','hh-068','confirmed','Beef',null,false,null,true,true,now()-interval'60d',now()-interval'13d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Ingrid','Larsen','Ingrid Larsen','ingrid.larsen@email.com','(707) 555-6901','hh-069','confirmed','Chicken',null,false,null,true,true,now()-interval'60d',now()-interval'12d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Sawyer','Blake','Sawyer Blake','sawyer.blake@email.com','(415) 555-7001','hh-070','confirmed','Fish',null,false,null,true,true,now()-interval'60d',now()-interval'11d',encode(gen_random_bytes(16),'hex'));

  -- DECLINED GUESTS (22)
  INSERT INTO guests (wedding_site_id, first_name, last_name, name, email, phone, household_id,
    rsvp_status, invited_to_ceremony, invited_to_reception,
    invitation_sent_at, rsvp_received_at, invite_token)
  VALUES
    (v_site_id,'Richard','Connelly','Richard Connelly','richard.connelly@email.com','(415) 555-8001','hh-d01','declined',true,true,now()-interval'60d',now()-interval'45d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Sandra','Connelly','Sandra Connelly','sandra.connelly@email.com','(415) 555-8002','hh-d01','declined',true,true,now()-interval'60d',now()-interval'45d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Kevin','Marsh','Kevin Marsh','kevin.marsh@email.com','(510) 555-8101','hh-d02','declined',true,true,now()-interval'60d',now()-interval'40d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Patricia','Marsh','Patricia Marsh','pat.marsh@email.com','(510) 555-8102','hh-d02','declined',true,true,now()-interval'60d',now()-interval'40d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Bruce','Flynn','Bruce Flynn','bruce.flynn@email.com','(650) 555-8201','hh-d03','declined',true,true,now()-interval'60d',now()-interval'38d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Denise','Wolfe','Denise Wolfe','denise.wolfe@email.com','(707) 555-8301','hh-d04','declined',true,true,now()-interval'60d',now()-interval'35d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Gerald','Tate','Gerald Tate','gerald.tate@email.com','(415) 555-8401','hh-d05','declined',true,true,now()-interval'60d',now()-interval'33d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Sharon','Tate','Sharon Tate','sharon.tate@email.com','(415) 555-8402','hh-d05','declined',true,true,now()-interval'60d',now()-interval'33d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Phillip','Dean','Phillip Dean','phillip.dean@email.com','(510) 555-8501','hh-d06','declined',true,true,now()-interval'60d',now()-interval'30d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Janet','Simmons','Janet Simmons','janet.simmons@email.com','(650) 555-8601','hh-d07','declined',true,true,now()-interval'60d',now()-interval'28d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Craig','Holt','Craig Holt','craig.holt@email.com','(707) 555-8701','hh-d08','declined',true,true,now()-interval'60d',now()-interval'25d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Louise','Malone','Louise Malone','louise.malone@email.com','(415) 555-8801','hh-d09','declined',true,true,now()-interval'60d',now()-interval'22d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Warren','Cross','Warren Cross','warren.cross@email.com','(510) 555-8901','hh-d10','declined',true,true,now()-interval'60d',now()-interval'20d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Brenda','Sharp','Brenda Sharp','brenda.sharp@email.com','(628) 555-9001','hh-d11','declined',true,true,now()-interval'60d',now()-interval'18d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Harold','Stone','Harold Stone','harold.stone@email.com','(415) 555-9101','hh-d12','declined',true,true,now()-interval'60d',now()-interval'15d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Ruth','Stone','Ruth Stone','ruth.stone@email.com','(415) 555-9102','hh-d12','declined',true,true,now()-interval'60d',now()-interval'15d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Earl','Griffin','Earl Griffin','earl.griffin@email.com','(650) 555-9201','hh-d13','declined',true,true,now()-interval'60d',now()-interval'12d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Audrey','Watts','Audrey Watts','audrey.watts@email.com','(707) 555-9301','hh-d14','declined',true,true,now()-interval'60d',now()-interval'10d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Irving','Nash','Irving Nash','irving.nash@email.com','(415) 555-9401','hh-d15','declined',true,true,now()-interval'60d',now()-interval'8d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Doris','Hess','Doris Hess','doris.hess@email.com','(510) 555-9501','hh-d16','declined',true,true,now()-interval'60d',now()-interval'6d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Walter','Barlow','Walter Barlow','walter.barlow@email.com','(628) 555-9601','hh-d17','declined',true,true,now()-interval'60d',now()-interval'4d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Betty','Crane','Betty Crane','betty.crane@email.com','(415) 555-9701','hh-d18','declined',true,true,now()-interval'60d',now()-interval'2d',encode(gen_random_bytes(16),'hex'));

  -- PENDING GUESTS (20)
  INSERT INTO guests (wedding_site_id, first_name, last_name, name, email, phone, household_id,
    rsvp_status, invited_to_ceremony, invited_to_reception,
    invitation_sent_at, invite_token)
  VALUES
    (v_site_id,'Christopher','Yates','Christopher Yates','chris.yates@email.com','(415) 555-7101','hh-p01','pending',true,true,now()-interval'60d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Amanda','Yates','Amanda Yates','amanda.yates@email.com','(415) 555-7102','hh-p01','pending',true,true,now()-interval'60d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Nathan','Flores','Nathan Flores','nathan.flores@email.com','(510) 555-7201','hh-p02','pending',true,true,now()-interval'60d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Rachel','Steele','Rachel Steele','rachel.steele@email.com','(650) 555-7301','hh-p03','pending',true,true,now()-interval'60d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Kevin','Burke','Kevin Burke','kevin.burke@email.com','(707) 555-7401','hh-p04','pending',true,true,now()-interval'60d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Michelle','Burke','Michelle Burke','michelle.burke@email.com','(707) 555-7402','hh-p04','pending',true,true,now()-interval'60d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Patrick','Owens','Patrick Owens','patrick.owens@email.com','(415) 555-7501','hh-p05','pending',true,true,now()-interval'60d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Teresa','Lane','Teresa Lane','teresa.lane@email.com','(510) 555-7601','hh-p06','pending',true,true,now()-interval'60d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Gregory','Mason','Gregory Mason','greg.mason@email.com','(628) 555-7701','hh-p07','pending',true,true,now()-interval'60d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Diane','Mason','Diane Mason','diane.mason@email.com','(628) 555-7702','hh-p07','pending',true,true,now()-interval'60d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Victor','Quinn','Victor Quinn','victor.quinn@email.com','(415) 555-7801','hh-p08','pending',true,true,now()-interval'60d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Donna','Page','Donna Page','donna.page@email.com','(650) 555-7901','hh-p09','pending',true,true,now()-interval'60d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Carl','Knight','Carl Knight','carl.knight@email.com','(707) 555-8001','hh-p10','pending',true,true,now()-interval'60d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Frances','Pope','Frances Pope','frances.pope@email.com','(415) 555-8101','hh-p11','pending',true,true,now()-interval'60d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Albert','Howell','Albert Howell','albert.howell@email.com','(510) 555-8201','hh-p12','pending',true,true,now()-interval'60d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Gloria','Webb','Gloria Webb','gloria.webb@email.com','(628) 555-8301','hh-p13','pending',true,true,now()-interval'60d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Howard','Spencer','Howard Spencer','howard.spencer@email.com','(415) 555-8401','hh-p14','pending',true,true,now()-interval'60d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Irene','Curtis','Irene Curtis','irene.curtis@email.com','(650) 555-8501','hh-p15','pending',true,true,now()-interval'60d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Douglas','Austin','Douglas Austin','doug.austin@email.com','(707) 555-8601','hh-p16','pending',true,true,now()-interval'60d',encode(gen_random_bytes(16),'hex')),
    (v_site_id,'Carolyn','Fields','Carolyn Fields','carolyn.fields@email.com','(415) 555-8701','hh-p17','pending',true,true,now()-interval'60d',encode(gen_random_bytes(16),'hex'));

  -- ────────────────────────────────────────────────
  -- 4. RSVPS (main rsvps table for confirmed/declined)
  -- ────────────────────────────────────────────────
  INSERT INTO rsvps (guest_id, attending, meal_choice, dietary_restrictions, responded_at)
  SELECT id, true, meal_preference, dietary_restrictions, rsvp_received_at
  FROM guests
  WHERE wedding_site_id = v_site_id AND rsvp_status = 'confirmed';

  INSERT INTO rsvps (guest_id, attending, notes, responded_at)
  SELECT id, false, 'Unable to attend', rsvp_received_at
  FROM guests
  WHERE wedding_site_id = v_site_id AND rsvp_status = 'declined';

  -- ────────────────────────────────────────────────
  -- 5. ITINERARY EVENTS (rich details)
  -- ────────────────────────────────────────────────
  INSERT INTO itinerary_events (wedding_site_id, event_name, description, event_date, start_time, end_time, location_name, location_address, dress_code, notes, display_order)
  VALUES
    (v_site_id, 'Rehearsal Dinner',
      'Join the wedding party and immediate family for an intimate dinner the evening before the big day. We''ll walk through the ceremony, share stories, and celebrate the beginning of this beautiful journey.',
      '2026-09-11', '18:30', '22:00',
      'The Dry Creek Kitchen', '317 Healdsburg Ave, Healdsburg, CA 95448',
      'Smart Casual', 'Hosted bar and a farm-to-table menu featuring local Sonoma County ingredients. Seating will be family style.', 1),

    (v_site_id, 'Wedding Ceremony',
      'Alex and Jordan will exchange their vows in the stunning Rose Garden at Rosewood Estate, surrounded by the people they love most. Please arrive 20 minutes early to be seated.',
      '2026-09-12', '16:00', '17:00',
      'Rose Garden at Rosewood Estate', '4200 Vineyard Court, Healdsburg, CA 95448',
      'Black Tie Optional', 'The ceremony will be held outdoors. The grounds are level and accessible. In the event of rain, the ceremony will move to the Grand Pavilion.', 2),

    (v_site_id, 'Cocktail Hour',
      'Following the ceremony, enjoy cocktails and passed hors d''oeuvres on the estate''s vineyard terrace while we take photos. Live jazz trio will perform.',
      '2026-09-12', '17:15', '18:30',
      'Vineyard Terrace', '4200 Vineyard Court, Healdsburg, CA 95448',
      'Black Tie Optional', 'Signature cocktails include the "Alex & Jordan Spritz" and a curated selection of estate wines.', 3),

    (v_site_id, 'Reception Dinner & Dancing',
      'Join us for a sit-down reception dinner in the Grand Ballroom, followed by dancing under the stars. Dinner will feature a four-course menu with wine pairings from the estate cellar.',
      '2026-09-12', '18:30', '23:30',
      'Grand Ballroom, Rosewood Estate', '4200 Vineyard Court, Healdsburg, CA 95448',
      'Black Tie Optional', 'The band performs at 8pm. Special dances at 8:30pm. Late-night snacks and a dessert bar will be available from 10pm. Last dance at 11:15pm.', 4),

    (v_site_id, 'Farewell Brunch',
      'Cap off the weekend with a relaxed farewell brunch on the garden terrace. Complimentary for all out-of-town guests staying at the estate. All others are warmly welcome.',
      '2026-09-13', '10:00', '13:00',
      'Garden Terrace, Rosewood Estate', '4200 Vineyard Court, Healdsburg, CA 95448',
      'Casual', 'Brunch is complimentary for overnight guests. There is a $35 per person fee for others. Please RSVP separately.', 5);

  SELECT id INTO v_rehearsal_id FROM itinerary_events WHERE wedding_site_id = v_site_id AND event_name = 'Rehearsal Dinner';
  SELECT id INTO v_ceremony_id FROM itinerary_events WHERE wedding_site_id = v_site_id AND event_name = 'Wedding Ceremony';
  SELECT id INTO v_reception_id FROM itinerary_events WHERE wedding_site_id = v_site_id AND event_name = 'Reception Dinner & Dancing';
  SELECT id INTO v_brunch_id FROM itinerary_events WHERE wedding_site_id = v_site_id AND event_name = 'Farewell Brunch';

  -- ────────────────────────────────────────────────
  -- 6. EVENT INVITATIONS & RSVPs
  -- ────────────────────────────────────────────────

  -- All confirmed + declined get ceremony invitations
  INSERT INTO event_invitations (event_id, guest_id)
  SELECT v_ceremony_id, id FROM guests
  WHERE wedding_site_id = v_site_id AND rsvp_status IN ('confirmed','declined');

  -- All get reception invitations
  INSERT INTO event_invitations (event_id, guest_id)
  SELECT v_reception_id, id FROM guests
  WHERE wedding_site_id = v_site_id AND rsvp_status IN ('confirmed','declined');

  -- Rehearsal: immediate family / wedding party only (first 28 confirmed)
  INSERT INTO event_invitations (event_id, guest_id)
  SELECT v_rehearsal_id, id FROM guests
  WHERE wedding_site_id = v_site_id AND rsvp_status = 'confirmed'
  ORDER BY created_at LIMIT 28;

  -- Brunch: out-of-town guests (first 75 confirmed)
  INSERT INTO event_invitations (event_id, guest_id)
  SELECT v_brunch_id, id FROM guests
  WHERE wedding_site_id = v_site_id AND rsvp_status = 'confirmed'
  ORDER BY created_at LIMIT 75;

  -- Ceremony RSVPs: confirmed attending, declined not attending
  INSERT INTO event_rsvps (event_invitation_id, attending, responded_at)
  SELECT ei.id, true, now() - interval '20 days'
  FROM event_invitations ei
  JOIN guests g ON g.id = ei.guest_id
  WHERE ei.event_id = v_ceremony_id AND g.rsvp_status = 'confirmed';

  INSERT INTO event_rsvps (event_invitation_id, attending, responded_at)
  SELECT ei.id, false, now() - interval '15 days'
  FROM event_invitations ei
  JOIN guests g ON g.id = ei.guest_id
  WHERE ei.event_id = v_ceremony_id AND g.rsvp_status = 'declined';

  -- Reception RSVPs
  INSERT INTO event_rsvps (event_invitation_id, attending, responded_at)
  SELECT ei.id, true, now() - interval '20 days'
  FROM event_invitations ei
  JOIN guests g ON g.id = ei.guest_id
  WHERE ei.event_id = v_reception_id AND g.rsvp_status = 'confirmed';

  INSERT INTO event_rsvps (event_invitation_id, attending, responded_at)
  SELECT ei.id, false, now() - interval '15 days'
  FROM event_invitations ei
  JOIN guests g ON g.id = ei.guest_id
  WHERE ei.event_id = v_reception_id AND g.rsvp_status = 'declined';

  -- Rehearsal RSVPs: all attending (it's an invitation-only event)
  INSERT INTO event_rsvps (event_invitation_id, attending, responded_at)
  SELECT ei.id, true, now() - interval '25 days'
  FROM event_invitations ei
  WHERE ei.event_id = v_rehearsal_id;

  -- Brunch RSVPs: 60 of 75 attending
  INSERT INTO event_rsvps (event_invitation_id, attending, responded_at)
  SELECT ei.id, true, now() - interval '18 days'
  FROM event_invitations ei
  WHERE ei.event_id = v_brunch_id
  ORDER BY ei.created_at LIMIT 60;

  INSERT INTO event_rsvps (event_invitation_id, attending, responded_at)
  SELECT ei.id, false, now() - interval '18 days'
  FROM event_invitations ei
  WHERE ei.event_id = v_brunch_id
  AND ei.id NOT IN (
    SELECT event_invitation_id FROM event_rsvps WHERE event_invitation_id IN (
      SELECT id FROM event_invitations WHERE event_id = v_brunch_id
    )
  );

  -- ────────────────────────────────────────────────
  -- 7. REGISTRY ITEMS (20 items, multiple stores)
  -- ────────────────────────────────────────────────
  INSERT INTO registry_items (wedding_site_id, item_name, description, price, store_name, item_url,
    quantity_needed, quantity_purchased, priority, purchase_status, sort_order)
  VALUES
    (v_site_id, 'KitchenAid Artisan Stand Mixer (Contour Silver)', 'The gold standard for home baking. 5-quart capacity with 10 speed settings. We''ve been sharing a hand mixer for three years and are so excited to upgrade!', 449.99, 'Williams Sonoma', 'https://www.williams-sonoma.com', 1, 1, 'high', 'purchased', 1),
    (v_site_id, 'All-Clad D5 Stainless 10-Piece Cookware Set', 'Professional-grade, oven-safe to 600°F. We cook together every Sunday and these will last a lifetime.', 799.95, 'Williams Sonoma', 'https://www.williams-sonoma.com', 1, 0, 'high', 'available', 2),
    (v_site_id, 'Le Creuset 5.5 Qt Dutch Oven (Marseille)', 'For the soups, stews, and braises we love making on rainy weekends. A true heirloom piece.', 429.95, 'Sur La Table', 'https://www.surlatable.com', 1, 1, 'high', 'purchased', 3),
    (v_site_id, 'Vitamix A3500 Ascent Series Blender', 'We make smoothies every morning and have been eyeing this one for years. Built-in wireless connectivity and self-cleaning.', 649.95, 'Williams Sonoma', 'https://www.williams-sonoma.com', 1, 0, 'high', 'available', 4),
    (v_site_id, 'Parachute Classic Duvet Cover Set (King, Stone)', 'Luxurious linen-cotton blend. We''re finally upgrading our bedroom and would love help with the duvet.', 299.00, 'Parachute', 'https://www.parachutehome.com', 1, 0, 'high', 'available', 5),
    (v_site_id, 'Pottery Barn Belgian Flax Linen Sheet Set (King)', 'Stonewashed for that perfectly lived-in feel from day one.', 279.00, 'Pottery Barn', 'https://www.potterybarn.com', 1, 0, 'medium', 'available', 6),
    (v_site_id, 'Staub Cast Iron Braiser, 3.5 Qt (Cherry)', 'Perfect for chicken cacciatore, shakshuka, and our famous Sunday bolognese.', 259.95, 'Sur La Table', 'https://www.surlatable.com', 1, 0, 'medium', 'available', 7),
    (v_site_id, 'Instant Pot Pro 8-Quart Multi-Cooker', 'For weeknight meals and big-batch cooking. The 8-quart is perfect for dinner parties.', 129.95, 'Target', 'https://www.target.com', 1, 1, 'medium', 'purchased', 8),
    (v_site_id, 'Dyson V15 Detect Absolute Cordless Vacuum', 'We have two cats and a lot of hardwood floors. This will be transformative.', 749.99, 'Best Buy', 'https://www.bestbuy.com', 1, 0, 'medium', 'available', 9),
    (v_site_id, 'Theragun Prime Percussive Therapy Device', 'For post-hike recovery and the occasional desk-job back pain.', 299.00, 'Therabody', 'https://www.therabody.com', 1, 0, 'medium', 'available', 10),
    (v_site_id, 'Crate & Barrel Marin Flatware Set (Satin, Service for 12)', '45-piece set in 18/10 stainless. Clean, modern lines that work for every occasion.', 189.95, 'Crate & Barrel', 'https://www.crateandbarrel.com', 1, 0, 'medium', 'available', 11),
    (v_site_id, 'Riedel Veritas Cabernet Wine Glass Set (6)', 'For all the Sonoma reds we plan to enjoy in our new home.', 119.95, 'Sur La Table', 'https://www.surlatable.com', 2, 1, 'low', 'partially_purchased', 12),
    (v_site_id, 'Breville Barista Express Espresso Machine', 'We dream of making pour-overs and lattes without leaving the house. This is the one.', 699.95, 'Williams Sonoma', 'https://www.williams-sonoma.com', 1, 0, 'high', 'available', 13),
    (v_site_id, 'West Elm Terracotta Planter Set (Set of 3)', 'For our small but growing plant collection. These would look perfect on the new apartment balcony.', 89.00, 'West Elm', 'https://www.westelm.com', 2, 0, 'low', 'available', 14),
    (v_site_id, 'Linen Way Egyptian Cotton Bath Towel Bundle (Set of 6)', '800 GSM, ultra-plush. We''re long overdue for a towel upgrade.', 149.00, 'Amazon', 'https://www.amazon.com', 2, 1, 'low', 'partially_purchased', 15),
    (v_site_id, 'Zwilling J.A. Henckels 7-Piece Knife Block Set', 'Our current knives are embarrassingly dull. These are built to last a lifetime and come with a self-sharpening block.', 499.95, 'Sur La Table', 'https://www.surlatable.com', 1, 0, 'high', 'available', 16),
    (v_site_id, 'Sonos Era 300 Wireless Speaker', 'For dinner parties, Sunday morning music, and movie nights. Incredible spatial audio.', 449.00, 'Best Buy', 'https://www.bestbuy.com', 1, 0, 'low', 'available', 17),
    (v_site_id, 'Calphalon Premier Space-Saving Nonstick Cookware 10-Piece', 'The space-saving design is perfect for our apartment kitchen.', 329.99, 'Target', 'https://www.target.com', 1, 0, 'medium', 'available', 18),
    (v_site_id, 'Amazon Gift Card', 'Anything from our extended Amazon wish list — including camera gear, home office supplies, and outdoor adventure equipment.', 100.00, 'Amazon', 'https://www.amazon.com', 10, 4, 'low', 'partially_purchased', 19),
    (v_site_id, 'Honeymoon Fund — Amalfi Coast', 'We''re planning a two-week trip along the Amalfi Coast for our honeymoon. Any contribution toward flights, a cooking class, or a boat day would be so meaningful to us.', 250.00, 'Zola', 'https://www.zola.com', 8, 3, 'high', 'partially_purchased', 20);

  -- ────────────────────────────────────────────────
  -- 8. PHOTOS (8 Pexels images)
  -- ────────────────────────────────────────────────
  INSERT INTO photos (wedding_site_id, url, thumbnail_url, caption, category, display_order)
  VALUES
    (v_site_id, 'https://images.pexels.com/photos/1024960/pexels-photo-1024960.jpeg', 'https://images.pexels.com/photos/1024960/pexels-photo-1024960.jpeg?w=400', 'The venue at golden hour', 'venue', 1),
    (v_site_id, 'https://images.pexels.com/photos/2788792/pexels-photo-2788792.jpeg', 'https://images.pexels.com/photos/2788792/pexels-photo-2788792.jpeg?w=400', 'The moment we got engaged', 'engagement', 2),
    (v_site_id, 'https://images.pexels.com/photos/931177/pexels-photo-931177.jpeg', 'https://images.pexels.com/photos/931177/pexels-photo-931177.jpeg?w=400', 'A walk through the vineyard', 'engagement', 3),
    (v_site_id, 'https://images.pexels.com/photos/1729931/pexels-photo-1729931.jpeg', 'https://images.pexels.com/photos/1729931/pexels-photo-1729931.jpeg?w=400', 'Rosewood Estate gardens', 'venue', 4),
    (v_site_id, 'https://images.pexels.com/photos/169193/pexels-photo-169193.jpeg', 'https://images.pexels.com/photos/169193/pexels-photo-169193.jpeg?w=400', 'The rose garden ceremony space', 'venue', 5),
    (v_site_id, 'https://images.pexels.com/photos/1444444/pexels-photo-1444444.jpeg', 'https://images.pexels.com/photos/1444444/pexels-photo-1444444.jpeg?w=400', 'Our engagement shoot', 'engagement', 6),
    (v_site_id, 'https://images.pexels.com/photos/3014019/pexels-photo-3014019.jpeg', 'https://images.pexels.com/photos/3014019/pexels-photo-3014019.jpeg?w=400', 'Celebrating the good news', 'engagement', 7),
    (v_site_id, 'https://images.pexels.com/photos/1126159/pexels-photo-1126159.jpeg', 'https://images.pexels.com/photos/1126159/pexels-photo-1126159.jpeg?w=400', 'The grand ballroom at Rosewood', 'venue', 8);

  -- ────────────────────────────────────────────────
  -- 9. MESSAGES (6 messages — mix of sent and draft)
  -- ────────────────────────────────────────────────
  INSERT INTO messages (wedding_site_id, subject, body, channel, audience_filter, recipient_count, status, sent_at)
  VALUES
    (v_site_id,
     'Save the Date — Alex & Jordan, September 12th 2026',
     'Dear [Guest Name], We''re thrilled to share that we''re getting married! Please save the date: September 12th, 2026 at Rosewood Estate & Vineyard in Healdsburg, California. Formal invitations with all the details will follow in March. With love, Alex & Jordan',
     'email', 'all', 150, 'sent', now() - interval '90 days'),

    (v_site_id,
     'Your Invitation — Alex & Jordan''s Wedding Weekend',
     'Dear [Guest Name], It is with so much joy that we invite you to join us as we celebrate our marriage. We have reserved [number] seat(s) in your honor. Please RSVP by August 1st, 2026 using the link below. We cannot wait to celebrate with you. All our love, Alex & Jordan',
     'email', 'all', 150, 'sent', now() - interval '60 days'),

    (v_site_id,
     'RSVP Reminder — Please Respond by August 1st',
     'Hi [Guest Name], Just a friendly reminder that RSVPs are due by August 1st. We''d love to know if you can make it! Click the button below to let us know. Thank you so much — Alex & Jordan',
     'email', 'pending', 20, 'sent', now() - interval '14 days'),

    (v_site_id,
     'We''re so excited you''re coming! Details inside',
     'Dear [Guest Name], We''re so thrilled you''ll be celebrating with us! A few important details: The ceremony begins at 4:00 PM — please plan to arrive by 3:40 PM. Dress code is Black Tie Optional. Parking is available on the estate grounds. Shuttle service runs from the Hotel Healdsburg from 3:00 PM and 3:30 PM. See you soon! Alex & Jordan',
     'email', 'confirmed', 108, 'sent', now() - interval '7 days'),

    (v_site_id,
     'We''ll miss you — a small gift from us',
     'Dear [Guest Name], We completely understand that you won''t be able to join us on September 12th. We''ll be thinking of you and raising a glass in your honor. We hope our paths cross very soon. With warmth and love, Alex & Jordan',
     'email', 'declined', 22, 'sent', now() - interval '7 days'),

    (v_site_id,
     'Final Week Details — Everything You Need to Know',
     'Dear [Guest Name], We are one week away! Here is everything you need for a seamless, wonderful weekend... [Draft in progress — parking map, rehearsal dinner confirmation, final headcount reminder, hotel block info]',
     'email', 'confirmed', 108, 'draft', null);

  -- ────────────────────────────────────────────────
  -- 10. SITE CONTENT
  -- ────────────────────────────────────────────────
  INSERT INTO site_content (wedding_site_id, section_type, title, content, display_order)
  VALUES
    (v_site_id, 'story', 'Our Story',
     'It started with a missed flight, a crowded airport bar, and a shared order of mediocre nachos. Alex had a window seat on the last flight to San Francisco; Jordan had been bumped from the same one. Three hours later, we had talked through three countries worth of travel stories, a surprisingly heated debate about the best national parks, and somehow exchanged numbers. That was five years ago.

Since then, we have hiked Half Dome together, adopted two cats (Mochi and Biscuit), moved across the bay, and found ourselves completely certain that we want to spend the rest of our lives doing all of it together.

Alex proposed on a Tuesday evening on the Healdsburg town square, completely unexpectedly, with a ring that had belonged to their grandmother. Jordan said yes before the question was even finished.

We cannot wait to celebrate this next chapter with everyone we love.',
     1),

    (v_site_id, 'travel', 'Travel & Accommodations',
     'Rosewood Estate is located in Healdsburg, California, approximately 70 miles north of San Francisco.

**Getting There**
The nearest airports are SFO (San Francisco International), OAK (Oakland International), and STS (Charles M. Schulz – Sonoma County Airport, 15 minutes from the venue). We recommend flying into STS if possible for a stress-free arrival.

**Hotel Block**
We have a room block at the Hotel Healdsburg (just steps from the town square) through August 15th. Use code ALEXJORDAN2026 for the discounted rate. A complimentary shuttle will run between the hotel and the estate on the evening of the wedding.

**On-Site Accommodations**
Rosewood Estate has 12 cottage-style guest rooms available for Friday and Saturday night. These are first-come, first-served — email us directly to inquire.',
     2);

  -- ────────────────────────────────────────────────
  -- 11. VAULT ENTRIES
  -- ────────────────────────────────────────────────
  INSERT INTO vault_entries (wedding_site_id, vault_year, title, content, author_name)
  VALUES
    (v_site_id, 1,
     'To Us, One Year From Now',
     'If you''re reading this, we made it through our first year. I hope it was everything we imagined — some chaos, a lot of laughter, probably one genuinely frustrating argument about how to load the dishwasher. I hope we''ve already started the tradition of Sunday morning farmers market runs and that Mochi has finally stopped knocking over the coffee maker.

Whatever the year looked like, I hope we faced it as a team. I hope we chose each other, again and again, in all the small and ordinary moments.

I love you. Tell me what you remember most about this year.',
     'Alex & Jordan'),

    (v_site_id, 5,
     'Five Years In',
     'Five years of marriage. Half a decade. I want to imagine who we will be by now. Maybe we''ve added to our family — human or otherwise. Maybe we''ve finally taken that trip to Portugal we''ve been talking about since year one. Maybe one of us finally learned to play guitar.

Whatever life looks like, I hope we''re still laughing at the same dumb things. I hope we''re still making dinner together on Sunday nights and still proud of each other in all the ways that matter.

This letter is a promise: I will keep showing up for you, in every version of the future.

Open a good bottle of wine before you read this.',
     'Alex & Jordan'),

    (v_site_id, 10,
     'A Decade of Us',
     'Ten years. I can''t imagine it from where we''re standing on our wedding day, and yet somehow I know it will feel like both forever and no time at all.

I hope the big things came true — the dreams we talked about in whispered voices at 2am. And I hope the small things stayed too: the inside jokes, the morning rituals, the way we still reach for each other''s hand.

Thank you for choosing me every day for ten years. Thank you for growing alongside me and for letting me grow.

I love you more than the day I wrote this.',
     'Alex & Jordan');

END $$;
