-- Track last reminder send timestamp separately from initial invitation send
alter table if exists guests
  add column if not exists reminder_last_sent_at timestamptz;
