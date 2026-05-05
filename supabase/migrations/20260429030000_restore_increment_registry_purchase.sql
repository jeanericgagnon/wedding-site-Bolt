-- Runtime parity repair for public and owner registry purchase writes.
create or replace function increment_registry_purchase(
  p_item_id uuid,
  p_purchaser_name text default null,
  p_increment_by integer default 1
)
returns registry_items
language plpgsql
security definer
as $$
declare
  v_row registry_items;
  v_new_qty integer;
begin
  select *
    into v_row
    from registry_items
   where id = p_item_id
   for update;

  if not found then
    raise exception 'Registry item not found: %', p_item_id;
  end if;

  if not exists (
    select 1
      from wedding_sites
     where id = v_row.wedding_site_id
       and is_published = true
  ) then
    raise exception 'Item is not on a published site';
  end if;

  v_new_qty := least(
    coalesce(v_row.quantity_purchased, 0) + greatest(p_increment_by, 0),
    coalesce(v_row.quantity_needed, 1)
  );

  update registry_items
     set quantity_purchased = v_new_qty,
         purchaser_name = coalesce(nullif(trim(p_purchaser_name), ''), purchaser_name),
         purchase_status = case
           when v_new_qty >= coalesce(quantity_needed, 1) then 'purchased'
           when v_new_qty > 0 then 'partial'
           else 'available'
         end,
         updated_at = now()
   where id = p_item_id
   returning * into v_row;

  return v_row;
end;
$$;

grant execute on function increment_registry_purchase(uuid, text, integer) to anon;
grant execute on function increment_registry_purchase(uuid, text, integer) to authenticated;

