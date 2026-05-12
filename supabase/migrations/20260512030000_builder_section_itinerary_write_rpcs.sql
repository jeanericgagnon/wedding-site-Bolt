create or replace function public.section_write(
  p_site_id uuid default null,
  p_section_id text default null,
  p_payload jsonb default '{}'::jsonb
)
returns public.sections
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.sections%rowtype;
  v_result public.sections%rowtype;
  v_site_id uuid;
begin
  if auth.uid() is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  if p_section_id is null then
    v_site_id := p_site_id;
  else
    select * into v_existing from public.sections where id = p_section_id;
    if not found then
      raise exception 'section not found' using errcode = 'P0002';
    end if;
    v_site_id := v_existing.site_id;
  end if;

  if v_site_id is null then
    raise exception 'site_id required' using errcode = '23502';
  end if;

  if not (
    public.dayof_has_site_permission(v_site_id, 'settings')
    or public.dayof_has_site_role(v_site_id, ARRAY['owner','planner','coordinator'])
  ) then
    raise exception 'insufficient section permission' using errcode = '42501';
  end if;

  insert into public.sections (
    id,
    site_id,
    type,
    variant,
    data,
    "order",
    visible,
    schema_version,
    style_overrides,
    bindings,
    created_at,
    updated_at
  )
  values (
    coalesce(p_section_id, p_payload->>'id'),
    v_site_id,
    coalesce(nullif(p_payload->>'type', ''), v_existing.type),
    coalesce(nullif(p_payload->>'variant', ''), v_existing.variant, 'default'),
    coalesce(p_payload->'data', v_existing.data, '{}'::jsonb),
    coalesce(nullif(p_payload->>'order', '')::integer, v_existing."order", 0),
    coalesce((p_payload->>'visible')::boolean, v_existing.visible, true),
    coalesce(nullif(p_payload->>'schema_version', '')::integer, v_existing.schema_version, 1),
    coalesce(p_payload->'style_overrides', v_existing.style_overrides, '{}'::jsonb),
    coalesce(p_payload->'bindings', v_existing.bindings, '{}'::jsonb),
    coalesce(v_existing.created_at, now()),
    now()
  )
  on conflict (id)
  do update set
    type = excluded.type,
    variant = excluded.variant,
    data = excluded.data,
    "order" = excluded."order",
    visible = excluded.visible,
    schema_version = excluded.schema_version,
    style_overrides = excluded.style_overrides,
    bindings = excluded.bindings,
    updated_at = now()
  returning * into v_result;

  return v_result;
end;
$$;

grant execute on function public.section_write(uuid, text, jsonb) to authenticated;

create or replace function public.section_upsert_many(
  p_site_id uuid,
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

  if not (
    public.dayof_has_site_permission(p_site_id, 'settings')
    or public.dayof_has_site_role(p_site_id, ARRAY['owner','planner','coordinator'])
  ) then
    raise exception 'insufficient section permission' using errcode = '42501';
  end if;

  if coalesce(jsonb_typeof(p_rows), 'null') <> 'array' then
    raise exception 'rows must be a json array' using errcode = '22023';
  end if;

  insert into public.sections (
    id,
    site_id,
    type,
    variant,
    data,
    "order",
    visible,
    schema_version,
    style_overrides,
    bindings,
    updated_at
  )
  select
    row.id,
    p_site_id,
    row.type,
    coalesce(nullif(row.variant, ''), 'default'),
    coalesce(row.data, '{}'::jsonb),
    coalesce(row."order", 0),
    coalesce(row.visible, true),
    coalesce(row.schema_version, 1),
    coalesce(row.style_overrides, '{}'::jsonb),
    coalesce(row.bindings, '{}'::jsonb),
    now()
  from jsonb_to_recordset(p_rows) as row(
    id text,
    type text,
    variant text,
    data jsonb,
    "order" integer,
    visible boolean,
    schema_version integer,
    style_overrides jsonb,
    bindings jsonb
  )
  where row.id is not null
    and row.type is not null
  on conflict (id)
  do update set
    type = excluded.type,
    variant = excluded.variant,
    data = excluded.data,
    "order" = excluded."order",
    visible = excluded.visible,
    schema_version = excluded.schema_version,
    style_overrides = excluded.style_overrides,
    bindings = excluded.bindings,
    updated_at = now();

  get diagnostics v_count = row_count;
  return coalesce(v_count, 0);
end;
$$;

grant execute on function public.section_upsert_many(uuid, jsonb) to authenticated;

create or replace function public.section_reorder_many(
  p_site_id uuid,
  p_items jsonb default '[]'::jsonb
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

  if not (
    public.dayof_has_site_permission(p_site_id, 'settings')
    or public.dayof_has_site_role(p_site_id, ARRAY['owner','planner','coordinator'])
  ) then
    raise exception 'insufficient section permission' using errcode = '42501';
  end if;

  if coalesce(jsonb_typeof(p_items), 'null') <> 'array' then
    raise exception 'items must be a json array' using errcode = '22023';
  end if;

  update public.sections section_row
  set
    "order" = item."order",
    updated_at = now()
  from jsonb_to_recordset(p_items) as item(id text, "order" integer)
  where section_row.id = item.id
    and section_row.site_id = p_site_id;

  get diagnostics v_count = row_count;
  return coalesce(v_count, 0);
end;
$$;

grant execute on function public.section_reorder_many(uuid, jsonb) to authenticated;

create or replace function public.section_delete_one(
  p_section_id text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.sections%rowtype;
begin
  if auth.uid() is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  select * into v_existing from public.sections where id = p_section_id;
  if not found then
    raise exception 'section not found' using errcode = 'P0002';
  end if;

  if not (
    public.dayof_has_site_permission(v_existing.site_id, 'settings')
    or public.dayof_has_site_role(v_existing.site_id, ARRAY['owner','planner','coordinator'])
  ) then
    raise exception 'insufficient section permission' using errcode = '42501';
  end if;

  delete from public.sections where id = p_section_id;
  return p_section_id;
end;
$$;

grant execute on function public.section_delete_one(text) to authenticated;

create or replace function public.section_delete_by_site(
  p_site_id uuid
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

  if not (
    public.dayof_has_site_permission(p_site_id, 'settings')
    or public.dayof_has_site_role(p_site_id, ARRAY['owner','planner','coordinator'])
  ) then
    raise exception 'insufficient section permission' using errcode = '42501';
  end if;

  delete from public.sections where site_id = p_site_id;
  get diagnostics v_count = row_count;
  return coalesce(v_count, 0);
end;
$$;

grant execute on function public.section_delete_by_site(uuid) to authenticated;

create or replace function public.builder_project_publish(
  p_wedding_site_id uuid,
  p_published_at timestamptz,
  p_next_site_json jsonb,
  p_next_published_json jsonb
)
returns jsonb
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

  if not (
    public.dayof_has_site_permission(p_wedding_site_id, 'settings')
    or public.dayof_has_site_role(p_wedding_site_id, ARRAY['owner','planner','coordinator'])
  ) then
    raise exception 'insufficient builder publish permission' using errcode = '42501';
  end if;

  update public.wedding_sites
  set
    is_published = true,
    published_at = p_published_at,
    updated_at = p_published_at,
    published_json = p_next_published_json,
    site_json = p_next_site_json
  where id = p_wedding_site_id
  returning * into v_result;

  if not found then
    raise exception 'wedding site not found' using errcode = 'P0002';
  end if;

  return to_jsonb(v_result);
end;
$$;

grant execute on function public.builder_project_publish(uuid, timestamptz, jsonb, jsonb) to authenticated;

create or replace function public.itinerary_event_insert_many(
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

  if not (
    public.dayof_has_site_permission(p_wedding_site_id, 'planning')
    or public.dayof_has_site_role(p_wedding_site_id, ARRAY['owner','planner','coordinator'])
  ) then
    raise exception 'insufficient itinerary permission' using errcode = '42501';
  end if;

  if coalesce(jsonb_typeof(p_rows), 'null') <> 'array' then
    raise exception 'rows must be a json array' using errcode = '22023';
  end if;

  insert into public.itinerary_events (
    wedding_site_id,
    event_name,
    title,
    description,
    event_date,
    start_time,
    end_time,
    display_order,
    is_visible
  )
  select
    p_wedding_site_id,
    row.event_name,
    coalesce(nullif(row.title, ''), row.event_name),
    coalesce(row.description, ''),
    row.event_date,
    row.start_time,
    row.end_time,
    coalesce(row.display_order, 0),
    coalesce(row.is_visible, true)
  from jsonb_to_recordset(p_rows) as row(
    event_name text,
    title text,
    description text,
    event_date date,
    start_time text,
    end_time text,
    display_order integer,
    is_visible boolean
  )
  where row.event_name is not null;

  get diagnostics v_count = row_count;
  return coalesce(v_count, 0);
end;
$$;

grant execute on function public.itinerary_event_insert_many(uuid, jsonb) to authenticated;

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
    p_event_id,
    v_site_id,
    coalesce(nullif(p_payload->>'event_name', ''), v_existing.event_name),
    coalesce(nullif(p_payload->>'title', ''), nullif(p_payload->>'event_name', ''), v_existing.title, v_existing.event_name),
    coalesce(p_payload->>'description', v_existing.description, ''),
    coalesce(nullif(p_payload->>'event_date', '')::date, v_existing.event_date),
    nullif(coalesce(p_payload->>'start_time', v_existing.start_time), ''),
    nullif(coalesce(p_payload->>'end_time', v_existing.end_time), ''),
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

create or replace function public.itinerary_event_delete(
  p_event_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.itinerary_events%rowtype;
begin
  if auth.uid() is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  select * into v_existing from public.itinerary_events where id = p_event_id;
  if not found then
    raise exception 'itinerary event not found' using errcode = 'P0002';
  end if;

  if not (
    public.dayof_has_site_permission(v_existing.wedding_site_id, 'planning')
    or public.dayof_has_site_role(v_existing.wedding_site_id, ARRAY['owner','planner','coordinator'])
  ) then
    raise exception 'insufficient itinerary permission' using errcode = '42501';
  end if;

  delete from public.itinerary_events where id = p_event_id;
  return p_event_id;
end;
$$;

grant execute on function public.itinerary_event_delete(uuid) to authenticated;

create or replace function public.itinerary_event_reorder_many(
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

  select min(event_row.wedding_site_id)
  into v_site_id
  from jsonb_to_recordset(p_rows) as row(id uuid, event_date date, start_time text, end_time text, display_order integer)
  join public.itinerary_events event_row on event_row.id = row.id;

  if v_site_id is null then
    return 0;
  end if;

  if not (
    public.dayof_has_site_permission(v_site_id, 'planning')
    or public.dayof_has_site_role(v_site_id, ARRAY['owner','planner','coordinator'])
  ) then
    raise exception 'insufficient itinerary permission' using errcode = '42501';
  end if;

  update public.itinerary_events event_row
  set
    event_date = row.event_date,
    start_time = nullif(row.start_time, ''),
    end_time = nullif(row.end_time, ''),
    display_order = coalesce(row.display_order, event_row.display_order),
    updated_at = now()
  from jsonb_to_recordset(p_rows) as row(id uuid, event_date date, start_time text, end_time text, display_order integer)
  where event_row.id = row.id;

  get diagnostics v_count = row_count;
  return coalesce(v_count, 0);
end;
$$;

grant execute on function public.itinerary_event_reorder_many(jsonb) to authenticated;

create or replace function public.itinerary_schedule_mirror_sync(
  p_wedding_site_id uuid,
  p_schedule jsonb default '[]'::jsonb,
  p_section_events jsonb default '[]'::jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_site public.wedding_sites%rowtype;
  v_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  if not (
    public.dayof_has_site_permission(p_wedding_site_id, 'planning')
    or public.dayof_has_site_role(p_wedding_site_id, ARRAY['owner','planner','coordinator'])
  ) then
    raise exception 'insufficient itinerary permission' using errcode = '42501';
  end if;

  select * into v_site from public.wedding_sites where id = p_wedding_site_id;
  if not found then
    raise exception 'wedding site not found' using errcode = 'P0002';
  end if;

  update public.wedding_sites
  set
    wedding_data = jsonb_set(coalesce(v_site.wedding_data, '{}'::jsonb), '{schedule}', coalesce(p_schedule, '[]'::jsonb), true),
    updated_at = now()
  where id = p_wedding_site_id;

  update public.sections
  set
    data = jsonb_set(coalesce(data, '{}'::jsonb), '{events}', coalesce(p_section_events, '[]'::jsonb), true),
    updated_at = now()
  where site_id = p_wedding_site_id
    and type = 'schedule';

  get diagnostics v_count = row_count;
  return coalesce(v_count, 0);
end;
$$;

grant execute on function public.itinerary_schedule_mirror_sync(uuid, jsonb, jsonb) to authenticated;
