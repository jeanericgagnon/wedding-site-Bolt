-- Runtime parity repair for registry item edits.
alter table if exists registry_items
  add column if not exists updated_at timestamptz not null default now();

