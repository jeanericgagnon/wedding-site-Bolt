create or replace function public.wedding_site_vault_provider_patch(
  p_wedding_site_id uuid,
  p_payload jsonb default '{}'::jsonb
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

  if not public.dayof_has_site_permission(p_wedding_site_id, 'photos') then
    raise exception 'insufficient photos permission' using errcode = '42501';
  end if;

  update public.wedding_sites
  set
    vault_storage_provider = case
      when p_payload ? 'vault_storage_provider' then coalesce(nullif(btrim(coalesce(p_payload->>'vault_storage_provider', '')), ''), vault_storage_provider)
      else vault_storage_provider
    end
  where id = p_wedding_site_id
  returning * into v_site;

  if not found then
    raise exception 'wedding site not found' using errcode = 'P0002';
  end if;

  return v_site;
end;
$$;

grant execute on function public.wedding_site_vault_provider_patch(uuid, jsonb) to authenticated;

create or replace function public.vault_config_write(
  p_wedding_site_id uuid default null,
  p_config_id uuid default null,
  p_payload jsonb default '{}'::jsonb
)
returns public.vault_configs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.vault_configs%rowtype;
  v_result public.vault_configs%rowtype;
  v_site_id uuid;
begin
  if auth.uid() is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  if p_config_id is null then
    if p_wedding_site_id is null then
      raise exception 'wedding_site_id required' using errcode = '23502';
    end if;

    if not public.dayof_has_site_permission(p_wedding_site_id, 'photos') then
      raise exception 'insufficient photos permission' using errcode = '42501';
    end if;

    insert into public.vault_configs (
      wedding_site_id,
      vault_index,
      label,
      duration_years,
      is_enabled
    )
    values (
      p_wedding_site_id,
      coalesce(nullif(p_payload->>'vault_index', '')::integer, 1),
      coalesce(nullif(btrim(coalesce(p_payload->>'label', '')), ''), ''),
      coalesce(nullif(p_payload->>'duration_years', '')::integer, 1),
      coalesce((p_payload->>'is_enabled')::boolean, true)
    )
    returning * into v_result;

    return v_result;
  end if;

  select *
  into v_existing
  from public.vault_configs
  where id = p_config_id;

  if not found then
    raise exception 'vault config not found' using errcode = 'P0002';
  end if;

  v_site_id := v_existing.wedding_site_id;

  if not public.dayof_has_site_permission(v_site_id, 'photos') then
    raise exception 'insufficient photos permission' using errcode = '42501';
  end if;

  update public.vault_configs
  set
    vault_index = case when p_payload ? 'vault_index' then coalesce(nullif(p_payload->>'vault_index', '')::integer, v_existing.vault_index) else v_existing.vault_index end,
    label = case when p_payload ? 'label' then coalesce(nullif(btrim(coalesce(p_payload->>'label', '')), ''), v_existing.label) else v_existing.label end,
    duration_years = case when p_payload ? 'duration_years' then coalesce(nullif(p_payload->>'duration_years', '')::integer, v_existing.duration_years) else v_existing.duration_years end,
    is_enabled = case when p_payload ? 'is_enabled' then coalesce((p_payload->>'is_enabled')::boolean, v_existing.is_enabled) else v_existing.is_enabled end,
    updated_at = now()
  where id = p_config_id
  returning * into v_result;

  return v_result;
end;
$$;

grant execute on function public.vault_config_write(uuid, uuid, jsonb) to authenticated;

create or replace function public.vault_seed_starter_configs(
  p_wedding_site_id uuid
)
returns setof public.vault_configs
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  if not public.dayof_has_site_permission(p_wedding_site_id, 'photos') then
    raise exception 'insufficient photos permission' using errcode = '42501';
  end if;

  insert into public.vault_configs (wedding_site_id, vault_index, label, duration_years, is_enabled)
  values
    (p_wedding_site_id, 1, '1-Year Anniversary Vault', 1, true),
    (p_wedding_site_id, 2, '5-Year Anniversary Vault', 5, true),
    (p_wedding_site_id, 3, '10-Year Anniversary Vault', 10, true)
  on conflict (wedding_site_id, vault_index)
  do update set
    label = excluded.label,
    duration_years = excluded.duration_years,
    is_enabled = excluded.is_enabled,
    updated_at = now();

  return query
  select *
  from public.vault_configs
  where wedding_site_id = p_wedding_site_id
  order by duration_years asc;
end;
$$;

grant execute on function public.vault_seed_starter_configs(uuid) to authenticated;

create or replace function public.vault_config_delete(
  p_config_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.vault_configs%rowtype;
begin
  if auth.uid() is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  select *
  into v_existing
  from public.vault_configs
  where id = p_config_id;

  if not found then
    raise exception 'vault config not found' using errcode = 'P0002';
  end if;

  if not public.dayof_has_site_permission(v_existing.wedding_site_id, 'photos') then
    raise exception 'insufficient photos permission' using errcode = '42501';
  end if;

  delete from public.vault_entries where vault_config_id = p_config_id;
  delete from public.vault_configs where id = p_config_id;

  return p_config_id;
end;
$$;

grant execute on function public.vault_config_delete(uuid) to authenticated;

create or replace function public.vault_entry_write(
  p_wedding_site_id uuid default null,
  p_entry_id uuid default null,
  p_payload jsonb default '{}'::jsonb
)
returns public.vault_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.vault_entries%rowtype;
  v_result public.vault_entries%rowtype;
  v_site_id uuid;
begin
  if auth.uid() is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  if p_entry_id is null then
    if p_wedding_site_id is null then
      raise exception 'wedding_site_id required' using errcode = '23502';
    end if;

    if not public.dayof_has_site_permission(p_wedding_site_id, 'photos') then
      raise exception 'insufficient photos permission' using errcode = '42501';
    end if;

    insert into public.vault_entries (
      wedding_site_id,
      vault_config_id,
      vault_year,
      title,
      content,
      author_name,
      attachment_url,
      attachment_name
    )
    values (
      p_wedding_site_id,
      nullif(p_payload->>'vault_config_id', '')::uuid,
      coalesce(nullif(p_payload->>'vault_year', '')::integer, 1),
      coalesce(nullif(btrim(coalesce(p_payload->>'title', '')), ''), ''),
      coalesce(nullif(btrim(coalesce(p_payload->>'content', '')), ''), ''),
      coalesce(nullif(btrim(coalesce(p_payload->>'author_name', '')), ''), 'You'),
      nullif(btrim(coalesce(p_payload->>'attachment_url', '')), ''),
      nullif(btrim(coalesce(p_payload->>'attachment_name', '')), '')
    )
    returning * into v_result;

    return v_result;
  end if;

  select *
  into v_existing
  from public.vault_entries
  where id = p_entry_id;

  if not found then
    raise exception 'vault entry not found' using errcode = 'P0002';
  end if;

  v_site_id := v_existing.wedding_site_id;

  if not public.dayof_has_site_permission(v_site_id, 'photos') then
    raise exception 'insufficient photos permission' using errcode = '42501';
  end if;

  update public.vault_entries
  set
    title = case when p_payload ? 'title' then coalesce(nullif(btrim(coalesce(p_payload->>'title', '')), ''), v_existing.title) else v_existing.title end,
    content = case when p_payload ? 'content' then coalesce(nullif(btrim(coalesce(p_payload->>'content', '')), ''), v_existing.content) else v_existing.content end,
    author_name = case when p_payload ? 'author_name' then coalesce(nullif(btrim(coalesce(p_payload->>'author_name', '')), ''), v_existing.author_name) else v_existing.author_name end,
    attachment_url = case when p_payload ? 'attachment_url' then nullif(btrim(coalesce(p_payload->>'attachment_url', '')), '') else v_existing.attachment_url end,
    attachment_name = case when p_payload ? 'attachment_name' then nullif(btrim(coalesce(p_payload->>'attachment_name', '')), '') else v_existing.attachment_name end
  where id = p_entry_id
  returning * into v_result;

  return v_result;
end;
$$;

grant execute on function public.vault_entry_write(uuid, uuid, jsonb) to authenticated;

create or replace function public.vault_entry_delete(
  p_entry_id uuid
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
  from public.vault_entries
  where id = p_entry_id;

  if not found then
    raise exception 'vault entry not found' using errcode = 'P0002';
  end if;

  if not public.dayof_has_site_permission(v_site_id, 'photos') then
    raise exception 'insufficient photos permission' using errcode = '42501';
  end if;

  delete from public.vault_entries where id = p_entry_id;
  return p_entry_id;
end;
$$;

grant execute on function public.vault_entry_delete(uuid) to authenticated;

create or replace function public.planning_vendor_write(
  p_wedding_site_id uuid default null,
  p_vendor_id uuid default null,
  p_payload jsonb default '{}'::jsonb
)
returns public.planning_vendors
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.planning_vendors%rowtype;
  v_result public.planning_vendors%rowtype;
  v_site_id uuid;
begin
  if auth.uid() is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  if p_vendor_id is null then
    if p_wedding_site_id is null then
      raise exception 'wedding_site_id required' using errcode = '23502';
    end if;

    if not public.dayof_has_site_permission(p_wedding_site_id, 'planning') then
      raise exception 'insufficient planning permission' using errcode = '42501';
    end if;

    insert into public.planning_vendors (
      wedding_site_id,
      vendor_type,
      name,
      contact_name,
      email,
      phone,
      website,
      contract_total,
      amount_paid,
      balance_due,
      next_payment_due,
      document_url,
      document_label,
      notes,
      internal_rating,
      rating_status,
      rating_notes
    )
    values (
      p_wedding_site_id,
      coalesce(nullif(btrim(coalesce(p_payload->>'vendor_type', '')), ''), ''),
      coalesce(nullif(btrim(coalesce(p_payload->>'name', '')), ''), ''),
      coalesce(nullif(btrim(coalesce(p_payload->>'contact_name', '')), ''), ''),
      coalesce(nullif(btrim(coalesce(p_payload->>'email', '')), ''), ''),
      coalesce(nullif(btrim(coalesce(p_payload->>'phone', '')), ''), ''),
      coalesce(nullif(btrim(coalesce(p_payload->>'website', '')), ''), ''),
      coalesce(nullif(p_payload->>'contract_total', '')::numeric, 0),
      coalesce(nullif(p_payload->>'amount_paid', '')::numeric, 0),
      coalesce(nullif(p_payload->>'balance_due', '')::numeric, 0),
      nullif(p_payload->>'next_payment_due', '')::date,
      nullif(btrim(coalesce(p_payload->>'document_url', '')), ''),
      nullif(btrim(coalesce(p_payload->>'document_label', '')), ''),
      coalesce(nullif(btrim(coalesce(p_payload->>'notes', '')), ''), ''),
      nullif(p_payload->>'internal_rating', '')::integer,
      nullif(btrim(coalesce(p_payload->>'rating_status', '')), ''),
      nullif(btrim(coalesce(p_payload->>'rating_notes', '')), '')
    )
    returning * into v_result;

    return v_result;
  end if;

  select *
  into v_existing
  from public.planning_vendors
  where id = p_vendor_id;

  if not found then
    raise exception 'planning vendor not found' using errcode = 'P0002';
  end if;

  v_site_id := v_existing.wedding_site_id;

  if not public.dayof_has_site_permission(v_site_id, 'planning') then
    raise exception 'insufficient planning permission' using errcode = '42501';
  end if;

  update public.planning_vendors
  set
    vendor_type = case when p_payload ? 'vendor_type' then coalesce(nullif(btrim(coalesce(p_payload->>'vendor_type', '')), ''), v_existing.vendor_type) else v_existing.vendor_type end,
    name = case when p_payload ? 'name' then coalesce(nullif(btrim(coalesce(p_payload->>'name', '')), ''), v_existing.name) else v_existing.name end,
    contact_name = case when p_payload ? 'contact_name' then coalesce(nullif(btrim(coalesce(p_payload->>'contact_name', '')), ''), v_existing.contact_name) else v_existing.contact_name end,
    email = case when p_payload ? 'email' then coalesce(nullif(btrim(coalesce(p_payload->>'email', '')), ''), v_existing.email) else v_existing.email end,
    phone = case when p_payload ? 'phone' then coalesce(nullif(btrim(coalesce(p_payload->>'phone', '')), ''), v_existing.phone) else v_existing.phone end,
    website = case when p_payload ? 'website' then coalesce(nullif(btrim(coalesce(p_payload->>'website', '')), ''), v_existing.website) else v_existing.website end,
    contract_total = case when p_payload ? 'contract_total' then coalesce(nullif(p_payload->>'contract_total', '')::numeric, v_existing.contract_total) else v_existing.contract_total end,
    amount_paid = case when p_payload ? 'amount_paid' then coalesce(nullif(p_payload->>'amount_paid', '')::numeric, v_existing.amount_paid) else v_existing.amount_paid end,
    balance_due = case when p_payload ? 'balance_due' then coalesce(nullif(p_payload->>'balance_due', '')::numeric, v_existing.balance_due) else v_existing.balance_due end,
    next_payment_due = case when p_payload ? 'next_payment_due' then nullif(p_payload->>'next_payment_due', '')::date else v_existing.next_payment_due end,
    document_url = case when p_payload ? 'document_url' then nullif(btrim(coalesce(p_payload->>'document_url', '')), '') else v_existing.document_url end,
    document_label = case when p_payload ? 'document_label' then nullif(btrim(coalesce(p_payload->>'document_label', '')), '') else v_existing.document_label end,
    notes = case when p_payload ? 'notes' then coalesce(nullif(btrim(coalesce(p_payload->>'notes', '')), ''), v_existing.notes) else v_existing.notes end,
    internal_rating = case when p_payload ? 'internal_rating' then nullif(p_payload->>'internal_rating', '')::integer else v_existing.internal_rating end,
    rating_status = case when p_payload ? 'rating_status' then nullif(btrim(coalesce(p_payload->>'rating_status', '')), '') else v_existing.rating_status end,
    rating_notes = case when p_payload ? 'rating_notes' then nullif(btrim(coalesce(p_payload->>'rating_notes', '')), '') else v_existing.rating_notes end,
    updated_at = now()
  where id = p_vendor_id
  returning * into v_result;

  return v_result;
end;
$$;

grant execute on function public.planning_vendor_write(uuid, uuid, jsonb) to authenticated;

create or replace function public.planning_vendor_delete(
  p_vendor_id uuid
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
  from public.planning_vendors
  where id = p_vendor_id;

  if not found then
    raise exception 'planning vendor not found' using errcode = 'P0002';
  end if;

  if not public.dayof_has_site_permission(v_site_id, 'planning') then
    raise exception 'insufficient planning permission' using errcode = '42501';
  end if;

  delete from public.planning_vendors where id = p_vendor_id;
  return p_vendor_id;
end;
$$;

grant execute on function public.planning_vendor_delete(uuid) to authenticated;

create or replace function public.planning_budget_item_write(
  p_wedding_site_id uuid default null,
  p_item_id uuid default null,
  p_payload jsonb default '{}'::jsonb
)
returns public.planning_budget_items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.planning_budget_items%rowtype;
  v_result public.planning_budget_items%rowtype;
  v_site_id uuid;
begin
  if auth.uid() is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  if p_item_id is null then
    if p_wedding_site_id is null then
      raise exception 'wedding_site_id required' using errcode = '23502';
    end if;

    if not public.dayof_has_site_permission(p_wedding_site_id, 'planning') then
      raise exception 'insufficient planning permission' using errcode = '42501';
    end if;

    insert into public.planning_budget_items (
      wedding_site_id,
      category,
      item_name,
      estimated_amount,
      actual_amount,
      paid_amount,
      due_date,
      vendor_id,
      notes
    )
    values (
      p_wedding_site_id,
      coalesce(nullif(btrim(coalesce(p_payload->>'category', '')), ''), ''),
      coalesce(nullif(btrim(coalesce(p_payload->>'item_name', '')), ''), ''),
      coalesce(nullif(p_payload->>'estimated_amount', '')::numeric, 0),
      coalesce(nullif(p_payload->>'actual_amount', '')::numeric, 0),
      coalesce(nullif(p_payload->>'paid_amount', '')::numeric, 0),
      nullif(p_payload->>'due_date', '')::date,
      nullif(p_payload->>'vendor_id', '')::uuid,
      coalesce(nullif(btrim(coalesce(p_payload->>'notes', '')), ''), '')
    )
    returning * into v_result;

    return v_result;
  end if;

  select *
  into v_existing
  from public.planning_budget_items
  where id = p_item_id;

  if not found then
    raise exception 'planning budget item not found' using errcode = 'P0002';
  end if;

  v_site_id := v_existing.wedding_site_id;

  if not public.dayof_has_site_permission(v_site_id, 'planning') then
    raise exception 'insufficient planning permission' using errcode = '42501';
  end if;

  update public.planning_budget_items
  set
    category = case when p_payload ? 'category' then coalesce(nullif(btrim(coalesce(p_payload->>'category', '')), ''), v_existing.category) else v_existing.category end,
    item_name = case when p_payload ? 'item_name' then coalesce(nullif(btrim(coalesce(p_payload->>'item_name', '')), ''), v_existing.item_name) else v_existing.item_name end,
    estimated_amount = case when p_payload ? 'estimated_amount' then coalesce(nullif(p_payload->>'estimated_amount', '')::numeric, v_existing.estimated_amount) else v_existing.estimated_amount end,
    actual_amount = case when p_payload ? 'actual_amount' then coalesce(nullif(p_payload->>'actual_amount', '')::numeric, v_existing.actual_amount) else v_existing.actual_amount end,
    paid_amount = case when p_payload ? 'paid_amount' then coalesce(nullif(p_payload->>'paid_amount', '')::numeric, v_existing.paid_amount) else v_existing.paid_amount end,
    due_date = case when p_payload ? 'due_date' then nullif(p_payload->>'due_date', '')::date else v_existing.due_date end,
    vendor_id = case when p_payload ? 'vendor_id' then nullif(p_payload->>'vendor_id', '')::uuid else v_existing.vendor_id end,
    notes = case when p_payload ? 'notes' then coalesce(nullif(btrim(coalesce(p_payload->>'notes', '')), ''), v_existing.notes) else v_existing.notes end,
    updated_at = now()
  where id = p_item_id
  returning * into v_result;

  return v_result;
end;
$$;

grant execute on function public.planning_budget_item_write(uuid, uuid, jsonb) to authenticated;

create or replace function public.planning_budget_item_delete(
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
  from public.planning_budget_items
  where id = p_item_id;

  if not found then
    raise exception 'planning budget item not found' using errcode = 'P0002';
  end if;

  if not public.dayof_has_site_permission(v_site_id, 'planning') then
    raise exception 'insufficient planning permission' using errcode = '42501';
  end if;

  delete from public.planning_budget_items where id = p_item_id;
  return p_item_id;
end;
$$;

grant execute on function public.planning_budget_item_delete(uuid) to authenticated;
