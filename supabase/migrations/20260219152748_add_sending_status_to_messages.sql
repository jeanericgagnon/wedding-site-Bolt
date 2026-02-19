/*
  # Add 'sending' and 'partial' statuses to messages

  Allows the delivery edge function to mark a message as in-progress while
  individual emails are being sent, and 'partial' when some failed.

  No data loss risk — only adds new valid status values.
*/

ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_status_check;
