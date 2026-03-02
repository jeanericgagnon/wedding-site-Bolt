/*
  Inbound SMS RSVP event log + processing audit.
*/

CREATE TABLE IF NOT EXISTS sms_inbound_rsvp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'twilio',
  from_number text NOT NULL,
  to_number text,
  message_sid text,
  raw_body text NOT NULL,
  normalized_body text NOT NULL,
  interpreted_status text CHECK (interpreted_status IN ('confirmed', 'declined', 'pending')),
  guest_id uuid REFERENCES guests(id) ON DELETE SET NULL,
  wedding_site_id uuid REFERENCES wedding_sites(id) ON DELETE SET NULL,
  process_result text NOT NULL DEFAULT 'received',
  process_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sms_inbound_rsvp_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role only sms inbound events" ON sms_inbound_rsvp_events;
CREATE POLICY "Service role only sms inbound events"
  ON sms_inbound_rsvp_events FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_sms_inbound_rsvp_events_from ON sms_inbound_rsvp_events(from_number);
CREATE INDEX IF NOT EXISTS idx_sms_inbound_rsvp_events_site ON sms_inbound_rsvp_events(wedding_site_id);
CREATE INDEX IF NOT EXISTS idx_sms_inbound_rsvp_events_created ON sms_inbound_rsvp_events(created_at DESC);
