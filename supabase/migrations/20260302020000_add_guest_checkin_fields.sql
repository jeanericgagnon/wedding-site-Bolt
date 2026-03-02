-- Day-of check-in support
alter table if exists guests
  add column if not exists checked_in_at timestamptz,
  add column if not exists checkin_notes text;
