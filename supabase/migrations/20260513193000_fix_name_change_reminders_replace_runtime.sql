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
    label,
    reason,
    depends_on_step_id,
    suggested_offset_days,
    urgency,
    status
  )
  select
    p_case_id,
    coalesce(nullif(btrim(coalesce(item->>'reminder_key', '')), ''), ''),
    coalesce(nullif(btrim(coalesce(item->>'label', '')), ''), ''),
    coalesce(nullif(btrim(coalesce(item->>'reason', '')), ''), ''),
    coalesce(nullif(btrim(coalesce(item->>'depends_on_step_id', '')), ''), ''),
    coalesce(nullif(item->>'suggested_offset_days', '')::integer, 0),
    coalesce(nullif(btrim(coalesce(item->>'urgency', '')), ''), 'medium'),
    coalesce(nullif(btrim(coalesce(item->>'status', '')), ''), 'pending')
  from jsonb_array_elements(coalesce(p_reminders, '[]'::jsonb)) as item
  returning *;
end;
$$;

grant execute on function public.name_change_reminders_replace(uuid, jsonb) to authenticated;
