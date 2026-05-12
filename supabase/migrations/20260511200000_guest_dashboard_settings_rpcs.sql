create or replace function public.guest_dashboard_persist_rsvp_config(
  p_wedding_site_id uuid,
  p_questions jsonb,
  p_meal_enabled boolean,
  p_meal_options text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.dayof_has_site_permission(p_wedding_site_id, 'guests') then
    raise exception 'Not authorized to manage guest dashboard RSVP settings';
  end if;

  update public.wedding_sites
  set
    rsvp_custom_questions = coalesce(p_questions, '[]'::jsonb),
    rsvp_meal_config = jsonb_build_object(
      'enabled', coalesce(p_meal_enabled, true),
      'options', coalesce(to_jsonb(p_meal_options), '[]'::jsonb)
    ),
    updated_at = now()
  where id = p_wedding_site_id;

  if not found then
    raise exception 'Wedding site not found';
  end if;
end;
$$;

grant execute on function public.guest_dashboard_persist_rsvp_config(uuid, jsonb, boolean, text[]) to authenticated;

create or replace function public.guest_dashboard_persist_reminder_settings(
  p_wedding_site_id uuid,
  p_reminder_cadence_days integer default null,
  p_auto_reminders_enabled boolean default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.dayof_has_site_permission(p_wedding_site_id, 'guests') then
    raise exception 'Not authorized to manage guest reminder settings';
  end if;

  if p_reminder_cadence_days is not null and p_reminder_cadence_days not in (1, 3, 7) then
    raise exception 'Invalid reminder cadence';
  end if;

  update public.wedding_sites
  set
    reminder_cadence_days = case
      when p_reminder_cadence_days is null then reminder_cadence_days
      else p_reminder_cadence_days
    end,
    auto_reminders_enabled = case
      when p_auto_reminders_enabled is null then auto_reminders_enabled
      else p_auto_reminders_enabled
    end,
    updated_at = now()
  where id = p_wedding_site_id;

  if not found then
    raise exception 'Wedding site not found';
  end if;
end;
$$;

grant execute on function public.guest_dashboard_persist_reminder_settings(uuid, integer, boolean) to authenticated;
