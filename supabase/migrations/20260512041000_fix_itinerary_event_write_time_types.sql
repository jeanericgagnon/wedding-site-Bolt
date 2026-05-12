create or replace function public.itinerary_event_write(
  p_wedding_site_id uuid default null,
  p_event_id uuid default null,
  p_payload jsonb default '{}'::jsonb
)
returns public.itinerary_events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.itinerary_events%rowtype;
  v_result public.itinerary_events%rowtype;
  v_site_id uuid;
begin
  if auth.uid() is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  if p_event_id is null then
    v_site_id := p_wedding_site_id;
  else
    select * into v_existing from public.itinerary_events where id = p_event_id;
    if not found then
      raise exception 'itinerary event not found' using errcode = 'P0002';
    end if;
    v_site_id := v_existing.wedding_site_id;
  end if;

  if v_site_id is null then
    raise exception 'wedding_site_id required' using errcode = '23502';
  end if;

  if not (
    public.dayof_has_site_permission(v_site_id, 'planning')
    or public.dayof_has_site_role(v_site_id, ARRAY['owner','planner','coordinator'])
  ) then
    raise exception 'insufficient itinerary permission' using errcode = '42501';
  end if;

  insert into public.itinerary_events (
    id,
    wedding_site_id,
    event_name,
    title,
    description,
    event_date,
    start_time,
    end_time,
    location_name,
    location_address,
    dress_code,
    notes,
    display_order,
    is_visible
  )
  values (
    coalesce(p_event_id, nullif(p_payload->>'id', '')::uuid, gen_random_uuid()),
    v_site_id,
    coalesce(nullif(p_payload->>'event_name', ''), v_existing.event_name),
    coalesce(nullif(p_payload->>'title', ''), nullif(p_payload->>'event_name', ''), v_existing.title, v_existing.event_name),
    coalesce(p_payload->>'description', v_existing.description, ''),
    coalesce(nullif(p_payload->>'event_date', '')::date, v_existing.event_date),
    case
      when p_payload ? 'start_time' then nullif(p_payload->>'start_time', '')::time
      else v_existing.start_time
    end,
    case
      when p_payload ? 'end_time' then nullif(p_payload->>'end_time', '')::time
      else v_existing.end_time
    end,
    coalesce(p_payload->>'location_name', v_existing.location_name, ''),
    nullif(coalesce(p_payload->>'location_address', v_existing.location_address), ''),
    nullif(coalesce(p_payload->>'dress_code', v_existing.dress_code), ''),
    nullif(coalesce(p_payload->>'notes', v_existing.notes), ''),
    coalesce(nullif(p_payload->>'display_order', '')::integer, v_existing.display_order, 0),
    coalesce((p_payload->>'is_visible')::boolean, v_existing.is_visible, true)
  )
  on conflict (id)
  do update set
    event_name = excluded.event_name,
    title = excluded.title,
    description = excluded.description,
    event_date = excluded.event_date,
    start_time = excluded.start_time,
    end_time = excluded.end_time,
    location_name = excluded.location_name,
    location_address = excluded.location_address,
    dress_code = excluded.dress_code,
    notes = excluded.notes,
    display_order = excluded.display_order,
    is_visible = excluded.is_visible,
    updated_at = now()
  returning * into v_result;

  return v_result;
end;
$$;

grant execute on function public.itinerary_event_write(uuid, uuid, jsonb) to authenticated;
