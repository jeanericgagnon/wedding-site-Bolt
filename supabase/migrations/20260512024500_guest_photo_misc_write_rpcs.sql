create or replace function public.guest_hub_settings_write(
  p_wedding_site_id uuid,
  p_payload jsonb default '{}'::jsonb
)
returns public.guest_hub_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_now timestamptz := now();
  v_result public.guest_hub_settings%rowtype;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  if not public.dayof_has_site_permission(p_wedding_site_id, 'photos') then
    raise exception 'insufficient photos permission' using errcode = '42501';
  end if;

  insert into public.guest_hub_settings (
    wedding_site_id,
    rsvp_enabled,
    photos_enabled,
    guestbook_enabled,
    registry_enabled,
    schedule_enabled,
    travel_enabled,
    recap_status,
    recap_published_at,
    recap_closed_at,
    custom_message,
    language_default,
    updated_by,
    updated_at
  )
  values (
    p_wedding_site_id,
    coalesce((p_payload->>'rsvp_enabled')::boolean, true),
    coalesce((p_payload->>'photos_enabled')::boolean, true),
    coalesce((p_payload->>'guestbook_enabled')::boolean, true),
    coalesce((p_payload->>'registry_enabled')::boolean, true),
    coalesce((p_payload->>'schedule_enabled')::boolean, true),
    coalesce((p_payload->>'travel_enabled')::boolean, true),
    coalesce(nullif(btrim(coalesce(p_payload->>'recap_status', '')), ''), 'draft'),
    case
      when coalesce(p_payload->>'recap_status', '') = 'published'
        then coalesce(nullif(p_payload->>'recap_published_at', '')::timestamptz, v_now)
      else nullif(p_payload->>'recap_published_at', '')::timestamptz
    end,
    case
      when coalesce(p_payload->>'recap_status', '') = 'closed'
        then coalesce(nullif(p_payload->>'recap_closed_at', '')::timestamptz, v_now)
      else null
    end,
    nullif(btrim(coalesce(p_payload->>'custom_message', '')), ''),
    coalesce(nullif(btrim(coalesce(p_payload->>'language_default', '')), ''), 'en'),
    v_user_id,
    v_now
  )
  on conflict (wedding_site_id)
  do update set
    rsvp_enabled = excluded.rsvp_enabled,
    photos_enabled = excluded.photos_enabled,
    guestbook_enabled = excluded.guestbook_enabled,
    registry_enabled = excluded.registry_enabled,
    schedule_enabled = excluded.schedule_enabled,
    travel_enabled = excluded.travel_enabled,
    recap_status = excluded.recap_status,
    recap_published_at = excluded.recap_published_at,
    recap_closed_at = excluded.recap_closed_at,
    custom_message = excluded.custom_message,
    language_default = excluded.language_default,
    updated_by = excluded.updated_by,
    updated_at = excluded.updated_at
  returning * into v_result;

  return v_result;
end;
$$;

grant execute on function public.guest_hub_settings_write(uuid, jsonb) to authenticated;

create or replace function public.guestbook_entry_moderate(
  p_entry_id uuid,
  p_payload jsonb default '{}'::jsonb
)
returns public.guestbook_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.guestbook_entries%rowtype;
  v_result public.guestbook_entries%rowtype;
begin
  if auth.uid() is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  select *
  into v_existing
  from public.guestbook_entries
  where id = p_entry_id;

  if not found then
    raise exception 'guestbook entry not found' using errcode = 'P0002';
  end if;

  if not public.dayof_has_site_permission(v_existing.wedding_site_id, 'photos') then
    raise exception 'insufficient photos permission' using errcode = '42501';
  end if;

  update public.guestbook_entries
  set
    is_hidden = case when p_payload ? 'is_hidden' then coalesce((p_payload->>'is_hidden')::boolean, v_existing.is_hidden) else v_existing.is_hidden end,
    is_flagged = case when p_payload ? 'is_flagged' then coalesce((p_payload->>'is_flagged')::boolean, v_existing.is_flagged) else v_existing.is_flagged end,
    moderated_at = now()
  where id = p_entry_id
  returning * into v_result;

  return v_result;
end;
$$;

grant execute on function public.guestbook_entry_moderate(uuid, jsonb) to authenticated;

create or replace function public.photo_upload_bucket_move(
  p_wedding_site_id uuid,
  p_upload_id uuid,
  p_photo_album_id uuid
)
returns public.photo_uploads
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result public.photo_uploads%rowtype;
begin
  if auth.uid() is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  if not public.dayof_has_site_permission(p_wedding_site_id, 'photos') then
    raise exception 'insufficient photos permission' using errcode = '42501';
  end if;

  update public.photo_uploads
  set photo_album_id = p_photo_album_id
  where id = p_upload_id
    and wedding_site_id = p_wedding_site_id
  returning * into v_result;

  if not found then
    raise exception 'photo upload not found' using errcode = 'P0002';
  end if;

  return v_result;
end;
$$;

grant execute on function public.photo_upload_bucket_move(uuid, uuid, uuid) to authenticated;

create or replace function public.photo_ai_bucket_correction_write(
  p_wedding_site_id uuid,
  p_payload jsonb default '{}'::jsonb
)
returns public.photo_ai_bucket_corrections
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_result public.photo_ai_bucket_corrections%rowtype;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  if not public.dayof_has_site_permission(p_wedding_site_id, 'photos') then
    raise exception 'insufficient photos permission' using errcode = '42501';
  end if;

  insert into public.photo_ai_bucket_corrections (
    wedding_site_id,
    upload_id,
    previous_bucket_id,
    suggested_bucket_id,
    chosen_bucket_id,
    action,
    confidence,
    reason,
    metadata,
    created_by
  )
  values (
    p_wedding_site_id,
    nullif(p_payload->>'upload_id', '')::uuid,
    nullif(p_payload->>'previous_bucket_id', '')::uuid,
    nullif(p_payload->>'suggested_bucket_id', '')::uuid,
    nullif(p_payload->>'chosen_bucket_id', '')::uuid,
    coalesce(nullif(btrim(coalesce(p_payload->>'action', '')), ''), 'accepted'),
    nullif(p_payload->>'confidence', '')::numeric,
    coalesce(nullif(btrim(coalesce(p_payload->>'reason', '')), ''), ''),
    coalesce(p_payload->'metadata', '{}'::jsonb),
    v_user_id
  )
  returning * into v_result;

  return v_result;
end;
$$;

grant execute on function public.photo_ai_bucket_correction_write(uuid, jsonb) to authenticated;

create or replace function public.event_rsvp_delete_many(
  p_event_invitation_ids uuid[] default null
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

  if coalesce(array_length(p_event_invitation_ids, 1), 0) = 0 then
    return 0;
  end if;

  delete from public.event_rsvps
  where event_invitation_id = any(p_event_invitation_ids);

  get diagnostics v_count = row_count;
  return coalesce(v_count, 0);
exception
  when undefined_table then
    return 0;
end;
$$;

grant execute on function public.event_rsvp_delete_many(uuid[]) to authenticated;

create or replace function public.event_rsvp_upsert_many(
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

  if coalesce(jsonb_typeof(p_rows), 'null') <> 'array' then
    raise exception 'rows must be a json array' using errcode = '22023';
  end if;

  insert into public.event_rsvps (
    event_invitation_id,
    attending,
    dietary_restrictions,
    notes,
    responded_at
  )
  select
    row.event_invitation_id,
    row.attending,
    row.dietary_restrictions,
    row.notes,
    row.responded_at
  from jsonb_to_recordset(p_rows) as row(
    event_invitation_id uuid,
    attending boolean,
    dietary_restrictions text,
    notes text,
    responded_at timestamptz
  )
  where row.event_invitation_id is not null
    and row.attending is not null
  on conflict (event_invitation_id)
  do update set
    attending = excluded.attending,
    dietary_restrictions = excluded.dietary_restrictions,
    notes = excluded.notes,
    responded_at = excluded.responded_at;

  get diagnostics v_count = row_count;
  return coalesce(v_count, 0);
exception
  when undefined_table then
    return 0;
end;
$$;

grant execute on function public.event_rsvp_upsert_many(jsonb) to authenticated;

create or replace function public.guest_dashboard_rsvp_conflict_resolve_many(
  p_conflict_ids uuid[] default null,
  p_resolved_at timestamptz default null
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

  if coalesce(array_length(p_conflict_ids, 1), 0) = 0 then
    return 0;
  end if;

  select min(wedding_site_id)
  into v_site_id
  from public.rsvp_conflicts
  where id = any(p_conflict_ids);

  if v_site_id is null then
    return 0;
  end if;

  if exists (
    select 1
    from public.rsvp_conflicts
    where id = any(p_conflict_ids)
      and wedding_site_id <> v_site_id
  ) then
    raise exception 'conflicts must share one wedding site' using errcode = '42501';
  end if;

  if not public.dayof_has_site_permission(v_site_id, 'guests') then
    raise exception 'insufficient guests permission' using errcode = '42501';
  end if;

  update public.rsvp_conflicts
  set
    resolved = true,
    resolved_at = coalesce(p_resolved_at, now())
  where id = any(p_conflict_ids);

  get diagnostics v_count = row_count;
  return coalesce(v_count, 0);
end;
$$;

grant execute on function public.guest_dashboard_rsvp_conflict_resolve_many(uuid[], timestamptz) to authenticated;

create or replace function public.vendor_profile_write(
  p_payload jsonb default '{}'::jsonb
)
returns public.vendor_profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_slug text;
  v_attempt integer := 0;
  v_result public.vendor_profiles%rowtype;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  loop
    v_attempt := v_attempt + 1;
    v_slug := left(
      coalesce(nullif(btrim(coalesce(p_payload->>'slug', '')), ''), 'vendor-' || floor(extract(epoch from now()) * 1000)::bigint::text)
      || case when v_attempt = 1 then '' else '-' || (v_attempt + 1)::text end,
      72
    );

    begin
      insert into public.vendor_profiles (
        slug,
        vendor_name,
        descriptor,
        about,
        hero_image_url,
        image_urls,
        instagram_url,
        website_url,
        contact_email,
        source_payload,
        created_by
      )
      values (
        v_slug,
        coalesce(nullif(btrim(coalesce(p_payload->>'vendor_name', '')), ''), ''),
        nullif(btrim(coalesce(p_payload->>'descriptor', '')), ''),
        coalesce(nullif(btrim(coalesce(p_payload->>'about', '')), ''), ''),
        nullif(btrim(coalesce(p_payload->>'hero_image_url', '')), ''),
        coalesce(array(select jsonb_array_elements_text(coalesce(p_payload->'image_urls', '[]'::jsonb))), array[]::text[]),
        nullif(btrim(coalesce(p_payload->>'instagram_url', '')), ''),
        nullif(btrim(coalesce(p_payload->>'website_url', '')), ''),
        nullif(btrim(coalesce(p_payload->>'contact_email', '')), ''),
        coalesce(p_payload->'source_payload', '{}'::jsonb),
        v_user_id
      )
      returning * into v_result;

      return v_result;
    exception
      when unique_violation then
        if v_attempt >= 8 then
          raise exception 'Could not find an available vendor page URL. Try a slightly different vendor name.';
        end if;
    end;
  end loop;
end;
$$;

grant execute on function public.vendor_profile_write(jsonb) to authenticated;
