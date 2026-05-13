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
      workflow_status = case when p_payload ? 'workflow_status' then coalesce(nullif(btrim(coalesce(p_payload->>'workflow_status', '')), ''), v_existing.workflow_status) else v_existing.workflow_status end,
      launch_state = case when p_payload ? 'launch_state' then coalesce(nullif(btrim(coalesce(p_payload->>'launch_state', '')), ''), v_existing.launch_state) else v_existing.launch_state end,
      legal_basis = case when p_payload ? 'legal_basis' then coalesce(nullif(btrim(coalesce(p_payload->>'legal_basis', '')), ''), v_existing.legal_basis) else v_existing.legal_basis end,
      current_first_name = case when p_payload ? 'current_first_name' then coalesce(nullif(btrim(coalesce(p_payload->>'current_first_name', '')), ''), '') else v_existing.current_first_name end,
      current_middle_name = case when p_payload ? 'current_middle_name' then nullif(btrim(coalesce(p_payload->>'current_middle_name', '')), '') else v_existing.current_middle_name end,
      current_last_name = case when p_payload ? 'current_last_name' then coalesce(nullif(btrim(coalesce(p_payload->>'current_last_name', '')), ''), '') else v_existing.current_last_name end,
      target_first_name = case when p_payload ? 'target_first_name' then coalesce(nullif(btrim(coalesce(p_payload->>'target_first_name', '')), ''), '') else v_existing.target_first_name end,
      target_middle_name = case when p_payload ? 'target_middle_name' then nullif(btrim(coalesce(p_payload->>'target_middle_name', '')), '') else v_existing.target_middle_name end,
      target_last_name = case when p_payload ? 'target_last_name' then coalesce(nullif(btrim(coalesce(p_payload->>'target_last_name', '')), ''), '') else v_existing.target_last_name end,
      email = case when p_payload ? 'email' then nullif(btrim(coalesce(p_payload->>'email', '')), '') else v_existing.email end,
      phone_last4 = case when p_payload ? 'phone_last4' then nullif(btrim(coalesce(p_payload->>'phone_last4', '')), '') else v_existing.phone_last4 end,
      county_residence = case when p_payload ? 'county_residence' then nullif(btrim(coalesce(p_payload->>'county_residence', '')), '') else v_existing.county_residence end,
      marriage_state = case when p_payload ? 'marriage_state' then nullif(btrim(coalesce(p_payload->>'marriage_state', '')), '') else v_existing.marriage_state end,
      marriage_date = case when p_payload ? 'marriage_date' then nullif(p_payload->>'marriage_date', '')::date else v_existing.marriage_date end,
      urgency_level = case when p_payload ? 'urgency_level' then coalesce(nullif(btrim(coalesce(p_payload->>'urgency_level', '')), ''), v_existing.urgency_level) else v_existing.urgency_level end,
      has_us_passport = case when p_payload ? 'has_us_passport' then coalesce((p_payload->>'has_us_passport')::boolean, v_existing.has_us_passport) else v_existing.has_us_passport end,
      passport_needs_update = case when p_payload ? 'passport_needs_update' then coalesce((p_payload->>'passport_needs_update')::boolean, v_existing.passport_needs_update) else v_existing.passport_needs_update end,
      has_real_id_license = case when p_payload ? 'has_real_id_license' then coalesce((p_payload->>'has_real_id_license')::boolean, v_existing.has_real_id_license) else v_existing.has_real_id_license end,
      is_us_citizen = case when p_payload ? 'is_us_citizen' then coalesce((p_payload->>'is_us_citizen')::boolean, v_existing.is_us_citizen) else v_existing.is_us_citizen end,
      employment_status = case when p_payload ? 'employment_status' then coalesce(nullif(btrim(coalesce(p_payload->>'employment_status', '')), ''), v_existing.employment_status) else v_existing.employment_status end,
      change_reasons = case
        when p_payload ? 'change_reasons' and jsonb_typeof(coalesce(p_payload->'change_reasons', '[]'::jsonb)) = 'array'
          then coalesce(p_payload->'change_reasons', v_existing.change_reasons)
        else v_existing.change_reasons
      end,
      structured_intake = case
        when p_payload ? 'structured_intake' and jsonb_typeof(coalesce(p_payload->'structured_intake', '{}'::jsonb)) = 'object'
          then coalesce(p_payload->'structured_intake', v_existing.structured_intake)
        else v_existing.structured_intake
      end,
      latest_plan_summary = case when p_payload ? 'latest_plan_summary' then p_payload->'latest_plan_summary' else v_existing.latest_plan_summary end,
      updated_at = now()
    where id = v_existing.id
    returning * into v_result;

    return v_result;
  end if;

  insert into public.name_change_cases (
    wedding_site_id,
    workflow_status,
    launch_state,
    legal_basis,
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
    urgency_level,
    has_us_passport,
    passport_needs_update,
    has_real_id_license,
    is_us_citizen,
    employment_status,
    change_reasons,
    structured_intake,
    latest_plan_summary
  )
  values (
    p_wedding_site_id,
    coalesce(nullif(btrim(coalesce(p_payload->>'workflow_status', '')), ''), 'draft'),
    coalesce(nullif(btrim(coalesce(p_payload->>'launch_state', '')), ''), 'california'),
    coalesce(nullif(btrim(coalesce(p_payload->>'legal_basis', '')), ''), 'marriage'),
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
    coalesce(nullif(btrim(coalesce(p_payload->>'urgency_level', '')), ''), 'standard'),
    coalesce((p_payload->>'has_us_passport')::boolean, false),
    coalesce((p_payload->>'passport_needs_update')::boolean, false),
    coalesce((p_payload->>'has_real_id_license')::boolean, false),
    coalesce((p_payload->>'is_us_citizen')::boolean, true),
    coalesce(nullif(btrim(coalesce(p_payload->>'employment_status', '')), ''), 'prefer_not_to_say'),
    case
      when p_payload ? 'change_reasons' and jsonb_typeof(coalesce(p_payload->'change_reasons', '[]'::jsonb)) = 'array'
        then coalesce(p_payload->'change_reasons', '[]'::jsonb)
      else '[]'::jsonb
    end,
    case
      when p_payload ? 'structured_intake' and jsonb_typeof(coalesce(p_payload->'structured_intake', '{}'::jsonb)) = 'object'
        then coalesce(p_payload->'structured_intake', '{}'::jsonb)
      else '{}'::jsonb
    end,
    case when p_payload ? 'latest_plan_summary' then p_payload->'latest_plan_summary' else null end
  )
  returning * into v_result;

  return v_result;
end;
$$;

grant execute on function public.name_change_case_write(uuid, jsonb) to authenticated;
