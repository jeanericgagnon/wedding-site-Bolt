create or replace function public.section_write(
  p_site_id uuid default null,
  p_section_id text default null,
  p_payload jsonb default '{}'::jsonb
)
returns public.sections
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.sections%rowtype;
  v_result public.sections%rowtype;
  v_site_id uuid;
begin
  if auth.uid() is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  if p_section_id is null then
    v_site_id := p_site_id;
  else
    select * into v_existing from public.sections where id = p_section_id;
    if found then
      v_site_id := v_existing.site_id;
    else
      v_site_id := p_site_id;
    end if;
  end if;

  if v_site_id is null then
    raise exception 'site_id required' using errcode = '23502';
  end if;

  if not (
    public.dayof_has_site_permission(v_site_id, 'settings')
    or public.dayof_has_site_role(v_site_id, ARRAY['owner','planner','coordinator'])
  ) then
    raise exception 'insufficient section permission' using errcode = '42501';
  end if;

  insert into public.sections (
    id,
    site_id,
    type,
    variant,
    data,
    "order",
    visible,
    schema_version,
    style_overrides,
    bindings,
    created_at,
    updated_at
  )
  values (
    coalesce(p_section_id, p_payload->>'id'),
    v_site_id,
    coalesce(nullif(p_payload->>'type', ''), v_existing.type),
    coalesce(nullif(p_payload->>'variant', ''), v_existing.variant, 'default'),
    coalesce(p_payload->'data', v_existing.data, '{}'::jsonb),
    coalesce(nullif(p_payload->>'order', '')::integer, v_existing."order", 0),
    coalesce((p_payload->>'visible')::boolean, v_existing.visible, true),
    coalesce(nullif(p_payload->>'schema_version', '')::integer, v_existing.schema_version, 1),
    coalesce(p_payload->'style_overrides', v_existing.style_overrides, '{}'::jsonb),
    coalesce(p_payload->'bindings', v_existing.bindings, '{}'::jsonb),
    coalesce(v_existing.created_at, now()),
    now()
  )
  on conflict (id)
  do update set
    type = excluded.type,
    variant = excluded.variant,
    data = excluded.data,
    "order" = excluded."order",
    visible = excluded.visible,
    schema_version = excluded.schema_version,
    style_overrides = excluded.style_overrides,
    bindings = excluded.bindings,
    updated_at = now()
  returning * into v_result;

  return v_result;
end;
$$;

grant execute on function public.section_write(uuid, text, jsonb) to authenticated;
