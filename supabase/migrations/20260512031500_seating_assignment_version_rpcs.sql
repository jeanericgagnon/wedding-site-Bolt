create or replace function public.seating_assignment_write(
  p_seating_event_id uuid,
  p_guest_id uuid,
  p_payload jsonb default '{}'::jsonb
)
returns public.seating_assignments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.seating_events%rowtype;
  v_existing public.seating_assignments%rowtype;
  v_result public.seating_assignments%rowtype;
begin
  if auth.uid() is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  select * into v_event from public.seating_events where id = p_seating_event_id;
  if not found then
    raise exception 'seating event not found' using errcode = 'P0002';
  end if;

  if not public.dayof_has_site_permission(v_event.wedding_site_id, 'seating') then
    raise exception 'insufficient seating permission' using errcode = '42501';
  end if;

  select *
  into v_existing
  from public.seating_assignments
  where seating_event_id = p_seating_event_id
    and guest_id = p_guest_id
  limit 1;

  insert into public.seating_assignments (
    id,
    seating_event_id,
    table_id,
    guest_id,
    seat_index,
    is_valid,
    checked_in_at,
    checked_in_by,
    updated_at
  )
  values (
    v_existing.id,
    p_seating_event_id,
    nullif(p_payload->>'table_id', '')::uuid,
    p_guest_id,
    nullif(p_payload->>'seat_index', '')::integer,
    coalesce((p_payload->>'is_valid')::boolean, true),
    nullif(p_payload->>'checked_in_at', '')::timestamptz,
    case when p_payload ? 'checked_in_at' and nullif(p_payload->>'checked_in_at', '') is not null then auth.uid() else v_existing.checked_in_by end,
    now()
  )
  on conflict (id)
  do update set
    table_id = case when p_payload ? 'table_id' then nullif(p_payload->>'table_id', '')::uuid else public.seating_assignments.table_id end,
    seat_index = case when p_payload ? 'seat_index' then nullif(p_payload->>'seat_index', '')::integer else public.seating_assignments.seat_index end,
    is_valid = case when p_payload ? 'is_valid' then coalesce((p_payload->>'is_valid')::boolean, public.seating_assignments.is_valid) else public.seating_assignments.is_valid end,
    checked_in_at = case when p_payload ? 'checked_in_at' then nullif(p_payload->>'checked_in_at', '')::timestamptz else public.seating_assignments.checked_in_at end,
    checked_in_by = case
      when p_payload ? 'checked_in_at' and nullif(p_payload->>'checked_in_at', '') is not null then auth.uid()
      when p_payload ? 'checked_in_at' and nullif(p_payload->>'checked_in_at', '') is null then null
      else public.seating_assignments.checked_in_by
    end,
    updated_at = now()
  returning * into v_result;

  return v_result;
end;
$$;

grant execute on function public.seating_assignment_write(uuid, uuid, jsonb) to authenticated;

create or replace function public.seating_assignment_delete(
  p_seating_event_id uuid,
  p_guest_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.seating_events%rowtype;
  v_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  select * into v_event from public.seating_events where id = p_seating_event_id;
  if not found then
    raise exception 'seating event not found' using errcode = 'P0002';
  end if;

  if not public.dayof_has_site_permission(v_event.wedding_site_id, 'seating') then
    raise exception 'insufficient seating permission' using errcode = '42501';
  end if;

  delete from public.seating_assignments
  where seating_event_id = p_seating_event_id
    and (p_guest_id is null or guest_id = p_guest_id);

  get diagnostics v_count = row_count;
  return coalesce(v_count, 0);
end;
$$;

grant execute on function public.seating_assignment_delete(uuid, uuid) to authenticated;

create or replace function public.seating_assignment_upsert_many(
  p_rows jsonb default '[]'::jsonb
)
returns setof public.seating_assignments
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

  if coalesce(jsonb_typeof(p_rows), 'null') <> 'array' then
    raise exception 'rows must be a json array' using errcode = '22023';
  end if;

  select min(event_row.wedding_site_id)
  into v_site_id
  from jsonb_to_recordset(p_rows) as row(
    seating_event_id uuid,
    table_id uuid,
    guest_id uuid,
    seat_index integer
  )
  join public.seating_events event_row on event_row.id = row.seating_event_id;

  if v_site_id is null then
    return;
  end if;

  if not public.dayof_has_site_permission(v_site_id, 'seating') then
    raise exception 'insufficient seating permission' using errcode = '42501';
  end if;

  return query
  with upserted as (
    insert into public.seating_assignments (
      seating_event_id,
      table_id,
      guest_id,
      seat_index
    )
    select
      row.seating_event_id,
      row.table_id,
      row.guest_id,
      row.seat_index
    from jsonb_to_recordset(p_rows) as row(
      seating_event_id uuid,
      table_id uuid,
      guest_id uuid,
      seat_index integer
    )
    on conflict (seating_event_id, guest_id)
    do update set
      table_id = excluded.table_id,
      seat_index = excluded.seat_index,
      is_valid = true,
      updated_at = now()
    returning *
  )
  select * from upserted;
end;
$$;

grant execute on function public.seating_assignment_upsert_many(jsonb) to authenticated;

create or replace function public.seating_assignment_invalidate_many(
  p_assignment_ids uuid[] default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_site_id uuid;
  v_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  if coalesce(array_length(p_assignment_ids, 1), 0) = 0 then
    return 0;
  end if;

  select min(event_row.wedding_site_id)
  into v_site_id
  from public.seating_assignments assignment_row
  join public.seating_events event_row on event_row.id = assignment_row.seating_event_id
  where assignment_row.id = any(p_assignment_ids);

  if v_site_id is null then
    return 0;
  end if;

  if not public.dayof_has_site_permission(v_site_id, 'seating') then
    raise exception 'insufficient seating permission' using errcode = '42501';
  end if;

  update public.seating_assignments
  set
    is_valid = false,
    updated_at = now()
  where id = any(p_assignment_ids);

  get diagnostics v_count = row_count;
  return coalesce(v_count, 0);
end;
$$;

grant execute on function public.seating_assignment_invalidate_many(uuid[]) to authenticated;

create or replace function public.seating_layout_version_create(
  p_wedding_site_id uuid,
  p_seating_event_id uuid,
  p_itinerary_event_id uuid default null,
  p_label text default '',
  p_tables jsonb default '[]'::jsonb,
  p_assignments jsonb default '[]'::jsonb
)
returns public.seating_layout_versions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result public.seating_layout_versions%rowtype;
begin
  if auth.uid() is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  if not public.dayof_has_site_permission(p_wedding_site_id, 'seating') then
    raise exception 'insufficient seating permission' using errcode = '42501';
  end if;

  insert into public.seating_layout_versions (
    wedding_site_id,
    seating_event_id,
    itinerary_event_id,
    label,
    tables,
    assignments,
    created_by
  )
  values (
    p_wedding_site_id,
    p_seating_event_id,
    p_itinerary_event_id,
    p_label,
    p_tables,
    p_assignments,
    auth.uid()
  )
  returning * into v_result;

  return v_result;
end;
$$;

grant execute on function public.seating_layout_version_create(uuid, uuid, uuid, text, jsonb, jsonb) to authenticated;

create or replace function public.seating_layout_version_restore(
  p_version_id uuid,
  p_restored_at timestamptz default now()
)
returns public.seating_layout_versions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.seating_layout_versions%rowtype;
  v_result public.seating_layout_versions%rowtype;
begin
  if auth.uid() is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  select * into v_existing from public.seating_layout_versions where id = p_version_id;
  if not found then
    raise exception 'layout version not found' using errcode = 'P0002';
  end if;

  if not public.dayof_has_site_permission(v_existing.wedding_site_id, 'seating') then
    raise exception 'insufficient seating permission' using errcode = '42501';
  end if;

  update public.seating_layout_versions
  set restored_at = p_restored_at
  where id = p_version_id
  returning * into v_result;

  return v_result;
end;
$$;

grant execute on function public.seating_layout_version_restore(uuid, timestamptz) to authenticated;
