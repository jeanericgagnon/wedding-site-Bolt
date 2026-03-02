-- Thank-you tracking for post-wedding follow-up
alter table if exists guests
  add column if not exists thank_you_sent_at timestamptz,
  add column if not exists thank_you_notes text;
