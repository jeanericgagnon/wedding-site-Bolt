create or replace function public.dashboard_message_write(
  p_wedding_site_id uuid default null,
  p_message_id uuid default null,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.messages%rowtype;
  v_result public.messages%rowtype;
begin
  if auth.uid() is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  if p_message_id is null then
    if p_wedding_site_id is null then
      raise exception 'wedding_site_id required' using errcode = '23502';
    end if;

    if not public.dayof_has_site_permission(p_wedding_site_id, 'messages') then
      raise exception 'insufficient messages permission' using errcode = '42501';
    end if;

    insert into public.messages (
      wedding_site_id,
      channel,
      subject,
      body,
      audience_filter,
      recipient_count,
      recipient_filter,
      scheduled_for,
      status,
      sent_at,
      delivered_count,
      failed_count,
      sending_started_at,
      sending_finished_at
    )
    values (
      p_wedding_site_id,
      coalesce(nullif(btrim(p_payload->>'channel'), ''), 'email'),
      coalesce(nullif(btrim(p_payload->>'subject'), ''), ''),
      coalesce(nullif(btrim(p_payload->>'body'), ''), ''),
      coalesce(nullif(btrim(p_payload->>'audience_filter'), ''), 'all'),
      coalesce((p_payload->>'recipient_count')::integer, 0),
      coalesce(p_payload->'recipient_filter', '{}'::jsonb),
      nullif(p_payload->>'scheduled_for', '')::timestamptz,
      coalesce(nullif(btrim(p_payload->>'status'), ''), 'draft'),
      nullif(p_payload->>'sent_at', '')::timestamptz,
      nullif(p_payload->>'delivered_count', '')::integer,
      nullif(p_payload->>'failed_count', '')::integer,
      nullif(p_payload->>'sending_started_at', '')::timestamptz,
      nullif(p_payload->>'sending_finished_at', '')::timestamptz
    )
    returning * into v_result;

    return to_jsonb(v_result);
  end if;

  select *
  into v_existing
  from public.messages
  where id = p_message_id;

  if not found then
    raise exception 'message not found' using errcode = 'P0002';
  end if;

  if not public.dayof_has_site_permission(v_existing.wedding_site_id, 'messages') then
    raise exception 'insufficient messages permission' using errcode = '42501';
  end if;

  update public.messages
  set
    channel = case when p_payload ? 'channel' then coalesce(nullif(btrim(p_payload->>'channel'), ''), v_existing.channel) else v_existing.channel end,
    subject = case when p_payload ? 'subject' then coalesce(nullif(btrim(p_payload->>'subject'), ''), v_existing.subject) else v_existing.subject end,
    body = case when p_payload ? 'body' then coalesce(nullif(btrim(p_payload->>'body'), ''), v_existing.body) else v_existing.body end,
    audience_filter = case when p_payload ? 'audience_filter' then coalesce(nullif(btrim(p_payload->>'audience_filter'), ''), v_existing.audience_filter) else v_existing.audience_filter end,
    recipient_count = case when p_payload ? 'recipient_count' then coalesce((p_payload->>'recipient_count')::integer, v_existing.recipient_count) else v_existing.recipient_count end,
    recipient_filter = case when p_payload ? 'recipient_filter' then coalesce(p_payload->'recipient_filter', v_existing.recipient_filter) else v_existing.recipient_filter end,
    scheduled_for = case when p_payload ? 'scheduled_for' then nullif(p_payload->>'scheduled_for', '')::timestamptz else v_existing.scheduled_for end,
    status = case when p_payload ? 'status' then coalesce(nullif(btrim(p_payload->>'status'), ''), v_existing.status) else v_existing.status end,
    sent_at = case when p_payload ? 'sent_at' then nullif(p_payload->>'sent_at', '')::timestamptz else v_existing.sent_at end,
    delivered_count = case when p_payload ? 'delivered_count' then nullif(p_payload->>'delivered_count', '')::integer else v_existing.delivered_count end,
    failed_count = case when p_payload ? 'failed_count' then nullif(p_payload->>'failed_count', '')::integer else v_existing.failed_count end,
    sending_started_at = case when p_payload ? 'sending_started_at' then nullif(p_payload->>'sending_started_at', '')::timestamptz else v_existing.sending_started_at end,
    sending_finished_at = case when p_payload ? 'sending_finished_at' then nullif(p_payload->>'sending_finished_at', '')::timestamptz else v_existing.sending_finished_at end
  where id = p_message_id
  returning * into v_result;

  return to_jsonb(v_result);
end;
$$;

grant execute on function public.dashboard_message_write(uuid, uuid, jsonb) to authenticated;

create or replace function public.coordinator_alert_message_write(
  p_wedding_site_id uuid,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result public.messages%rowtype;
begin
  if auth.uid() is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  if not public.dayof_has_site_permission(p_wedding_site_id, 'coordinator') then
    raise exception 'insufficient coordinator permission' using errcode = '42501';
  end if;

  insert into public.messages (
    wedding_site_id,
    subject,
    body,
    channel,
    audience_filter,
    recipient_filter,
    recipient_count,
    status,
    sent_at,
    scheduled_for
  )
  values (
    p_wedding_site_id,
    coalesce(nullif(btrim(p_payload->>'subject'), ''), ''),
    coalesce(nullif(btrim(p_payload->>'body'), ''), ''),
    coalesce(nullif(btrim(p_payload->>'channel'), ''), 'email'),
    coalesce(nullif(btrim(p_payload->>'audience_filter'), ''), 'all'),
    coalesce(p_payload->'recipient_filter', '{}'::jsonb),
    coalesce((p_payload->>'recipient_count')::integer, 0),
    coalesce(nullif(btrim(p_payload->>'status'), ''), 'queued'),
    nullif(p_payload->>'sent_at', '')::timestamptz,
    nullif(p_payload->>'scheduled_for', '')::timestamptz
  )
  returning * into v_result;

  return to_jsonb(v_result);
end;
$$;

grant execute on function public.coordinator_alert_message_write(uuid, jsonb) to authenticated;

create or replace function public.coordinator_guest_checkin_write(
  p_site_id uuid,
  p_guest_id uuid,
  p_checked_in_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result public.guests%rowtype;
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

  return to_jsonb(v_result);
end;
$$;

grant execute on function public.coordinator_guest_checkin_write(uuid, uuid, timestamptz) to authenticated;

create or replace function public.coordinator_qna_write(
  p_site_id uuid default null,
  p_item_id uuid default null,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.guest_qna_items%rowtype;
  v_result public.guest_qna_items%rowtype;
begin
  if auth.uid() is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  if p_item_id is null then
    if p_site_id is null then
      raise exception 'site id required' using errcode = '23502';
    end if;

    if not public.dayof_has_site_permission(p_site_id, 'coordinator') then
      raise exception 'insufficient coordinator permission' using errcode = '42501';
    end if;

    insert into public.guest_qna_items (
      wedding_site_id,
      question,
      answer,
      status,
      source
    )
    values (
      p_site_id,
      coalesce(nullif(btrim(p_payload->>'question'), ''), ''),
      nullif(btrim(coalesce(p_payload->>'answer', '')), ''),
      coalesce(nullif(btrim(p_payload->>'status'), ''), 'new'),
      coalesce(nullif(btrim(p_payload->>'source'), ''), 'manual')
    )
    returning * into v_result;

    return to_jsonb(v_result);
  end if;

  select *
  into v_existing
  from public.guest_qna_items
  where id = p_item_id;

  if not found then
    raise exception 'qna item not found' using errcode = 'P0002';
  end if;

  if not public.dayof_has_site_permission(v_existing.wedding_site_id, 'coordinator') then
    raise exception 'insufficient coordinator permission' using errcode = '42501';
  end if;

  update public.guest_qna_items
  set
    answer = case when p_payload ? 'answer' then nullif(btrim(coalesce(p_payload->>'answer', '')), '') else v_existing.answer end,
    status = case when p_payload ? 'status' then coalesce(nullif(btrim(p_payload->>'status'), ''), v_existing.status) else v_existing.status end
  where id = p_item_id
  returning * into v_result;

  return to_jsonb(v_result);
end;
$$;

grant execute on function public.coordinator_qna_write(uuid, uuid, jsonb) to authenticated;
