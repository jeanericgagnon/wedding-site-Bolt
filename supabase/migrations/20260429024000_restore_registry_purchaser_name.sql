-- Runtime parity repair for registry purchase attribution.
alter table if exists registry_items
  add column if not exists purchaser_name text;
