create or replace function public.coordinator_guest_event_checkin_write(
  p_site_id uuid,
  p_guest_id uuid,
  p_checked_in_at timestamptz default null,
  p_itinerary_event_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result public.guests%rowtype;
  v_seating_event public.seating_events%rowtype;
begin
  if auth.uid() is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  if not public.dayof_has_site_permission(p_site_id, 'coordinator') then
    raise exception 'insufficient coordinator permission' using errcode = '42501';
  end if;

  update public.guests
  set checked_in_at = p_checked_in_at
  where id = p_guest_id
    and wedding_site_id = p_site_id
  returning * into v_result;

  if not found then
    raise exception 'guest not found' using errcode = 'P0002';
  end if;

  if p_itinerary_event_id is not null then
    if not exists (
      select 1
      from public.itinerary_events
      where id = p_itinerary_event_id
        and wedding_site_id = p_site_id
    ) then
      raise exception 'itinerary event not found for site' using errcode = 'P0002';
    end if;

    select *
    into v_seating_event
    from public.seating_events
    where wedding_site_id = p_site_id
      and itinerary_event_id = p_itinerary_event_id
    limit 1;

    if not found then
      insert into public.seating_events (
        wedding_site_id,
        itinerary_event_id
      )
      values (
        p_site_id,
        p_itinerary_event_id
      )
      returning * into v_seating_event;
    end if;

    insert into public.seating_assignments (
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
      v_seating_event.id,
      null,
      p_guest_id,
      null,
      true,
      p_checked_in_at,
      case when p_checked_in_at is not null then auth.uid() else null end,
      now()
    )
    on conflict (seating_event_id, guest_id)
    do update set
      checked_in_at = excluded.checked_in_at,
      checked_in_by = case
        when excluded.checked_in_at is not null then auth.uid()
        else null
      end,
      is_valid = true,
      updated_at = now();
  end if;

  return to_jsonb(v_result);
end;
$$;

grant execute on function public.coordinator_guest_event_checkin_write(uuid, uuid, timestamptz, uuid) to authenticated;
