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
  select wedding_site_id
  into v_site_id
  from scoped
  where wedding_site_id is not null
  limit 1;

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
