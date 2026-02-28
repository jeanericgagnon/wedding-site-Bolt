/*
  Ensure RSVP smoke has scope-violation candidates by inserting deterministic guests
  when the project has fewer than 3 tokenized guests.
*/

WITH base AS (
  SELECT wedding_site_id
  FROM guests
  WHERE invite_token IS NOT NULL
  ORDER BY created_at ASC, id ASC
  LIMIT 1
), counts AS (
  SELECT COUNT(*)::int AS tokenized_count FROM guests WHERE invite_token IS NOT NULL
)
INSERT INTO guests (
  wedding_site_id,
  name,
  first_name,
  last_name,
  email,
  plus_one_allowed,
  invited_to_ceremony,
  invited_to_reception,
  invite_token,
  rsvp_status,
  children_allowed,
  max_children,
  max_additional_guests,
  household_id
)
SELECT
  b.wedding_site_id,
  'Smoke Reception-Only',
  'Smoke',
  'ReceptionOnly',
  'smoke.reception.only@dayof.test',
  false,
  false,
  true,
  'smoke-reception-only-token',
  'pending',
  false,
  0,
  0,
  gen_random_uuid()
FROM base b, counts c
WHERE c.tokenized_count < 2
  AND NOT EXISTS (SELECT 1 FROM guests WHERE invite_token = 'smoke-reception-only-token');

WITH base AS (
  SELECT wedding_site_id
  FROM guests
  WHERE invite_token IS NOT NULL
  ORDER BY created_at ASC, id ASC
  LIMIT 1
), counts AS (
  SELECT COUNT(*)::int AS tokenized_count FROM guests WHERE invite_token IS NOT NULL
)
INSERT INTO guests (
  wedding_site_id,
  name,
  first_name,
  last_name,
  email,
  plus_one_allowed,
  invited_to_ceremony,
  invited_to_reception,
  invite_token,
  rsvp_status,
  children_allowed,
  max_children,
  max_additional_guests,
  household_id
)
SELECT
  b.wedding_site_id,
  'Smoke Ceremony-Only',
  'Smoke',
  'CeremonyOnly',
  'smoke.ceremony.only@dayof.test',
  false,
  true,
  false,
  'smoke-ceremony-only-token',
  'pending',
  false,
  0,
  0,
  gen_random_uuid()
FROM base b, counts c
WHERE c.tokenized_count < 3
  AND NOT EXISTS (SELECT 1 FROM guests WHERE invite_token = 'smoke-ceremony-only-token');
