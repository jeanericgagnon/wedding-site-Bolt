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
    coalesce(v_existing.id, gen_random_uuid()),
    p_seating_event_id,
    case
      when p_payload ? 'table_id' then nullif(p_payload->>'table_id', '')::uuid
      else v_existing.table_id
    end,
    p_guest_id,
    case
      when p_payload ? 'seat_index' then nullif(p_payload->>'seat_index', '')::integer
      else v_existing.seat_index
    end,
    coalesce((p_payload->>'is_valid')::boolean, v_existing.is_valid, true),
    case
      when p_payload ? 'checked_in_at' then nullif(p_payload->>'checked_in_at', '')::timestamptz
      else v_existing.checked_in_at
    end,
    case
      when p_payload ? 'checked_in_at' and nullif(p_payload->>'checked_in_at', '') is not null then auth.uid()
      when p_payload ? 'checked_in_at' and nullif(p_payload->>'checked_in_at', '') is null then null
      else v_existing.checked_in_by
    end,
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
