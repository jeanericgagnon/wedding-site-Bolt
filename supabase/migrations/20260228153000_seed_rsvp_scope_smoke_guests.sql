/*
  Seed deterministic invite-scope coverage for RSVP smoke checks.
  Ensures at least one guest is excluded from ceremony and one from reception.
*/

WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY created_at ASC, id ASC) AS rn
  FROM guests
  WHERE invite_token IS NOT NULL
)
UPDATE guests g
SET invited_to_ceremony = false,
    invited_to_reception = true,
    plus_one_allowed = false,
    children_allowed = false,
    max_children = 0,
    max_additional_guests = 0
FROM ordered o
WHERE g.id = o.id AND o.rn = 1;

WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY created_at ASC, id ASC) AS rn
  FROM guests
  WHERE invite_token IS NOT NULL
)
UPDATE guests g
SET invited_to_ceremony = true,
    invited_to_reception = false,
    plus_one_allowed = false,
    children_allowed = false,
    max_children = 0,
    max_additional_guests = 0
FROM ordered o
WHERE g.id = o.id AND o.rn = 2;
