-- RSVP custom questions (site-configurable) + response answers payload

ALTER TABLE wedding_sites
  ADD COLUMN IF NOT EXISTS rsvp_custom_questions jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE rsvps
  ADD COLUMN IF NOT EXISTS custom_answers jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN wedding_sites.rsvp_custom_questions IS 'Array of RSVP custom question definitions configured by the couple';
COMMENT ON COLUMN rsvps.custom_answers IS 'Object map of custom RSVP answers keyed by question id';
