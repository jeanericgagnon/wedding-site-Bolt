create or replace function public.guest_dashboard_guest_bulk_patch(
  p_wedding_site_id uuid default null,
  p_guest_ids uuid[] default null,
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
    select wedding_site_id
    into v_site_id
    from public.guests
    where id = any(coalesce(p_guest_ids, array[]::uuid[]))
      and wedding_site_id is not null
    limit 1;

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
    preferred_language = case when p_payload ? 'preferred_language' then nullif(trim(lower(p_payload->>'preferred_language')), '') else preferred_language end,
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
