/*
  Audit/flag smoke seed guests so they are non-contact in non-test contexts.
  Keep invite tokens/event patterns for strict smoke coverage, but clear contact channels.
*/

UPDATE guests
SET
  email = NULL,
  phone = NULL,
  invitation_sent_at = NULL,
  notes = trim(concat(coalesce(notes, ''), ' [SMOKE_SEED][DO_NOT_CONTACT]'))
WHERE invite_token IN ('smoke-reception-only-token', 'smoke-ceremony-only-token')
   OR first_name = 'Smoke'
   OR name IN ('Smoke Reception-Only', 'Smoke Ceremony-Only');
