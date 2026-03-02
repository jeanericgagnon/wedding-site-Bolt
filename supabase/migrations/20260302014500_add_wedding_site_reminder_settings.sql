-- Persist reminder automation preferences per wedding site
alter table if exists wedding_sites
  add column if not exists reminder_cadence_days integer not null default 3,
  add column if not exists auto_reminders_enabled boolean not null default false;
