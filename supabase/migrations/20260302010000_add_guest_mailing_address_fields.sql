-- Add mailing address fields to guests for address collection flow
alter table if exists guests
  add column if not exists mailing_address_line1 text,
  add column if not exists mailing_address_line2 text,
  add column if not exists mailing_city text,
  add column if not exists mailing_state text,
  add column if not exists mailing_postal_code text,
  add column if not exists mailing_country text;
