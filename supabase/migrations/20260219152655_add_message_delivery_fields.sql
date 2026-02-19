/*
  # Add Message Delivery Tracking Fields

  ## Summary
  Adds fields needed for real email delivery pipeline: provider message IDs,
  delivery outcome tracking, retry counters, and per-recipient delivery logs.

  ## New Tables
  - `message_deliveries` — per-recipient delivery record with status, provider ID,
    timestamps, and error details. Used for retry logic and UI status display.

  ## Modified Tables
  - `messages`
    - `provider_message_id` (text) — ID returned by email provider for batch sends
    - `delivered_count` (integer) — how many individual recipients succeeded
    - `failed_count` (integer) — how many recipients failed
    - `sending_started_at` (timestamptz) — when delivery loop began
    - `sending_finished_at` (timestamptz) — when all sends resolved

  ## Security
  - RLS enabled on `message_deliveries`
  - Only authenticated owners of the wedding site can read their delivery records
  - Service-role (edge function) inserts/updates are made via service key, bypassing RLS
*/

-- Add delivery tracking columns to messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'provider_message_id'
  ) THEN
    ALTER TABLE messages ADD COLUMN provider_message_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'delivered_count'
  ) THEN
    ALTER TABLE messages ADD COLUMN delivered_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'failed_count'
  ) THEN
    ALTER TABLE messages ADD COLUMN failed_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'sending_started_at'
  ) THEN
    ALTER TABLE messages ADD COLUMN sending_started_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'sending_finished_at'
  ) THEN
    ALTER TABLE messages ADD COLUMN sending_finished_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'audience_filter'
  ) THEN
    ALTER TABLE messages ADD COLUMN audience_filter text DEFAULT 'all';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'recipient_count'
  ) THEN
    ALTER TABLE messages ADD COLUMN recipient_count integer DEFAULT 0;
  END IF;
END $$;

-- Per-recipient delivery log
CREATE TABLE IF NOT EXISTS message_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  guest_id uuid REFERENCES guests(id) ON DELETE SET NULL,
  recipient_email text NOT NULL,
  recipient_name text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  provider_message_id text,
  error_message text,
  attempted_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE message_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couples can view deliveries for their messages"
  ON message_deliveries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM messages
      JOIN wedding_sites ON messages.wedding_site_id = wedding_sites.id
      WHERE messages.id = message_deliveries.message_id
      AND wedding_sites.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_message_deliveries_message_id ON message_deliveries(message_id);
CREATE INDEX IF NOT EXISTS idx_message_deliveries_status ON message_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_messages_status_scheduled ON messages(status, scheduled_for) WHERE status IN ('queued', 'scheduled');
