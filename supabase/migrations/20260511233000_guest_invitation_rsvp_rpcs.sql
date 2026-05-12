create or replace function public.guest_dashboard_event_invitation_insert_many(
  p_rows jsonb default '[]'::jsonb
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

  if coalesce(jsonb_typeof(p_rows), 'null') <> 'array' then
    raise exception 'rows must be a json array' using errcode = '22023';
  end if;

  with requested as (
    select distinct row.event_id, row.guest_id
    from jsonb_to_recordset(p_rows) as row(event_id uuid, guest_id uuid)
    where row.event_id is not null
      and row.guest_id is not null
  ),
  scoped as (
    select requested.event_id, requested.guest_id, guest_row.wedding_site_id
    from requested
    join public.guests guest_row on guest_row.id = requested.guest_id
    join public.itinerary_events event_row
      on event_row.id = requested.event_id
     and event_row.wedding_site_id = guest_row.wedding_site_id
  )
  select min(wedding_site_id)
  into v_site_id
  from scoped;

  if v_site_id is null then
    return 0;
  end if;

  if exists (
    with requested as (
      select distinct row.event_id, row.guest_id
      from jsonb_to_recordset(p_rows) as row(event_id uuid, guest_id uuid)
      where row.event_id is not null
        and row.guest_id is not null
    ),
    scoped as (
      select guest_row.wedding_site_id
      from requested
      join public.guests guest_row on guest_row.id = requested.guest_id
      join public.itinerary_events event_row
        on event_row.id = requested.event_id
       and event_row.wedding_site_id = guest_row.wedding_site_id
    )
    select 1 from scoped where wedding_site_id <> v_site_id
  ) then
    raise exception 'event invitation rows must share one wedding site' using errcode = '42501';
  end if;

  if not public.dayof_has_site_permission(v_site_id, 'guests') then
    raise exception 'insufficient guests permission' using errcode = '42501';
  end if;

  insert into public.event_invitations (event_id, guest_id)
  with scoped as (
    select distinct requested.event_id, requested.guest_id
    from jsonb_to_recordset(p_rows) as requested(event_id uuid, guest_id uuid)
    join public.guests guest_row on guest_row.id = requested.guest_id
    join public.itinerary_events event_row
      on event_row.id = requested.event_id
     and event_row.wedding_site_id = guest_row.wedding_site_id
    where requested.event_id is not null
      and requested.guest_id is not null
  )
  select scoped.event_id, scoped.guest_id
  from scoped
  where not exists (
    select 1
    from public.event_invitations existing_row
    where existing_row.event_id = scoped.event_id
      and existing_row.guest_id = scoped.guest_id
  );

  get diagnostics v_count = row_count;
  return coalesce(v_count, 0);
end;
$$;

grant execute on function public.guest_dashboard_event_invitation_insert_many(jsonb) to authenticated;

create or replace function public.guest_dashboard_event_invitation_delete(
  p_guest_id uuid default null,
  p_event_id uuid default null,
  p_guest_ids uuid[] default null
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

  if p_guest_id is null and coalesce(array_length(p_guest_ids, 1), 0) = 0 then
    return 0;
  end if;

  with targets as (
    select distinct invitation_row.id, guest_row.wedding_site_id
    from public.event_invitations invitation_row
    join public.guests guest_row on guest_row.id = invitation_row.guest_id
    where (p_guest_id is not null and invitation_row.guest_id = p_guest_id)
       or (coalesce(array_length(p_guest_ids, 1), 0) > 0 and invitation_row.guest_id = any(p_guest_ids))
  )
  select min(wedding_site_id)
  into v_site_id
  from targets;

  if v_site_id is null then
    return 0;
  end if;

  if exists (
    with targets as (
      select distinct guest_row.wedding_site_id
      from public.event_invitations invitation_row
      join public.guests guest_row on guest_row.id = invitation_row.guest_id
      where (p_guest_id is not null and invitation_row.guest_id = p_guest_id)
         or (coalesce(array_length(p_guest_ids, 1), 0) > 0 and invitation_row.guest_id = any(p_guest_ids))
    )
    select 1 from targets where wedding_site_id <> v_site_id
  ) then
    raise exception 'event invitation delete requires one wedding site scope' using errcode = '42501';
  end if;

  if not public.dayof_has_site_permission(v_site_id, 'guests') then
    raise exception 'insufficient guests permission' using errcode = '42501';
  end if;

  delete from public.event_invitations invitation_row
  where invitation_row.id in (
    select distinct target_row.id
    from public.event_invitations target_row
    where (
      (p_guest_id is not null and target_row.guest_id = p_guest_id)
      or (coalesce(array_length(p_guest_ids, 1), 0) > 0 and target_row.guest_id = any(p_guest_ids))
    )
      and (p_event_id is null or target_row.event_id = p_event_id)
  );

  get diagnostics v_count = row_count;
  return coalesce(v_count, 0);
end;
$$;

grant execute on function public.guest_dashboard_event_invitation_delete(uuid, uuid, uuid[]) to authenticated;

create or replace function public.guest_dashboard_rsvp_replace_many(
  p_rows jsonb default '[]'::jsonb,
  p_guest_ids uuid[] default null
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

  if coalesce(jsonb_typeof(p_rows), 'null') <> 'array' then
    raise exception 'rows must be a json array' using errcode = '22023';
  end if;

  with requested_ids as (
    select distinct row.guest_id
    from jsonb_to_recordset(p_rows) as row(
      guest_id uuid,
      attending boolean,
      attending_ceremony boolean,
      attending_reception boolean,
      meal_choice text,
      plus_one_name text,
      plus_one_count integer,
      children_count integer,
      responded_at timestamptz,
      notes text,
      custom_answers jsonb
    )
    where row.guest_id is not null
    union
    select unnest(coalesce(p_guest_ids, array[]::uuid[]))
  ),
  scoped as (
    select guest_row.id, guest_row.wedding_site_id
    from requested_ids
    join public.guests guest_row on guest_row.id = requested_ids.guest_id
  )
  select min(wedding_site_id)
  into v_site_id
  from scoped;

  if v_site_id is null then
    return 0;
  end if;

  if exists (
    with requested_ids as (
      select distinct row.guest_id
      from jsonb_to_recordset(p_rows) as row(
        guest_id uuid,
        attending boolean,
        attending_ceremony boolean,
        attending_reception boolean,
        meal_choice text,
        plus_one_name text,
        plus_one_count integer,
        children_count integer,
        responded_at timestamptz,
        notes text,
        custom_answers jsonb
      )
      where row.guest_id is not null
      union
      select unnest(coalesce(p_guest_ids, array[]::uuid[]))
    ),
    scoped as (
      select guest_row.wedding_site_id
      from requested_ids
      join public.guests guest_row on guest_row.id = requested_ids.guest_id
    )
    select 1 from scoped where wedding_site_id <> v_site_id
  ) then
    raise exception 'rsvp rows must share one wedding site' using errcode = '42501';
  end if;

  if not public.dayof_has_site_permission(v_site_id, 'guests') then
    raise exception 'insufficient guests permission' using errcode = '42501';
  end if;

  delete from public.rsvps
  where guest_id in (
    with requested_ids as (
      select distinct row.guest_id
      from jsonb_to_recordset(p_rows) as row(
        guest_id uuid,
        attending boolean,
        attending_ceremony boolean,
        attending_reception boolean,
        meal_choice text,
        plus_one_name text,
        plus_one_count integer,
        children_count integer,
        responded_at timestamptz,
        notes text,
        custom_answers jsonb
      )
      where row.guest_id is not null
      union
      select unnest(coalesce(p_guest_ids, array[]::uuid[]))
    )
    select guest_id from requested_ids
  );

  insert into public.rsvps (
    guest_id,
    attending,
    attending_ceremony,
    attending_reception,
    meal_choice,
    plus_one_name,
    plus_one_count,
    children_count,
    responded_at,
    notes,
    custom_answers
  )
  select
    row.guest_id,
    row.attending,
    row.attending_ceremony,
    row.attending_reception,
    nullif(btrim(coalesce(row.meal_choice, '')), ''),
    nullif(btrim(coalesce(row.plus_one_name, '')), ''),
    coalesce(row.plus_one_count, 0),
    coalesce(row.children_count, 0),
    row.responded_at,
    nullif(btrim(coalesce(row.notes, '')), ''),
    coalesce(row.custom_answers, '{}'::jsonb)
  from jsonb_to_recordset(p_rows) as row(
    guest_id uuid,
    attending boolean,
    attending_ceremony boolean,
    attending_reception boolean,
    meal_choice text,
    plus_one_name text,
    plus_one_count integer,
    children_count integer,
    responded_at timestamptz,
    notes text,
    custom_answers jsonb
  )
  where row.guest_id is not null;

  get diagnostics v_count = row_count;
  return coalesce(v_count, 0);
end;
$$;

grant execute on function public.guest_dashboard_rsvp_replace_many(jsonb, uuid[]) to authenticated;

create or replace function public.guest_dashboard_assisted_rsvp_write(
  p_guest_id uuid,
  p_status text,
  p_recorded_at timestamptz,
  p_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest public.guests%rowtype;
  v_rsvp public.rsvps%rowtype;
  v_attending boolean;
begin
  if auth.uid() is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  select *
  into v_guest
  from public.guests
  where id = p_guest_id
  for update;

  if not found then
    raise exception 'guest not found' using errcode = 'P0002';
  end if;

  if not public.dayof_has_site_permission(v_guest.wedding_site_id, 'guests') then
    raise exception 'insufficient guests permission' using errcode = '42501';
  end if;

  v_attending := lower(coalesce(p_status, '')) = 'confirmed';

  update public.guests
  set
    rsvp_status = p_status,
    rsvp_received_at = p_recorded_at,
    notes = nullif(btrim(coalesce(p_notes, '')), '')
  where id = p_guest_id;

  select *
  into v_rsvp
  from public.rsvps
  where guest_id = p_guest_id
  order by created_at asc nulls last, id asc
  limit 1;

  if found then
    update public.rsvps
    set
      attending = v_attending,
      attending_ceremony = case when v_attending then v_guest.invited_to_ceremony else false end,
      attending_reception = case when v_attending then v_guest.invited_to_reception else false end,
      meal_choice = case when v_attending then v_rsvp.meal_choice else null end,
      plus_one_name = case when v_attending then v_rsvp.plus_one_name else null end,
      plus_one_count = case when v_attending then coalesce(v_rsvp.plus_one_count, 0) else 0 end,
      children_count = case when v_attending then coalesce(v_rsvp.children_count, 0) else 0 end,
      responded_at = p_recorded_at,
      notes = nullif(btrim(coalesce(p_notes, '')), '')
    where id = v_rsvp.id;
  else
    insert into public.rsvps (
      guest_id,
      attending,
      attending_ceremony,
      attending_reception,
      meal_choice,
      plus_one_name,
      plus_one_count,
      children_count,
      responded_at,
      notes
    )
    values (
      p_guest_id,
      v_attending,
      case when v_attending then v_guest.invited_to_ceremony else false end,
      case when v_attending then v_guest.invited_to_reception else false end,
      null,
      null,
      0,
      0,
      p_recorded_at,
      nullif(btrim(coalesce(p_notes, '')), '')
    )
    returning * into v_rsvp;
  end if;

  return jsonb_build_object(
    'guest_id', p_guest_id,
    'status', p_status,
    'recorded_at', p_recorded_at,
    'notes', nullif(btrim(coalesce(p_notes, '')), '')
  );
end;
$$;

grant execute on function public.guest_dashboard_assisted_rsvp_write(uuid, text, timestamptz, text) to authenticated;

create or replace function public.guest_dashboard_import_guests(
  p_rows jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb := '[]'::jsonb;
  v_site_id uuid;
  row_payload jsonb;
  inserted_row public.guests%rowtype;
begin
  if auth.uid() is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  if coalesce(jsonb_typeof(p_rows), 'null') <> 'array' then
    raise exception 'rows must be a json array' using errcode = '22023';
  end if;

  select min(nullif(row.value->>'wedding_site_id', '')::uuid)
  into v_site_id
  from jsonb_array_elements(p_rows) as row(value);

  if v_site_id is null then
    return '[]'::jsonb;
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_rows) as row(value)
    where nullif(row.value->>'wedding_site_id', '')::uuid <> v_site_id
  ) then
    raise exception 'import rows must share one wedding site' using errcode = '42501';
  end if;

  if not public.dayof_has_site_permission(v_site_id, 'guests') then
    raise exception 'insufficient guests permission' using errcode = '42501';
  end if;

  for row_payload in
    select value
    from jsonb_array_elements(p_rows)
  loop
    insert into public.guests (
      wedding_site_id,
      first_name,
      last_name,
      name,
      email,
      phone,
      plus_one_allowed,
      plus_one_name,
      children_allowed,
      max_children,
      max_additional_guests,
      invited_to_ceremony,
      invited_to_reception,
      invite_token,
      rsvp_status,
      rsvp_received_at,
      household_id,
      group_name,
      notes,
      mailing_address_line1,
      mailing_address_line2,
      mailing_city,
      mailing_state,
      mailing_postal_code,
      mailing_country
    )
    values (
      v_site_id,
      nullif(btrim(coalesce(row_payload->>'first_name', '')), ''),
      nullif(btrim(coalesce(row_payload->>'last_name', '')), ''),
      nullif(btrim(coalesce(row_payload->>'name', '')), ''),
      nullif(btrim(coalesce(row_payload->>'email', '')), ''),
      nullif(btrim(coalesce(row_payload->>'phone', '')), ''),
      coalesce((row_payload->>'plus_one_allowed')::boolean, false),
      nullif(btrim(coalesce(row_payload->>'plus_one_name', '')), ''),
      coalesce((row_payload->>'children_allowed')::boolean, false),
      case when row_payload ? 'max_children' then coalesce((row_payload->>'max_children')::integer, 0) else 0 end,
      case when row_payload ? 'max_additional_guests' then coalesce((row_payload->>'max_additional_guests')::integer, 0) else 0 end,
      coalesce((row_payload->>'invited_to_ceremony')::boolean, false),
      coalesce((row_payload->>'invited_to_reception')::boolean, false),
      nullif(btrim(coalesce(row_payload->>'invite_token', '')), ''),
      coalesce(nullif(btrim(coalesce(row_payload->>'rsvp_status', '')), ''), 'pending'),
      nullif(row_payload->>'rsvp_received_at', '')::timestamptz,
      nullif(row_payload->>'household_id', '')::uuid,
      nullif(btrim(coalesce(row_payload->>'group_name', '')), ''),
      nullif(btrim(coalesce(row_payload->>'notes', '')), ''),
      nullif(btrim(coalesce(row_payload->>'mailing_address_line1', '')), ''),
      nullif(btrim(coalesce(row_payload->>'mailing_address_line2', '')), ''),
      nullif(btrim(coalesce(row_payload->>'mailing_city', '')), ''),
      nullif(btrim(coalesce(row_payload->>'mailing_state', '')), ''),
      nullif(btrim(coalesce(row_payload->>'mailing_postal_code', '')), ''),
      nullif(btrim(coalesce(row_payload->>'mailing_country', '')), '')
    )
    returning * into inserted_row;

    v_result := v_result || jsonb_build_array(jsonb_build_object(
      'id', inserted_row.id,
      'first_name', inserted_row.first_name,
      'last_name', inserted_row.last_name,
      'name', inserted_row.name,
      'email', inserted_row.email
    ));
  end loop;

  return v_result;
end;
$$;

grant execute on function public.guest_dashboard_import_guests(jsonb) to authenticated;
