create or replace function public.registry_refresh_policy_write(
  p_wedding_site_id uuid,
  p_patch jsonb default '{}'::jsonb
)
returns public.wedding_sites
language plpgsql
security definer
set search_path = public
as $$
declare
  v_site public.wedding_sites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  if not public.dayof_has_site_permission(p_wedding_site_id, 'registry') then
    raise exception 'insufficient registry permission' using errcode = '42501';
  end if;

  update public.wedding_sites
  set
    registry_monthly_refresh_cap = case when p_patch ? 'registry_monthly_refresh_cap' then (p_patch->>'registry_monthly_refresh_cap')::integer else registry_monthly_refresh_cap end,
    registry_refresh_enabled_until = case when p_patch ? 'registry_refresh_enabled_until' then nullif(p_patch->>'registry_refresh_enabled_until', '')::timestamptz else registry_refresh_enabled_until end,
    registry_auto_refresh_enabled = case when p_patch ? 'registry_auto_refresh_enabled' then (p_patch->>'registry_auto_refresh_enabled')::boolean else registry_auto_refresh_enabled end,
    registry_refresh_include_purchased = case when p_patch ? 'registry_refresh_include_purchased' then (p_patch->>'registry_refresh_include_purchased')::boolean else registry_refresh_include_purchased end,
    registry_monthly_refresh_count = case when p_patch ? 'registry_monthly_refresh_count' then (p_patch->>'registry_monthly_refresh_count')::integer else registry_monthly_refresh_count end,
    registry_monthly_refresh_month = case when p_patch ? 'registry_monthly_refresh_month' then nullif(btrim(coalesce(p_patch->>'registry_monthly_refresh_month', '')), '') else registry_monthly_refresh_month end,
    registry_refresh_policy_updated_at = case when p_patch ? 'registry_refresh_policy_updated_at' then nullif(p_patch->>'registry_refresh_policy_updated_at', '')::timestamptz else registry_refresh_policy_updated_at end,
    registry_refresh_policy_updated_by = case when p_patch ? 'registry_refresh_policy_updated_by' then nullif(btrim(coalesce(p_patch->>'registry_refresh_policy_updated_by', '')), '') else registry_refresh_policy_updated_by end
  where id = p_wedding_site_id
  returning * into v_site;

  return v_site;
end;
$$;

grant execute on function public.registry_refresh_policy_write(uuid, jsonb) to authenticated;

create or replace function public.registry_item_write(
  p_wedding_site_id uuid default null,
  p_item_id uuid default null,
  p_payload jsonb default '{}'::jsonb
)
returns public.registry_items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.registry_items%rowtype;
  v_result public.registry_items%rowtype;
  v_site_id uuid;
  v_next_sort integer;
begin
  if auth.uid() is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  if p_item_id is null then
    if p_wedding_site_id is null then
      raise exception 'wedding_site_id required' using errcode = '23502';
    end if;

    if not public.dayof_has_site_permission(p_wedding_site_id, 'registry') then
      raise exception 'insufficient registry permission' using errcode = '42501';
    end if;

    select coalesce(max(sort_order), -1) + 1
    into v_next_sort
    from public.registry_items
    where wedding_site_id = p_wedding_site_id;

    insert into public.registry_items (
      wedding_site_id,
      item_type,
      item_name,
      price_label,
      price_amount,
      store_name,
      merchant,
      item_url,
      canonical_url,
      image_url,
      description,
      notes,
      quantity_needed,
      quantity_purchased,
      purchaser_name,
      purchase_status,
      hide_when_purchased,
      sort_order,
      priority,
      availability,
      metadata_last_checked_at,
      metadata_fetch_status,
      metadata_confidence_score,
      metadata_source_method,
      metadata_retailer,
      previous_price_amount,
      price_last_changed_at,
      next_refresh_at,
      last_auto_refreshed_at,
      refresh_fail_count,
      fund_goal_amount,
      fund_received_amount,
      fund_venmo_url,
      fund_paypal_url,
      fund_zelle_handle,
      fund_custom_url,
      fund_custom_label
    )
    values (
      p_wedding_site_id,
      coalesce(nullif(btrim(coalesce(p_payload->>'item_type', '')), ''), 'gift'),
      coalesce(nullif(btrim(coalesce(p_payload->>'item_name', '')), ''), 'Untitled gift'),
      nullif(btrim(coalesce(p_payload->>'price_label', '')), ''),
      nullif(p_payload->>'price_amount', '')::numeric,
      nullif(btrim(coalesce(p_payload->>'store_name', '')), ''),
      nullif(btrim(coalesce(p_payload->>'merchant', '')), ''),
      nullif(btrim(coalesce(p_payload->>'item_url', '')), ''),
      nullif(btrim(coalesce(p_payload->>'canonical_url', '')), ''),
      nullif(btrim(coalesce(p_payload->>'image_url', '')), ''),
      nullif(btrim(coalesce(p_payload->>'description', '')), ''),
      nullif(btrim(coalesce(p_payload->>'notes', '')), ''),
      coalesce(nullif(p_payload->>'quantity_needed', '')::integer, 1),
      coalesce(nullif(p_payload->>'quantity_purchased', '')::integer, 0),
      nullif(btrim(coalesce(p_payload->>'purchaser_name', '')), ''),
      coalesce(nullif(btrim(coalesce(p_payload->>'purchase_status', '')), ''), 'available'),
      coalesce((p_payload->>'hide_when_purchased')::boolean, false),
      coalesce(nullif(p_payload->>'sort_order', '')::integer, v_next_sort),
      coalesce(nullif(btrim(coalesce(p_payload->>'priority', '')), ''), 'medium'),
      nullif(btrim(coalesce(p_payload->>'availability', '')), ''),
      nullif(p_payload->>'metadata_last_checked_at', '')::timestamptz,
      nullif(btrim(coalesce(p_payload->>'metadata_fetch_status', '')), ''),
      nullif(p_payload->>'metadata_confidence_score', '')::numeric,
      nullif(btrim(coalesce(p_payload->>'metadata_source_method', '')), ''),
      nullif(btrim(coalesce(p_payload->>'metadata_retailer', '')), ''),
      nullif(p_payload->>'previous_price_amount', '')::numeric,
      nullif(p_payload->>'price_last_changed_at', '')::timestamptz,
      nullif(p_payload->>'next_refresh_at', '')::timestamptz,
      nullif(p_payload->>'last_auto_refreshed_at', '')::timestamptz,
      coalesce(nullif(p_payload->>'refresh_fail_count', '')::integer, 0),
      nullif(p_payload->>'fund_goal_amount', '')::numeric,
      coalesce(nullif(p_payload->>'fund_received_amount', '')::numeric, 0),
      nullif(btrim(coalesce(p_payload->>'fund_venmo_url', '')), ''),
      nullif(btrim(coalesce(p_payload->>'fund_paypal_url', '')), ''),
      nullif(btrim(coalesce(p_payload->>'fund_zelle_handle', '')), ''),
      nullif(btrim(coalesce(p_payload->>'fund_custom_url', '')), ''),
      nullif(btrim(coalesce(p_payload->>'fund_custom_label', '')), '')
    )
    returning * into v_result;

    return v_result;
  end if;

  select *
  into v_existing
  from public.registry_items
  where id = p_item_id;

  if not found then
    raise exception 'registry item not found' using errcode = 'P0002';
  end if;

  v_site_id := v_existing.wedding_site_id;

  if not public.dayof_has_site_permission(v_site_id, 'registry') then
    raise exception 'insufficient registry permission' using errcode = '42501';
  end if;

  update public.registry_items
  set
    item_type = case when p_payload ? 'item_type' then coalesce(nullif(btrim(coalesce(p_payload->>'item_type', '')), ''), v_existing.item_type) else v_existing.item_type end,
    item_name = case when p_payload ? 'item_name' then coalesce(nullif(btrim(coalesce(p_payload->>'item_name', '')), ''), v_existing.item_name) else v_existing.item_name end,
    price_label = case when p_payload ? 'price_label' then nullif(btrim(coalesce(p_payload->>'price_label', '')), '') else v_existing.price_label end,
    price_amount = case when p_payload ? 'price_amount' then nullif(p_payload->>'price_amount', '')::numeric else v_existing.price_amount end,
    store_name = case when p_payload ? 'store_name' then nullif(btrim(coalesce(p_payload->>'store_name', '')), '') else v_existing.store_name end,
    merchant = case when p_payload ? 'merchant' then nullif(btrim(coalesce(p_payload->>'merchant', '')), '') else v_existing.merchant end,
    item_url = case when p_payload ? 'item_url' then nullif(btrim(coalesce(p_payload->>'item_url', '')), '') else v_existing.item_url end,
    canonical_url = case when p_payload ? 'canonical_url' then nullif(btrim(coalesce(p_payload->>'canonical_url', '')), '') else v_existing.canonical_url end,
    image_url = case when p_payload ? 'image_url' then nullif(btrim(coalesce(p_payload->>'image_url', '')), '') else v_existing.image_url end,
    description = case when p_payload ? 'description' then nullif(btrim(coalesce(p_payload->>'description', '')), '') else v_existing.description end,
    notes = case when p_payload ? 'notes' then nullif(btrim(coalesce(p_payload->>'notes', '')), '') else v_existing.notes end,
    quantity_needed = case when p_payload ? 'quantity_needed' then nullif(p_payload->>'quantity_needed', '')::integer else v_existing.quantity_needed end,
    quantity_purchased = case when p_payload ? 'quantity_purchased' then nullif(p_payload->>'quantity_purchased', '')::integer else v_existing.quantity_purchased end,
    purchaser_name = case when p_payload ? 'purchaser_name' then nullif(btrim(coalesce(p_payload->>'purchaser_name', '')), '') else v_existing.purchaser_name end,
    purchase_status = case when p_payload ? 'purchase_status' then coalesce(nullif(btrim(coalesce(p_payload->>'purchase_status', '')), ''), v_existing.purchase_status) else v_existing.purchase_status end,
    hide_when_purchased = case when p_payload ? 'hide_when_purchased' then coalesce((p_payload->>'hide_when_purchased')::boolean, v_existing.hide_when_purchased) else v_existing.hide_when_purchased end,
    sort_order = case when p_payload ? 'sort_order' then coalesce(nullif(p_payload->>'sort_order', '')::integer, v_existing.sort_order) else v_existing.sort_order end,
    priority = case when p_payload ? 'priority' then nullif(btrim(coalesce(p_payload->>'priority', '')), '') else v_existing.priority end,
    availability = case when p_payload ? 'availability' then nullif(btrim(coalesce(p_payload->>'availability', '')), '') else v_existing.availability end,
    metadata_last_checked_at = case when p_payload ? 'metadata_last_checked_at' then nullif(p_payload->>'metadata_last_checked_at', '')::timestamptz else v_existing.metadata_last_checked_at end,
    metadata_fetch_status = case when p_payload ? 'metadata_fetch_status' then nullif(btrim(coalesce(p_payload->>'metadata_fetch_status', '')), '') else v_existing.metadata_fetch_status end,
    metadata_confidence_score = case when p_payload ? 'metadata_confidence_score' then nullif(p_payload->>'metadata_confidence_score', '')::numeric else v_existing.metadata_confidence_score end,
    metadata_source_method = case when p_payload ? 'metadata_source_method' then nullif(btrim(coalesce(p_payload->>'metadata_source_method', '')), '') else v_existing.metadata_source_method end,
    metadata_retailer = case when p_payload ? 'metadata_retailer' then nullif(btrim(coalesce(p_payload->>'metadata_retailer', '')), '') else v_existing.metadata_retailer end,
    previous_price_amount = case when p_payload ? 'previous_price_amount' then nullif(p_payload->>'previous_price_amount', '')::numeric else v_existing.previous_price_amount end,
    price_last_changed_at = case when p_payload ? 'price_last_changed_at' then nullif(p_payload->>'price_last_changed_at', '')::timestamptz else v_existing.price_last_changed_at end,
    next_refresh_at = case when p_payload ? 'next_refresh_at' then nullif(p_payload->>'next_refresh_at', '')::timestamptz else v_existing.next_refresh_at end,
    last_auto_refreshed_at = case when p_payload ? 'last_auto_refreshed_at' then nullif(p_payload->>'last_auto_refreshed_at', '')::timestamptz else v_existing.last_auto_refreshed_at end,
    refresh_fail_count = case when p_payload ? 'refresh_fail_count' then coalesce(nullif(p_payload->>'refresh_fail_count', '')::integer, v_existing.refresh_fail_count) else v_existing.refresh_fail_count end,
    fund_goal_amount = case when p_payload ? 'fund_goal_amount' then nullif(p_payload->>'fund_goal_amount', '')::numeric else v_existing.fund_goal_amount end,
    fund_received_amount = case when p_payload ? 'fund_received_amount' then coalesce(nullif(p_payload->>'fund_received_amount', '')::numeric, v_existing.fund_received_amount) else v_existing.fund_received_amount end,
    fund_venmo_url = case when p_payload ? 'fund_venmo_url' then nullif(btrim(coalesce(p_payload->>'fund_venmo_url', '')), '') else v_existing.fund_venmo_url end,
    fund_paypal_url = case when p_payload ? 'fund_paypal_url' then nullif(btrim(coalesce(p_payload->>'fund_paypal_url', '')), '') else v_existing.fund_paypal_url end,
    fund_zelle_handle = case when p_payload ? 'fund_zelle_handle' then nullif(btrim(coalesce(p_payload->>'fund_zelle_handle', '')), '') else v_existing.fund_zelle_handle end,
    fund_custom_url = case when p_payload ? 'fund_custom_url' then nullif(btrim(coalesce(p_payload->>'fund_custom_url', '')), '') else v_existing.fund_custom_url end,
    fund_custom_label = case when p_payload ? 'fund_custom_label' then nullif(btrim(coalesce(p_payload->>'fund_custom_label', '')), '') else v_existing.fund_custom_label end,
    updated_at = now()
  where id = p_item_id
  returning * into v_result;

  return v_result;
end;
$$;

grant execute on function public.registry_item_write(uuid, uuid, jsonb) to authenticated;

create or replace function public.registry_item_delete(
  p_item_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_site_id uuid;
begin
  if auth.uid() is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  select wedding_site_id
  into v_site_id
  from public.registry_items
  where id = p_item_id;

  if not found then
    raise exception 'registry item not found' using errcode = 'P0002';
  end if;

  if not public.dayof_has_site_permission(v_site_id, 'registry') then
    raise exception 'insufficient registry permission' using errcode = '42501';
  end if;

  delete from public.registry_items where id = p_item_id;
  return p_item_id;
end;
$$;

grant execute on function public.registry_item_delete(uuid) to authenticated;

create or replace function public.registry_items_reorder(
  p_wedding_site_id uuid,
  p_ordered_ids uuid[]
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  if not public.dayof_has_site_permission(p_wedding_site_id, 'registry') then
    raise exception 'insufficient registry permission' using errcode = '42501';
  end if;

  if coalesce(array_length(p_ordered_ids, 1), 0) = 0 then
    return 0;
  end if;

  if exists (
    select 1
    from public.registry_items
    where id = any(p_ordered_ids)
      and wedding_site_id <> p_wedding_site_id
  ) then
    raise exception 'ordered ids must share one wedding site' using errcode = '42501';
  end if;

  with ordered as (
    select item_id, ordinality - 1 as next_sort_order
    from unnest(p_ordered_ids) with ordinality as ordered_ids(item_id, ordinality)
  )
  update public.registry_items registry_row
  set
    sort_order = ordered.next_sort_order,
    updated_at = now()
  from ordered
  where registry_row.id = ordered.item_id
    and registry_row.wedding_site_id = p_wedding_site_id;

  get diagnostics v_count = row_count;
  return coalesce(v_count, 0);
end;
$$;

grant execute on function public.registry_items_reorder(uuid, uuid[]) to authenticated;
