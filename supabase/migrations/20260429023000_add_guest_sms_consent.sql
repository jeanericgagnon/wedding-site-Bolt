-- Store guest consent for SMS reminders and wedding updates.
alter table if exists guests
  add column if not exists sms_consent boolean not null default false;
