create or replace function public.builder_media_asset_write(
  p_wedding_site_id uuid default null,
  p_asset_id uuid default null,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.builder_media_assets%rowtype;
  v_saved public.builder_media_assets%rowtype;
begin
  if auth.uid() is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  if p_asset_id is null then
    if p_wedding_site_id is null then
      raise exception 'wedding_site_id required' using errcode = '23502';
    end if;

    if not public.dayof_has_site_permission(p_wedding_site_id, 'photos') then
      raise exception 'insufficient photos permission' using errcode = '42501';
    end if;

    insert into public.builder_media_assets (
      wedding_site_id,
      filename,
      original_filename,
      mime_type,
      asset_type,
      status,
      url,
      thumbnail_url,
      width,
      height,
      size_bytes,
      alt_text,
      caption,
      tags,
      attached_section_ids
    )
    values (
      p_wedding_site_id,
      nullif(trim(p_payload->>'filename'), ''),
      nullif(trim(p_payload->>'original_filename'), ''),
      nullif(trim(p_payload->>'mime_type'), ''),
      coalesce(nullif(trim(p_payload->>'asset_type'), ''), 'image'),
      coalesce(nullif(trim(p_payload->>'status'), ''), 'ready'),
      nullif(trim(p_payload->>'url'), ''),
      nullif(trim(p_payload->>'thumbnail_url'), ''),
      case when p_payload ? 'width' then (p_payload->>'width')::integer else null end,
      case when p_payload ? 'height' then (p_payload->>'height')::integer else null end,
      coalesce(case when p_payload ? 'size_bytes' then (p_payload->>'size_bytes')::bigint else null end, 0),
      nullif(trim(p_payload->>'alt_text'), ''),
      nullif(trim(p_payload->>'caption'), ''),
      coalesce(array(select jsonb_array_elements_text(coalesce(p_payload->'tags', '[]'::jsonb))), array[]::text[]),
      coalesce(array(select jsonb_array_elements_text(coalesce(p_payload->'attached_section_ids', '[]'::jsonb))), array[]::text[])
    )
    returning * into v_saved;

    return to_jsonb(v_saved);
  end if;

  select *
  into v_existing
  from public.builder_media_assets
  where id = p_asset_id;

  if not found then
    raise exception 'builder media asset not found' using errcode = 'P0002';
  end if;

  if not public.dayof_has_site_permission(v_existing.wedding_site_id, 'photos') then
    raise exception 'insufficient photos permission' using errcode = '42501';
  end if;

  update public.builder_media_assets
  set
    filename = case when p_payload ? 'filename' then nullif(trim(p_payload->>'filename'), '') else v_existing.filename end,
    original_filename = case when p_payload ? 'original_filename' then nullif(trim(p_payload->>'original_filename'), '') else v_existing.original_filename end,
    mime_type = case when p_payload ? 'mime_type' then nullif(trim(p_payload->>'mime_type'), '') else v_existing.mime_type end,
    asset_type = case when p_payload ? 'asset_type' then coalesce(nullif(trim(p_payload->>'asset_type'), ''), v_existing.asset_type) else v_existing.asset_type end,
    status = case when p_payload ? 'status' then coalesce(nullif(trim(p_payload->>'status'), ''), v_existing.status) else v_existing.status end,
    url = case when p_payload ? 'url' then nullif(trim(p_payload->>'url'), '') else v_existing.url end,
    thumbnail_url = case when p_payload ? 'thumbnail_url' then nullif(trim(p_payload->>'thumbnail_url'), '') else v_existing.thumbnail_url end,
    width = case when p_payload ? 'width' then (p_payload->>'width')::integer else v_existing.width end,
    height = case when p_payload ? 'height' then (p_payload->>'height')::integer else v_existing.height end,
    size_bytes = case when p_payload ? 'size_bytes' then coalesce((p_payload->>'size_bytes')::bigint, v_existing.size_bytes) else v_existing.size_bytes end,
    alt_text = case when p_payload ? 'alt_text' then nullif(trim(p_payload->>'alt_text'), '') else v_existing.alt_text end,
    caption = case when p_payload ? 'caption' then nullif(trim(p_payload->>'caption'), '') else v_existing.caption end,
    tags = case when p_payload ? 'tags' then coalesce(array(select jsonb_array_elements_text(coalesce(p_payload->'tags', '[]'::jsonb))), array[]::text[]) else v_existing.tags end,
    attached_section_ids = case when p_payload ? 'attached_section_ids' then coalesce(array(select jsonb_array_elements_text(coalesce(p_payload->'attached_section_ids', '[]'::jsonb))), array[]::text[]) else v_existing.attached_section_ids end
  where id = p_asset_id
  returning * into v_saved;

  return to_jsonb(v_saved);
end;
$$;

grant execute on function public.builder_media_asset_write(uuid, uuid, jsonb) to authenticated;

create or replace function public.builder_media_asset_delete(
  p_asset_id uuid
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
  from public.builder_media_assets
  where id = p_asset_id;

  if not found then
    raise exception 'builder media asset not found' using errcode = 'P0002';
  end if;

  if not public.dayof_has_site_permission(v_site_id, 'photos') then
    raise exception 'insufficient photos permission' using errcode = '42501';
  end if;

  delete from public.builder_media_assets
  where id = p_asset_id;

  return p_asset_id;
end;
$$;

grant execute on function public.builder_media_asset_delete(uuid) to authenticated;

create or replace function public.builder_media_asset_attach_section(
  p_asset_id uuid,
  p_section_id text
)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.builder_media_assets%rowtype;
  v_updated text[];
begin
  if auth.uid() is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  select *
  into v_existing
  from public.builder_media_assets
  where id = p_asset_id;

  if not found then
    raise exception 'builder media asset not found' using errcode = 'P0002';
  end if;

  if not public.dayof_has_site_permission(v_existing.wedding_site_id, 'photos') then
    raise exception 'insufficient photos permission' using errcode = '42501';
  end if;

  if coalesce(trim(p_section_id), '') = '' then
    return coalesce(v_existing.attached_section_ids, array[]::text[]);
  end if;

  if coalesce(v_existing.attached_section_ids, array[]::text[]) @> array[p_section_id]::text[] then
    return coalesce(v_existing.attached_section_ids, array[]::text[]);
  end if;

  update public.builder_media_assets
  set attached_section_ids = array_append(coalesce(v_existing.attached_section_ids, array[]::text[]), p_section_id)
  where id = p_asset_id
  returning attached_section_ids into v_updated;

  return coalesce(v_updated, array[]::text[]);
end;
$$;

grant execute on function public.builder_media_asset_attach_section(uuid, text) to authenticated;

create or replace function public.app_action_audit_log_write(
  p_wedding_site_id uuid,
  p_action_area text,
  p_action_type text,
  p_summary text,
  p_target_id text default null,
  p_target_label text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted_id uuid;
begin
  if auth.uid() is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  if not (
    public.dayof_has_site_role(p_wedding_site_id, array['owner','planner','coordinator','viewer'])
    or public.dayof_has_site_permission(p_wedding_site_id, 'settings')
    or public.dayof_has_site_permission(p_wedding_site_id, 'photos')
    or public.dayof_has_site_permission(p_wedding_site_id, 'guests')
    or public.dayof_has_site_permission(p_wedding_site_id, 'registry')
    or public.dayof_has_site_permission(p_wedding_site_id, 'messages')
    or public.dayof_has_site_permission(p_wedding_site_id, 'planning')
    or public.dayof_has_site_permission(p_wedding_site_id, 'coordinator')
  ) then
    raise exception 'insufficient audit permission' using errcode = '42501';
  end if;

  insert into public.app_action_audit_logs (
    wedding_site_id,
    actor_user_id,
    action_area,
    action_type,
    target_id,
    target_label,
    summary,
    metadata
  )
  values (
    p_wedding_site_id,
    auth.uid(),
    nullif(trim(p_action_area), ''),
    nullif(trim(p_action_type), ''),
    nullif(trim(p_target_id), ''),
    nullif(trim(p_target_label), ''),
    nullif(trim(p_summary), ''),
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_inserted_id;

  return v_inserted_id;
end;
$$;

grant execute on function public.app_action_audit_log_write(uuid, text, text, text, text, text, jsonb) to authenticated;
