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

  if not public.dayof_has_site_role(p_wedding_site_id, array['owner']) then
    raise exception 'owner required' using errcode = '42501';
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

  if not public.dayof_has_site_role(v_existing.wedding_site_id, array['owner']) then
    raise exception 'owner required' using errcode = '42501';
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

create or replace function public.settings_collaborator_invite_token_read(
  p_invite_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.wedding_site_collaborator_invites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  select *
  into v_invite
  from public.wedding_site_collaborator_invites
  where id = p_invite_id;

  if not found then
    raise exception 'invite not found' using errcode = 'P0002';
  end if;

  if not public.dayof_has_site_role(v_invite.wedding_site_id, array['owner']) then
    raise exception 'owner required' using errcode = '42501';
  end if;

  if v_invite.status <> 'pending' then
    return '';
  end if;

  return coalesce(v_invite.invite_token, '');
end;
$$;

grant execute on function public.settings_collaborator_invite_token_read(uuid) to authenticated;

create or replace function public.settings_collaborator_invite_clear_test_fixtures(
  p_wedding_site_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  if not public.dayof_has_site_role(p_wedding_site_id, array['owner']) then
    raise exception 'owner required' using errcode = '42501';
  end if;

  with deleted_rows as (
    delete from public.wedding_site_collaborator_invites
    where wedding_site_id = p_wedding_site_id
      and status = 'pending'
      and (
        invite_email ~* '(test|qa|demo|fake|seed|staging|temp|example)'
        or coalesce(invite_name, '') ~* '(test|qa|demo|fake|seed|staging|temp|example)'
      )
    returning id
  )
  select count(*)
  into v_deleted_count
  from deleted_rows;

  return coalesce(v_deleted_count, 0);
end;
$$;

grant execute on function public.settings_collaborator_invite_clear_test_fixtures(uuid) to authenticated;

-- One-time global cleanup for pending collaborator test fixtures in production.
delete from public.wedding_site_collaborator_invites
where status = 'pending'
  and (
    invite_email ~* '(test|qa|demo|fake|seed|staging|temp|example)'
    or coalesce(invite_name, '') ~* '(test|qa|demo|fake|seed|staging|temp|example)'
  );
