alter table public.registry_items
  add column if not exists source_type text not null default 'manual',
  add column if not exists barcode text,
  add column if not exists selected_retailer text,
  add column if not exists selected_product_url text,
  add column if not exists estimated_price_cents integer,
  add column if not exists product_metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'registry_items_source_type_check'
  ) then
    alter table public.registry_items
      add constraint registry_items_source_type_check
      check (source_type in ('barcode', 'link', 'manual', 'cash_fund'));
  end if;
end
$$;

create table if not exists public.registry_product_cache (
  barcode text primary key,
  normalized_gtin text not null,
  title text,
  brand text,
  image_url text,
  category text,
  description text,
  price_cents integer,
  currency text,
  product_url text,
  selected_retailer text,
  provider text,
  confidence_score integer not null default 0,
  raw_payload jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  lookup_count integer not null default 1
);

create index if not exists registry_product_cache_normalized_gtin_idx
  on public.registry_product_cache(normalized_gtin);

create table if not exists public.registry_barcode_misses (
  barcode text primary key,
  attempts integer not null default 1,
  last_attempt_at timestamptz not null default now(),
  last_provider text,
  last_error text
);

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
      source_type,
      barcode,
      item_url,
      canonical_url,
      image_url,
      selected_retailer,
      selected_product_url,
      estimated_price_cents,
      product_metadata,
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
      coalesce(nullif(btrim(coalesce(p_payload->>'item_type', '')), ''), 'product'),
      coalesce(nullif(btrim(coalesce(p_payload->>'item_name', '')), ''), 'Untitled gift'),
      nullif(btrim(coalesce(p_payload->>'price_label', '')), ''),
      nullif(p_payload->>'price_amount', '')::numeric,
      nullif(btrim(coalesce(p_payload->>'store_name', '')), ''),
      nullif(btrim(coalesce(p_payload->>'merchant', '')), ''),
      coalesce(nullif(btrim(coalesce(p_payload->>'source_type', '')), ''), case when coalesce(nullif(btrim(coalesce(p_payload->>'item_type', '')), ''), 'product') = 'cash_fund' then 'cash_fund' else 'manual' end),
      nullif(btrim(coalesce(p_payload->>'barcode', '')), ''),
      nullif(btrim(coalesce(p_payload->>'item_url', '')), ''),
      nullif(btrim(coalesce(p_payload->>'canonical_url', '')), ''),
      nullif(btrim(coalesce(p_payload->>'image_url', '')), ''),
      nullif(btrim(coalesce(p_payload->>'selected_retailer', '')), ''),
      nullif(btrim(coalesce(p_payload->>'selected_product_url', '')), ''),
      nullif(p_payload->>'estimated_price_cents', '')::integer,
      coalesce(p_payload->'product_metadata', '{}'::jsonb),
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
    source_type = case when p_payload ? 'source_type' then coalesce(nullif(btrim(coalesce(p_payload->>'source_type', '')), ''), v_existing.source_type) else v_existing.source_type end,
    barcode = case when p_payload ? 'barcode' then nullif(btrim(coalesce(p_payload->>'barcode', '')), '') else v_existing.barcode end,
    item_url = case when p_payload ? 'item_url' then nullif(btrim(coalesce(p_payload->>'item_url', '')), '') else v_existing.item_url end,
    canonical_url = case when p_payload ? 'canonical_url' then nullif(btrim(coalesce(p_payload->>'canonical_url', '')), '') else v_existing.canonical_url end,
    image_url = case when p_payload ? 'image_url' then nullif(btrim(coalesce(p_payload->>'image_url', '')), '') else v_existing.image_url end,
    selected_retailer = case when p_payload ? 'selected_retailer' then nullif(btrim(coalesce(p_payload->>'selected_retailer', '')), '') else v_existing.selected_retailer end,
    selected_product_url = case when p_payload ? 'selected_product_url' then nullif(btrim(coalesce(p_payload->>'selected_product_url', '')), '') else v_existing.selected_product_url end,
    estimated_price_cents = case when p_payload ? 'estimated_price_cents' then nullif(p_payload->>'estimated_price_cents', '')::integer else v_existing.estimated_price_cents end,
    product_metadata = case when p_payload ? 'product_metadata' then coalesce(p_payload->'product_metadata', '{}'::jsonb) else v_existing.product_metadata end,
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
