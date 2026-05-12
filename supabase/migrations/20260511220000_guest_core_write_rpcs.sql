create or replace function public.guest_dashboard_guest_write(
  p_wedding_site_id uuid default null,
  p_guest_id uuid default null,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.guests%rowtype;
  v_inserted public.guests%rowtype;
begin
  if auth.uid() is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  if p_guest_id is null then
    if p_wedding_site_id is null then
      raise exception 'wedding_site_id required' using errcode = '23502';
    end if;

    if not public.dayof_has_site_permission(p_wedding_site_id, 'guests') then
      raise exception 'insufficient guests permission' using errcode = '42501';
    end if;

    insert into public.guests (
      wedding_site_id,
      first_name,
      last_name,
      name,
      email,
      phone,
      plus_one_allowed,
      invited_to_ceremony,
      invited_to_reception,
      invite_token,
      rsvp_status
    )
    values (
      p_wedding_site_id,
      nullif(trim(p_payload->>'first_name'), ''),
      nullif(trim(p_payload->>'last_name'), ''),
      coalesce(nullif(trim(p_payload->>'name'), ''), trim(concat_ws(' ', p_payload->>'first_name', p_payload->>'last_name'))),
      nullif(trim(p_payload->>'email'), ''),
      nullif(trim(p_payload->>'phone'), ''),
      coalesce((p_payload->>'plus_one_allowed')::boolean, false),
      coalesce((p_payload->>'invited_to_ceremony')::boolean, false),
      coalesce((p_payload->>'invited_to_reception')::boolean, false),
      nullif(trim(p_payload->>'invite_token'), ''),
      coalesce(nullif(trim(p_payload->>'rsvp_status'), ''), 'pending')
    )
    returning * into v_inserted;

    return to_jsonb(v_inserted);
  end if;

  select *
  into v_existing
  from public.guests
  where id = p_guest_id;

  if not found then
    raise exception 'guest not found' using errcode = 'P0002';
  end if;

  if not public.dayof_has_site_permission(v_existing.wedding_site_id, 'guests') then
    raise exception 'insufficient guests permission' using errcode = '42501';
  end if;

  update public.guests
  set
    first_name = case when p_payload ? 'first_name' then nullif(trim(p_payload->>'first_name'), '') else v_existing.first_name end,
    last_name = case when p_payload ? 'last_name' then nullif(trim(p_payload->>'last_name'), '') else v_existing.last_name end,
    name = case when p_payload ? 'name' then nullif(trim(p_payload->>'name'), '') else v_existing.name end,
    email = case when p_payload ? 'email' then nullif(trim(p_payload->>'email'), '') else v_existing.email end,
    phone = case when p_payload ? 'phone' then nullif(trim(p_payload->>'phone'), '') else v_existing.phone end,
    plus_one_allowed = case when p_payload ? 'plus_one_allowed' then coalesce((p_payload->>'plus_one_allowed')::boolean, v_existing.plus_one_allowed) else v_existing.plus_one_allowed end,
    plus_one_name = case when p_payload ? 'plus_one_name' then nullif(trim(p_payload->>'plus_one_name'), '') else v_existing.plus_one_name end,
    children_allowed = case when p_payload ? 'children_allowed' then coalesce((p_payload->>'children_allowed')::boolean, v_existing.children_allowed) else v_existing.children_allowed end,
    max_children = case when p_payload ? 'max_children' then (p_payload->>'max_children')::integer else v_existing.max_children end,
    max_additional_guests = case when p_payload ? 'max_additional_guests' then (p_payload->>'max_additional_guests')::integer else v_existing.max_additional_guests end,
    invited_to_ceremony = case when p_payload ? 'invited_to_ceremony' then coalesce((p_payload->>'invited_to_ceremony')::boolean, v_existing.invited_to_ceremony) else v_existing.invited_to_ceremony end,
    invited_to_reception = case when p_payload ? 'invited_to_reception' then coalesce((p_payload->>'invited_to_reception')::boolean, v_existing.invited_to_reception) else v_existing.invited_to_reception end,
    invite_token = case when p_payload ? 'invite_token' then nullif(trim(p_payload->>'invite_token'), '') else v_existing.invite_token end,
    rsvp_status = case when p_payload ? 'rsvp_status' then nullif(trim(p_payload->>'rsvp_status'), '') else v_existing.rsvp_status end,
    rsvp_received_at = case when p_payload ? 'rsvp_received_at' then (p_payload->>'rsvp_received_at')::timestamptz else v_existing.rsvp_received_at end,
    checked_in_at = case when p_payload ? 'checked_in_at' then (p_payload->>'checked_in_at')::timestamptz else v_existing.checked_in_at end,
    checkin_notes = case when p_payload ? 'checkin_notes' then nullif(trim(p_payload->>'checkin_notes'), '') else v_existing.checkin_notes end,
    thank_you_sent_at = case when p_payload ? 'thank_you_sent_at' then (p_payload->>'thank_you_sent_at')::timestamptz else v_existing.thank_you_sent_at end,
    thank_you_notes = case when p_payload ? 'thank_you_notes' then nullif(trim(p_payload->>'thank_you_notes'), '') else v_existing.thank_you_notes end,
    invitation_sent_at = case when p_payload ? 'invitation_sent_at' then (p_payload->>'invitation_sent_at')::timestamptz else v_existing.invitation_sent_at end,
    reminder_last_sent_at = case when p_payload ? 'reminder_last_sent_at' then (p_payload->>'reminder_last_sent_at')::timestamptz else v_existing.reminder_last_sent_at end,
    household_id = case when p_payload ? 'household_id' then (p_payload->>'household_id')::uuid else v_existing.household_id end,
    group_name = case when p_payload ? 'group_name' then nullif(trim(p_payload->>'group_name'), '') else v_existing.group_name end,
    notes = case when p_payload ? 'notes' then nullif(trim(p_payload->>'notes'), '') else v_existing.notes end,
    mailing_address_line1 = case when p_payload ? 'mailing_address_line1' then nullif(trim(p_payload->>'mailing_address_line1'), '') else v_existing.mailing_address_line1 end,
    mailing_address_line2 = case when p_payload ? 'mailing_address_line2' then nullif(trim(p_payload->>'mailing_address_line2'), '') else v_existing.mailing_address_line2 end,
    mailing_city = case when p_payload ? 'mailing_city' then nullif(trim(p_payload->>'mailing_city'), '') else v_existing.mailing_city end,
    mailing_state = case when p_payload ? 'mailing_state' then nullif(trim(p_payload->>'mailing_state'), '') else v_existing.mailing_state end,
    mailing_postal_code = case when p_payload ? 'mailing_postal_code' then nullif(trim(p_payload->>'mailing_postal_code'), '') else v_existing.mailing_postal_code end,
    mailing_country = case when p_payload ? 'mailing_country' then nullif(trim(p_payload->>'mailing_country'), '') else v_existing.mailing_country end
  where id = p_guest_id
  returning * into v_inserted;

  return to_jsonb(v_inserted);
end;
$$;

grant execute on function public.guest_dashboard_guest_write(uuid, uuid, jsonb) to authenticated;

create or replace function public.guest_dashboard_guest_bulk_patch(
  p_wedding_site_id uuid default null,
  p_guest_ids uuid[],
  p_payload jsonb default '{}'::jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_site_id uuid;
begin
  if auth.uid() is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  if p_wedding_site_id is null then
    select min(wedding_site_id)
    into v_site_id
    from public.guests
    where id = any(coalesce(p_guest_ids, array[]::uuid[]));

    if v_site_id is null then
      return 0;
    end if;

    if exists (
      select 1
      from public.guests
      where id = any(coalesce(p_guest_ids, array[]::uuid[]))
        and wedding_site_id <> v_site_id
    ) then
      raise exception 'guest ids must share one wedding site' using errcode = '42501';
    end if;
  else
    v_site_id := p_wedding_site_id;
  end if;

  if not public.dayof_has_site_permission(v_site_id, 'guests') then
    raise exception 'insufficient guests permission' using errcode = '42501';
  end if;

  update public.guests
  set
    checked_in_at = case when p_payload ? 'checked_in_at' then (p_payload->>'checked_in_at')::timestamptz else checked_in_at end,
    checkin_notes = case when p_payload ? 'checkin_notes' then nullif(trim(p_payload->>'checkin_notes'), '') else checkin_notes end,
    thank_you_sent_at = case when p_payload ? 'thank_you_sent_at' then (p_payload->>'thank_you_sent_at')::timestamptz else thank_you_sent_at end,
    thank_you_notes = case when p_payload ? 'thank_you_notes' then nullif(trim(p_payload->>'thank_you_notes'), '') else thank_you_notes end,
    invitation_sent_at = case when p_payload ? 'invitation_sent_at' then (p_payload->>'invitation_sent_at')::timestamptz else invitation_sent_at end,
    reminder_last_sent_at = case when p_payload ? 'reminder_last_sent_at' then (p_payload->>'reminder_last_sent_at')::timestamptz else reminder_last_sent_at end,
    household_id = case when p_payload ? 'household_id' then (p_payload->>'household_id')::uuid else household_id end,
    rsvp_status = case when p_payload ? 'rsvp_status' then nullif(trim(p_payload->>'rsvp_status'), '') else rsvp_status end,
    rsvp_received_at = case when p_payload ? 'rsvp_received_at' then (p_payload->>'rsvp_received_at')::timestamptz else rsvp_received_at end,
    invite_token = case when p_payload ? 'invite_token' then nullif(trim(p_payload->>'invite_token'), '') else invite_token end,
    notes = case when p_payload ? 'notes' then nullif(trim(p_payload->>'notes'), '') else notes end
  where wedding_site_id = v_site_id
    and id = any(coalesce(p_guest_ids, array[]::uuid[]));

  get diagnostics v_count = row_count;
  return coalesce(v_count, 0);
end;
$$;

grant execute on function public.guest_dashboard_guest_bulk_patch(uuid, uuid[], jsonb) to authenticated;

create or replace function public.guest_dashboard_guest_delete(
  p_guest_id uuid
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
  from public.guests
  where id = p_guest_id;

  if not found then
    raise exception 'guest not found' using errcode = 'P0002';
  end if;

  if not public.dayof_has_site_permission(v_site_id, 'guests') then
    raise exception 'insufficient guests permission' using errcode = '42501';
  end if;

  delete from public.guests
  where id = p_guest_id;

  return p_guest_id;
end;
$$;

grant execute on function public.guest_dashboard_guest_delete(uuid) to authenticated;

create or replace function public.guest_dashboard_guest_delete_site(
  p_wedding_site_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  if not public.dayof_has_site_permission(p_wedding_site_id, 'guests') then
    raise exception 'insufficient guests permission' using errcode = '42501';
  end if;

  delete from public.guests
  where wedding_site_id = p_wedding_site_id;

  get diagnostics v_count = row_count;
  return coalesce(v_count, 0);
end;
$$;

grant execute on function public.guest_dashboard_guest_delete_site(uuid) to authenticated;
