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

  select nullif(row.value->>'wedding_site_id', '')::uuid
  into v_site_id
  from jsonb_array_elements(p_rows) as row(value)
  where nullif(row.value->>'wedding_site_id', '') is not null
  limit 1;

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
