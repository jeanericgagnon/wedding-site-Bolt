create or replace function public.name_change_case_write(
  p_wedding_site_id uuid,
  p_payload jsonb default '{}'::jsonb
)
returns public.name_change_cases
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.name_change_cases%rowtype;
  v_result public.name_change_cases%rowtype;
begin
  if auth.uid() is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  if not public.dayof_has_site_permission(p_wedding_site_id, 'planning') then
    raise exception 'insufficient planning permission' using errcode = '42501';
  end if;

  select *
  into v_existing
  from public.name_change_cases
  where wedding_site_id = p_wedding_site_id;

  if found then
    update public.name_change_cases
    set
      current_first_name = coalesce(nullif(btrim(coalesce(p_payload->>'current_first_name', '')), ''), v_existing.current_first_name),
      current_middle_name = case when p_payload ? 'current_middle_name' then nullif(btrim(coalesce(p_payload->>'current_middle_name', '')), '') else v_existing.current_middle_name end,
      current_last_name = coalesce(nullif(btrim(coalesce(p_payload->>'current_last_name', '')), ''), v_existing.current_last_name),
      target_first_name = coalesce(nullif(btrim(coalesce(p_payload->>'target_first_name', '')), ''), v_existing.target_first_name),
      target_middle_name = case when p_payload ? 'target_middle_name' then nullif(btrim(coalesce(p_payload->>'target_middle_name', '')), '') else v_existing.target_middle_name end,
      target_last_name = coalesce(nullif(btrim(coalesce(p_payload->>'target_last_name', '')), ''), v_existing.target_last_name),
      email = case when p_payload ? 'email' then nullif(btrim(coalesce(p_payload->>'email', '')), '') else v_existing.email end,
      phone_last4 = case when p_payload ? 'phone_last4' then nullif(btrim(coalesce(p_payload->>'phone_last4', '')), '') else v_existing.phone_last4 end,
      county_residence = case when p_payload ? 'county_residence' then nullif(btrim(coalesce(p_payload->>'county_residence', '')), '') else v_existing.county_residence end,
      marriage_state = case when p_payload ? 'marriage_state' then nullif(btrim(coalesce(p_payload->>'marriage_state', '')), '') else v_existing.marriage_state end,
      marriage_date = case when p_payload ? 'marriage_date' then nullif(p_payload->>'marriage_date', '')::date else v_existing.marriage_date end,
      change_reasons = case when p_payload ? 'change_reasons' then coalesce(array(select jsonb_array_elements_text(p_payload->'change_reasons')), v_existing.change_reasons) else v_existing.change_reasons end,
      structured_intake = case when p_payload ? 'structured_intake' then coalesce(p_payload->'structured_intake', v_existing.structured_intake) else v_existing.structured_intake end,
      latest_plan_summary = case when p_payload ? 'latest_plan_summary' then p_payload->'latest_plan_summary' else v_existing.latest_plan_summary end,
      updated_at = now()
    where id = v_existing.id
    returning * into v_result;

    return v_result;
  end if;

  insert into public.name_change_cases (
    wedding_site_id,
    current_first_name,
    current_middle_name,
    current_last_name,
    target_first_name,
    target_middle_name,
    target_last_name,
    email,
    phone_last4,
    county_residence,
    marriage_state,
    marriage_date,
    change_reasons,
    structured_intake,
    latest_plan_summary
  )
  values (
    p_wedding_site_id,
    coalesce(nullif(btrim(coalesce(p_payload->>'current_first_name', '')), ''), ''),
    nullif(btrim(coalesce(p_payload->>'current_middle_name', '')), ''),
    coalesce(nullif(btrim(coalesce(p_payload->>'current_last_name', '')), ''), ''),
    coalesce(nullif(btrim(coalesce(p_payload->>'target_first_name', '')), ''), ''),
    nullif(btrim(coalesce(p_payload->>'target_middle_name', '')), ''),
    coalesce(nullif(btrim(coalesce(p_payload->>'target_last_name', '')), ''), ''),
    nullif(btrim(coalesce(p_payload->>'email', '')), ''),
    nullif(btrim(coalesce(p_payload->>'phone_last4', '')), ''),
    nullif(btrim(coalesce(p_payload->>'county_residence', '')), ''),
    nullif(btrim(coalesce(p_payload->>'marriage_state', '')), ''),
    nullif(p_payload->>'marriage_date', '')::date,
    coalesce(array(select jsonb_array_elements_text(p_payload->'change_reasons')), array[]::text[]),
    coalesce(p_payload->'structured_intake', '{}'::jsonb),
    case when p_payload ? 'latest_plan_summary' then p_payload->'latest_plan_summary' else null end
  )
  returning * into v_result;

  return v_result;
end;
$$;

grant execute on function public.name_change_case_write(uuid, jsonb) to authenticated;

create or replace function public.name_change_documents_replace(
  p_case_id uuid,
  p_documents jsonb default '[]'::jsonb
)
returns setof public.name_change_documents
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

  select wedding_site_id into v_site_id
  from public.name_change_cases
  where id = p_case_id;

  if not found then
    raise exception 'name change case not found' using errcode = 'P0002';
  end if;

  if not public.dayof_has_site_permission(v_site_id, 'planning') then
    raise exception 'insufficient planning permission' using errcode = '42501';
  end if;

  delete from public.name_change_documents where name_change_case_id = p_case_id;

  if jsonb_array_length(coalesce(p_documents, '[]'::jsonb)) = 0 then
    return;
  end if;

  return query
  insert into public.name_change_documents (
    name_change_case_id,
    document_kind,
    display_name,
    storage_mode,
    intake_status,
    file_name_masked,
    issuing_authority,
    issued_on,
    expires_on,
    extraction_confidence,
    extracted_snapshot
  )
  select
    p_case_id,
    coalesce(nullif(btrim(coalesce(item->>'document_kind', '')), ''), 'other'),
    coalesce(nullif(btrim(coalesce(item->>'display_name', '')), ''), ''),
    coalesce(nullif(btrim(coalesce(item->>'storage_mode', '')), ''), 'metadata_only'),
    coalesce(nullif(btrim(coalesce(item->>'intake_status', '')), ''), 'pending'),
    nullif(btrim(coalesce(item->>'file_name_masked', '')), ''),
    nullif(btrim(coalesce(item->>'issuing_authority', '')), ''),
    nullif(item->>'issued_on', '')::date,
    nullif(item->>'expires_on', '')::date,
    nullif(item->>'extraction_confidence', '')::numeric,
    case when item ? 'extracted_snapshot' then item->'extracted_snapshot' else null end
  from jsonb_array_elements(coalesce(p_documents, '[]'::jsonb)) as item
  returning *;
end;
$$;

grant execute on function public.name_change_documents_replace(uuid, jsonb) to authenticated;

create or replace function public.name_change_extracted_fields_replace(
  p_case_id uuid,
  p_fields jsonb default '[]'::jsonb
)
returns setof public.name_change_extracted_fields
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

  select wedding_site_id into v_site_id
  from public.name_change_cases
  where id = p_case_id;

  if not found then
    raise exception 'name change case not found' using errcode = 'P0002';
  end if;

  if not public.dayof_has_site_permission(v_site_id, 'planning') then
    raise exception 'insufficient planning permission' using errcode = '42501';
  end if;

  delete from public.name_change_extracted_fields where name_change_case_id = p_case_id;

  if jsonb_array_length(coalesce(p_fields, '[]'::jsonb)) = 0 then
    return;
  end if;

  return query
  insert into public.name_change_extracted_fields (
    name_change_case_id,
    document_id,
    field_key,
    field_label,
    field_value_masked,
    source_type,
    is_verified
  )
  select
    p_case_id,
    nullif(item->>'document_id', '')::uuid,
    coalesce(nullif(btrim(coalesce(item->>'field_key', '')), ''), ''),
    coalesce(nullif(btrim(coalesce(item->>'field_label', '')), ''), ''),
    nullif(btrim(coalesce(item->>'field_value_masked', '')), ''),
    coalesce(nullif(btrim(coalesce(item->>'source_type', '')), ''), 'manual'),
    coalesce((item->>'is_verified')::boolean, false)
  from jsonb_array_elements(coalesce(p_fields, '[]'::jsonb)) as item
  returning *;
end;
$$;

grant execute on function public.name_change_extracted_fields_replace(uuid, jsonb) to authenticated;

create or replace function public.name_change_plan_snapshot_write(
  p_case_id uuid,
  p_engine_version text,
  p_plan_payload jsonb
)
returns public.name_change_plan_snapshots
language plpgsql
security definer
set search_path = public
as $$
declare
  v_site_id uuid;
  v_result public.name_change_plan_snapshots%rowtype;
begin
  if auth.uid() is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  select wedding_site_id into v_site_id
  from public.name_change_cases
  where id = p_case_id;

  if not found then
    raise exception 'name change case not found' using errcode = 'P0002';
  end if;

  if not public.dayof_has_site_permission(v_site_id, 'planning') then
    raise exception 'insufficient planning permission' using errcode = '42501';
  end if;

  insert into public.name_change_plan_snapshots (
    name_change_case_id,
    engine_version,
    plan_payload
  )
  values (
    p_case_id,
    p_engine_version,
    p_plan_payload
  )
  returning * into v_result;

  return v_result;
end;
$$;

grant execute on function public.name_change_plan_snapshot_write(uuid, text, jsonb) to authenticated;

create or replace function public.name_change_reminders_replace(
  p_case_id uuid,
  p_reminders jsonb default '[]'::jsonb
)
returns setof public.name_change_reminders
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

  select wedding_site_id into v_site_id
  from public.name_change_cases
  where id = p_case_id;

  if not found then
    raise exception 'name change case not found' using errcode = 'P0002';
  end if;

  if not public.dayof_has_site_permission(v_site_id, 'planning') then
    raise exception 'insufficient planning permission' using errcode = '42501';
  end if;

  delete from public.name_change_reminders where name_change_case_id = p_case_id;

  if jsonb_array_length(coalesce(p_reminders, '[]'::jsonb)) = 0 then
    return;
  end if;

  return query
  insert into public.name_change_reminders (
    name_change_case_id,
    reminder_key,
    title,
    body,
    status,
    suggested_offset_days,
    scheduled_for,
    completed_at,
    depends_on_step_id
  )
  select
    p_case_id,
    coalesce(nullif(btrim(coalesce(item->>'reminder_key', '')), ''), ''),
    coalesce(nullif(btrim(coalesce(item->>'title', '')), ''), ''),
    coalesce(nullif(btrim(coalesce(item->>'body', '')), ''), ''),
    coalesce(nullif(btrim(coalesce(item->>'status', '')), ''), 'pending'),
    coalesce(nullif(item->>'suggested_offset_days', '')::integer, 0),
    nullif(item->>'scheduled_for', '')::timestamptz,
    nullif(item->>'completed_at', '')::timestamptz,
    nullif(btrim(coalesce(item->>'depends_on_step_id', '')), '')
  from jsonb_array_elements(coalesce(p_reminders, '[]'::jsonb)) as item
  returning *;
end;
$$;

grant execute on function public.name_change_reminders_replace(uuid, jsonb) to authenticated;
