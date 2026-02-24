-- Registry cash fund support (link-based)
alter table registry_items
  add column if not exists item_type text not null default 'product';

alter table registry_items
  add column if not exists fund_goal_amount numeric;

alter table registry_items
  add column if not exists fund_received_amount numeric not null default 0;

alter table registry_items
  add column if not exists fund_venmo_url text;

alter table registry_items
  add column if not exists fund_paypal_url text;

alter table registry_items
  add column if not exists fund_zelle_handle text;

alter table registry_items
  add column if not exists fund_custom_url text;

alter table registry_items
  add column if not exists fund_custom_label text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'registry_items_item_type_check'
  ) then
    alter table registry_items
      add constraint registry_items_item_type_check
      check (item_type in ('product', 'cash_fund'));
  end if;
end $$;