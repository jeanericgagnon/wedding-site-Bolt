create or replace function public.wedding_site_bootstrap_write(
  p_user_id uuid,
  p_payload jsonb default '{}'::jsonb
)
returns public.wedding_sites
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result public.wedding_sites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  if auth.uid() <> p_user_id then
    raise exception 'cannot bootstrap another user site' using errcode = '42501';
  end if;

  insert into public.wedding_sites (
    user_id,
    couple_name_1,
    couple_name_2,
    site_slug,
    site_url,
    wedding_date,
    venue_name,
    venue_location,
    venue_address,
    wedding_location,
    onboarding_answers,
    wedding_data
  )
  values (
    p_user_id,
    coalesce(nullif(btrim(coalesce(p_payload->>'couple_name_1', '')), ''), 'You'),
    coalesce(nullif(btrim(coalesce(p_payload->>'couple_name_2', '')), ''), 'Partner'),
    coalesce(nullif(btrim(coalesce(p_payload->>'site_slug', '')), ''), 'ourwedding'),
    coalesce(nullif(btrim(coalesce(p_payload->>'site_url', '')), ''), 'ourwedding.dayof.love'),
    nullif(p_payload->>'wedding_date', '')::date,
    nullif(btrim(coalesce(p_payload->>'venue_name', '')), ''),
    nullif(btrim(coalesce(p_payload->>'venue_location', '')), ''),
    nullif(btrim(coalesce(p_payload->>'venue_address', '')), ''),
    nullif(btrim(coalesce(p_payload->>'wedding_location', '')), ''),
    case when p_payload ? 'onboarding_answers' then p_payload->'onboarding_answers' else '{}'::jsonb end,
    case when p_payload ? 'wedding_data' then p_payload->'wedding_data' else '{}'::jsonb end
  )
  returning * into v_result;

  return v_result;
end;
$$;

grant execute on function public.wedding_site_bootstrap_write(uuid, jsonb) to authenticated;

create or replace function public.onboarding_event_seed_insert_many(
  p_wedding_site_id uuid,
  p_rows jsonb default '[]'::jsonb
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

  if not public.dayof_has_site_role(p_wedding_site_id, array['owner']) then
    raise exception 'insufficient owner permission' using errcode = '42501';
  end if;

  insert into public.itinerary_events (
    wedding_site_id,
    event_name,
    event_type,
    event_date,
    start_time,
    end_time,
    venue_name,
    venue_address,
    location_address,
    description,
    notes,
    dress_code,
    display_order,
    onboarding_seeded,
    rsvp_enabled,
    is_visible
  )
  select
    p_wedding_site_id,
    coalesce(nullif(btrim(coalesce(item->>'event_name', '')), ''), 'Untitled event'),
    nullif(btrim(coalesce(item->>'event_type', '')), ''),
    nullif(item->>'event_date', '')::date,
    nullif(item->>'start_time', '')::time,
    nullif(item->>'end_time', '')::time,
    nullif(btrim(coalesce(item->>'venue_name', '')), ''),
    nullif(btrim(coalesce(item->>'venue_address', '')), ''),
    nullif(btrim(coalesce(item->>'location_address', '')), ''),
    nullif(btrim(coalesce(item->>'description', '')), ''),
    nullif(btrim(coalesce(item->>'notes', '')), ''),
    nullif(btrim(coalesce(item->>'dress_code', '')), ''),
    nullif(item->>'display_order', '')::integer,
    coalesce((item->>'onboarding_seeded')::boolean, true),
    coalesce((item->>'rsvp_enabled')::boolean, false),
    case when item ? 'is_visible' then coalesce((item->>'is_visible')::boolean, true) else true end
  from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) as item;

  get diagnostics v_count = row_count;
  return coalesce(v_count, 0);
end;
$$;

grant execute on function public.onboarding_event_seed_insert_many(uuid, jsonb) to authenticated;
