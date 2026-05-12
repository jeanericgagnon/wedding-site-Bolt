create or replace function public.registry_refresh_policy_write(
  p_wedding_site_id uuid,
  p_patch jsonb default '{}'::jsonb
)
returns public.wedding_sites
language plpgsql
security definer
set search_path = public
as $$
declare
  v_site public.wedding_sites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  if not public.dayof_has_site_permission(p_wedding_site_id, 'registry') then
    raise exception 'insufficient registry permission' using errcode = '42501';
  end if;

  update public.wedding_sites
  set
    registry_monthly_refresh_cap = case when p_patch ? 'registry_monthly_refresh_cap' then (p_patch->>'registry_monthly_refresh_cap')::integer else registry_monthly_refresh_cap end,
    registry_refresh_enabled_until = case when p_patch ? 'registry_refresh_enabled_until' then nullif(p_patch->>'registry_refresh_enabled_until', '')::timestamptz else registry_refresh_enabled_until end,
    registry_auto_refresh_enabled = case when p_patch ? 'registry_auto_refresh_enabled' then (p_patch->>'registry_auto_refresh_enabled')::boolean else registry_auto_refresh_enabled end,
    registry_refresh_include_purchased = case when p_patch ? 'registry_refresh_include_purchased' then (p_patch->>'registry_refresh_include_purchased')::boolean else registry_refresh_include_purchased end,
    registry_monthly_refresh_count = case when p_patch ? 'registry_monthly_refresh_count' then (p_patch->>'registry_monthly_refresh_count')::integer else registry_monthly_refresh_count end,
    registry_monthly_refresh_month = case when p_patch ? 'registry_monthly_refresh_month' then nullif(btrim(coalesce(p_patch->>'registry_monthly_refresh_month', '')), '') else registry_monthly_refresh_month end,
    registry_refresh_policy_updated_at = case when p_patch ? 'registry_refresh_policy_updated_at' then nullif(p_patch->>'registry_refresh_policy_updated_at', '')::timestamptz else registry_refresh_policy_updated_at end,
    registry_refresh_policy_updated_by = case when p_patch ? 'registry_refresh_policy_updated_by' then nullif(btrim(coalesce(p_patch->>'registry_refresh_policy_updated_by', '')), '')::uuid else registry_refresh_policy_updated_by end
  where id = p_wedding_site_id
  returning * into v_site;

  return v_site;
end;
$$;

grant execute on function public.registry_refresh_policy_write(uuid, jsonb) to authenticated;
