create or replace function public.wedding_site_settings_patch(
  p_wedding_site_id uuid,
  p_patch jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.wedding_sites%rowtype;
  v_result public.wedding_sites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  if not public.dayof_has_site_permission(p_wedding_site_id, 'settings') then
    raise exception 'insufficient settings permission' using errcode = '42501';
  end if;

  select *
  into v_existing
  from public.wedding_sites
  where id = p_wedding_site_id;

  if not found then
    raise exception 'wedding site not found' using errcode = 'P0002';
  end if;

  update public.wedding_sites
  set
    couple_name_1 = case when p_patch ? 'couple_name_1' then nullif(btrim(coalesce(p_patch->>'couple_name_1', '')), '') else v_existing.couple_name_1 end,
    couple_name_2 = case when p_patch ? 'couple_name_2' then nullif(btrim(coalesce(p_patch->>'couple_name_2', '')), '') else v_existing.couple_name_2 end,
    wedding_date = case when p_patch ? 'wedding_date' then nullif(p_patch->>'wedding_date', '')::date else v_existing.wedding_date end,
    venue_name = case when p_patch ? 'venue_name' then nullif(btrim(coalesce(p_patch->>'venue_name', '')), '') else v_existing.venue_name end,
    wedding_location = case when p_patch ? 'wedding_location' then nullif(btrim(coalesce(p_patch->>'wedding_location', '')), '') else v_existing.wedding_location end,
    active_template_id = case when p_patch ? 'active_template_id' then nullif(p_patch->>'active_template_id', '')::uuid else v_existing.active_template_id end,
    site_slug = case when p_patch ? 'site_slug' then nullif(btrim(coalesce(p_patch->>'site_slug', '')), '') else v_existing.site_slug end,
    rsvp_custom_questions = case when p_patch ? 'rsvp_custom_questions' then p_patch->'rsvp_custom_questions' else v_existing.rsvp_custom_questions end,
    rsvp_meal_config = case when p_patch ? 'rsvp_meal_config' then p_patch->'rsvp_meal_config' else v_existing.rsvp_meal_config end,
    privacy_mode = case when p_patch ? 'privacy_mode' then nullif(btrim(coalesce(p_patch->>'privacy_mode', '')), '') else v_existing.privacy_mode end,
    hide_from_search = case when p_patch ? 'hide_from_search' then coalesce((p_patch->>'hide_from_search')::boolean, v_existing.hide_from_search) else v_existing.hide_from_search end,
    guest_access_token = case when p_patch ? 'guest_access_token' then nullif(btrim(coalesce(p_patch->>'guest_access_token', '')), '') else v_existing.guest_access_token end,
    default_language = case when p_patch ? 'default_language' then nullif(btrim(coalesce(p_patch->>'default_language', '')), '') else v_existing.default_language end,
    notification_prefs = case when p_patch ? 'notification_prefs' then p_patch->'notification_prefs' else v_existing.notification_prefs end,
    music_playlist_url = case when p_patch ? 'music_playlist_url' then nullif(btrim(coalesce(p_patch->>'music_playlist_url', '')), '') else v_existing.music_playlist_url end,
    layout_config = case when p_patch ? 'layout_config' then p_patch->'layout_config' else v_existing.layout_config end,
    site_json = case when p_patch ? 'site_json' then p_patch->'site_json' else v_existing.site_json end,
    wedding_data = case when p_patch ? 'wedding_data' then p_patch->'wedding_data' else v_existing.wedding_data end,
    onboarding_answers = case when p_patch ? 'onboarding_answers' then p_patch->'onboarding_answers' else v_existing.onboarding_answers end,
    updated_at = now()
  where id = p_wedding_site_id
  returning * into v_result;

  return to_jsonb(v_result);
end;
$$;

grant execute on function public.wedding_site_settings_patch(uuid, jsonb) to authenticated;

create or replace function public.settings_collaborator_invite_write(
  p_wedding_site_id uuid,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result public.wedding_site_collaborator_invites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  if not public.dayof_has_site_permission(p_wedding_site_id, 'settings') then
    raise exception 'insufficient settings permission' using errcode = '42501';
  end if;

  insert into public.wedding_site_collaborator_invites (
    wedding_site_id,
    invite_email,
    invite_name,
    role,
    status,
    invite_token,
    invited_by,
    permissions
  )
  values (
    p_wedding_site_id,
    lower(coalesce(nullif(btrim(p_payload->>'invite_email'), ''), '')),
    nullif(btrim(coalesce(p_payload->>'invite_name', '')), ''),
    coalesce(nullif(btrim(p_payload->>'role'), ''), 'planner'),
    coalesce(nullif(btrim(p_payload->>'status'), ''), 'pending'),
    nullif(btrim(coalesce(p_payload->>'invite_token', '')), ''),
    nullif(p_payload->>'invited_by', '')::uuid,
    coalesce(p_payload->'permissions', '[]'::jsonb)
  )
  returning * into v_result;

  return to_jsonb(v_result);
end;
$$;

grant execute on function public.settings_collaborator_invite_write(uuid, jsonb) to authenticated;

create or replace function public.settings_collaborator_invite_revoke(
  p_invite_id uuid,
  p_revoked_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.wedding_site_collaborator_invites%rowtype;
  v_result public.wedding_site_collaborator_invites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  select *
  into v_existing
  from public.wedding_site_collaborator_invites
  where id = p_invite_id;

  if not found then
    raise exception 'invite not found' using errcode = 'P0002';
  end if;

  if not public.dayof_has_site_permission(v_existing.wedding_site_id, 'settings') then
    raise exception 'insufficient settings permission' using errcode = '42501';
  end if;

  update public.wedding_site_collaborator_invites
  set
    status = 'revoked',
    revoked_at = p_revoked_at
  where id = p_invite_id
  returning * into v_result;

  return to_jsonb(v_result);
end;
$$;

grant execute on function public.settings_collaborator_invite_revoke(uuid, timestamptz) to authenticated;

create or replace function public.overview_interactive_suggestion_hide(
  p_suggestion_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.interactive_suggestions%rowtype;
  v_site_id uuid;
  v_result public.interactive_suggestions%rowtype;
begin
  if auth.uid() is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  select *
  into v_existing
  from public.interactive_suggestions
  where id = p_suggestion_id;

  if not found then
    raise exception 'interactive suggestion not found' using errcode = 'P0002';
  end if;

  select id
  into v_site_id
  from public.wedding_sites
  where site_slug = v_existing.site_slug
  limit 1;

  if v_site_id is null then
    raise exception 'wedding site not found for suggestion' using errcode = 'P0002';
  end if;

  if not public.dayof_has_site_permission(v_site_id, 'settings') then
    raise exception 'insufficient settings permission' using errcode = '42501';
  end if;

  update public.interactive_suggestions
  set is_hidden = true
  where id = p_suggestion_id
  returning * into v_result;

  return to_jsonb(v_result);
end;
$$;

grant execute on function public.overview_interactive_suggestion_hide(uuid) to authenticated;
