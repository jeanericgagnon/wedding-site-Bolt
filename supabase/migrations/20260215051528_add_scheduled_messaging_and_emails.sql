/*
  # Add Scheduled Messaging and Email Addresses

  ## Overview
  This migration enhances the messaging system with scheduled message delivery
  and automatic email address generation for couples at their custom domain.

  ## Schema Changes

  ### Updates to `wedding_sites`
  - Add `couple_email` (text) - Generated email like john-jane@dayof.love
  - Add `couple_first_name` (text) - First person's name for email generation
  - Add `couple_second_name` (text) - Second person's name for email generation

  ### Updates to `messages`
  - Add `scheduled_for` (timestamptz) - When message should be sent
  - Add `sent_at` (timestamptz) - When message was actually sent
  - Add `status` (text) - Message status: 'draft', 'scheduled', 'sent', 'failed'
  - Update existing messages to have 'sent' status if they have sent_at

  ## Important Notes
  - Email addresses are auto-generated based on couple names
  - Scheduled messages will need a background job (future implementation)
  - Messages can be saved as drafts, scheduled for later, or sent immediately
*/

-- Add new columns to wedding_sites for email generation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wedding_sites' AND column_name = 'couple_first_name'
  ) THEN
    ALTER TABLE wedding_sites ADD COLUMN couple_first_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wedding_sites' AND column_name = 'couple_second_name'
  ) THEN
    ALTER TABLE wedding_sites ADD COLUMN couple_second_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wedding_sites' AND column_name = 'couple_email'
  ) THEN
    ALTER TABLE wedding_sites ADD COLUMN couple_email text;
  END IF;
END $$;

-- Add scheduling columns to messages table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'scheduled_for'
  ) THEN
    ALTER TABLE messages ADD COLUMN scheduled_for timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'sent_at'
  ) THEN
    ALTER TABLE messages ADD COLUMN sent_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'status'
  ) THEN
    ALTER TABLE messages ADD COLUMN status text DEFAULT 'draft';
  END IF;
END $$;

-- Update existing messages to have 'sent' status
UPDATE messages 
SET status = 'sent', sent_at = created_at
WHERE status IS NULL OR status = 'draft';

-- Create function to generate couple email
CREATE OR REPLACE FUNCTION generate_couple_email()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.couple_first_name IS NOT NULL AND NEW.couple_second_name IS NOT NULL THEN
    NEW.couple_email := lower(
      regexp_replace(NEW.couple_first_name, '[^a-zA-Z0-9]', '', 'g') || 
      '-' || 
      regexp_replace(NEW.couple_second_name, '[^a-zA-Z0-9]', '', 'g')
    ) || '@dayof.love';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate email
DROP TRIGGER IF EXISTS wedding_sites_generate_email ON wedding_sites;
CREATE TRIGGER wedding_sites_generate_email
  BEFORE INSERT OR UPDATE OF couple_first_name, couple_second_name
  ON wedding_sites
  FOR EACH ROW
  EXECUTE FUNCTION generate_couple_email();

-- Add index for scheduled messages query
CREATE INDEX IF NOT EXISTS idx_messages_scheduled_for ON messages(scheduled_for) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
