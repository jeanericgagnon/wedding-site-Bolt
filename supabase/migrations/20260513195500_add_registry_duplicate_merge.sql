create or replace function public.registry_duplicate_merge(
  p_primary_item_id uuid,
  p_secondary_item_ids uuid[],
  p_payload jsonb default '{}'::jsonb
)
returns public.registry_items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_primary public.registry_items%rowtype;
  v_result public.registry_items%rowtype;
  v_secondary_count integer;
  v_expected_count integer;
begin
  if auth.uid() is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  if p_primary_item_id is null then
    raise exception 'primary item required' using errcode = '23502';
  end if;

  if coalesce(array_length(p_secondary_item_ids, 1), 0) = 0 then
    raise exception 'secondary items required' using errcode = '23502';
  end if;

  select *
  into v_primary
  from public.registry_items
  where id = p_primary_item_id;

  if not found then
    raise exception 'primary registry item not found' using errcode = 'P0002';
  end if;

  if not public.dayof_has_site_permission(v_primary.wedding_site_id, 'registry') then
    raise exception 'insufficient registry permission' using errcode = '42501';
  end if;

  if p_primary_item_id = any(p_secondary_item_ids) then
    raise exception 'primary item cannot also be secondary' using errcode = '22023';
  end if;

  select cardinality(array(select distinct unnest(p_secondary_item_ids)))
  into v_expected_count;

  select count(*)
  into v_secondary_count
  from public.registry_items
  where id = any(p_secondary_item_ids)
    and wedding_site_id = v_primary.wedding_site_id;

  if coalesce(v_secondary_count, 0) <> coalesce(v_expected_count, 0) then
    raise exception 'secondary items must belong to the same site' using errcode = '22023';
  end if;

  select *
  into v_result
  from public.registry_item_write(
    p_wedding_site_id => null,
    p_item_id => p_primary_item_id,
    p_payload => coalesce(p_payload, '{}'::jsonb)
  );

  delete from public.registry_items
  where id = any(p_secondary_item_ids)
    and wedding_site_id = v_primary.wedding_site_id;

  return v_result;
end;
$$;

grant execute on function public.registry_duplicate_merge(uuid, uuid[], jsonb) to authenticated;
