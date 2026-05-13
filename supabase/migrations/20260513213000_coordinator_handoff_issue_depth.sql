create table if not exists public.coordinator_event_handoffs (
  id uuid primary key default gen_random_uuid(),
  wedding_site_id uuid not null references public.wedding_sites(id) on delete cascade,
  itinerary_event_id uuid not null references public.itinerary_events(id) on delete cascade,
  handoff_status text not null default 'ready' check (handoff_status = any (array['ready', 'staffed', 'needs-decision', 'complete'])),
  lead_name text,
  support_name text,
  note text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (wedding_site_id, itinerary_event_id)
);

create index if not exists idx_coordinator_event_handoffs_site_event
  on public.coordinator_event_handoffs(wedding_site_id, itinerary_event_id);

alter table public.coordinator_event_handoffs enable row level security;

drop policy if exists "coordinator_event_handoffs_read" on public.coordinator_event_handoffs;
create policy "coordinator_event_handoffs_read"
on public.coordinator_event_handoffs for select
using (
  public.dayof_has_site_role(wedding_site_id, ARRAY['owner','planner','coordinator','viewer'])
  or public.dayof_has_site_permission(wedding_site_id, 'coordinator')
  or public.dayof_has_site_permission(wedding_site_id, 'timeline')
);

drop policy if exists "coordinator_event_handoffs_write" on public.coordinator_event_handoffs;
create policy "coordinator_event_handoffs_write"
on public.coordinator_event_handoffs for all
using (
  public.dayof_has_site_role(wedding_site_id, ARRAY['owner','planner','coordinator'])
  or public.dayof_has_site_permission(wedding_site_id, 'coordinator')
  or public.dayof_has_site_permission(wedding_site_id, 'timeline')
)
with check (
  public.dayof_has_site_role(wedding_site_id, ARRAY['owner','planner','coordinator'])
  or public.dayof_has_site_permission(wedding_site_id, 'coordinator')
  or public.dayof_has_site_permission(wedding_site_id, 'timeline')
);

grant select, insert, update, delete on public.coordinator_event_handoffs to authenticated;

create table if not exists public.coordinator_issue_logs (
  id uuid primary key default gen_random_uuid(),
  wedding_site_id uuid not null references public.wedding_sites(id) on delete cascade,
  guest_id uuid references public.guests(id) on delete set null,
  itinerary_event_id uuid references public.itinerary_events(id) on delete set null,
  issue_type text not null check (issue_type = any (array['walk-in', 'help-desk', 'manager-decision', 'seat-change', 'substitute-attendee', 'plus-one-swap'])),
  status text not null default 'open' check (status = any (array['open', 'working', 'resolved'])),
  title text not null,
  note text,
  assigned_to text,
  replacement_name text,
  replacement_party_size integer,
  table_id uuid references public.seating_tables(id) on delete set null,
  table_name text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_coordinator_issue_logs_site_updated
  on public.coordinator_issue_logs(wedding_site_id, updated_at desc);

create index if not exists idx_coordinator_issue_logs_guest_event
  on public.coordinator_issue_logs(guest_id, itinerary_event_id);

alter table public.coordinator_issue_logs enable row level security;

drop policy if exists "coordinator_issue_logs_read" on public.coordinator_issue_logs;
create policy "coordinator_issue_logs_read"
on public.coordinator_issue_logs for select
using (
  public.dayof_has_site_role(wedding_site_id, ARRAY['owner','planner','coordinator','viewer'])
  or public.dayof_has_site_permission(wedding_site_id, 'coordinator')
  or public.dayof_has_site_permission(wedding_site_id, 'seating')
);

drop policy if exists "coordinator_issue_logs_write" on public.coordinator_issue_logs;
create policy "coordinator_issue_logs_write"
on public.coordinator_issue_logs for all
using (
  public.dayof_has_site_role(wedding_site_id, ARRAY['owner','planner','coordinator'])
  or public.dayof_has_site_permission(wedding_site_id, 'coordinator')
  or public.dayof_has_site_permission(wedding_site_id, 'seating')
)
with check (
  public.dayof_has_site_role(wedding_site_id, ARRAY['owner','planner','coordinator'])
  or public.dayof_has_site_permission(wedding_site_id, 'coordinator')
  or public.dayof_has_site_permission(wedding_site_id, 'seating')
);

grant select, insert, update, delete on public.coordinator_issue_logs to authenticated;

create or replace function public.coordinator_event_handoff_write(
  p_site_id uuid,
  p_itinerary_event_id uuid,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result public.coordinator_event_handoffs%rowtype;
begin
  if auth.uid() is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  if not (
    public.dayof_has_site_role(p_site_id, ARRAY['owner','planner','coordinator'])
    or public.dayof_has_site_permission(p_site_id, 'coordinator')
    or public.dayof_has_site_permission(p_site_id, 'timeline')
  ) then
    raise exception 'insufficient coordinator handoff permission' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.itinerary_events
    where id = p_itinerary_event_id
      and wedding_site_id = p_site_id
  ) then
    raise exception 'itinerary event not found for site' using errcode = 'P0002';
  end if;

  insert into public.coordinator_event_handoffs (
    wedding_site_id,
    itinerary_event_id,
    handoff_status,
    lead_name,
    support_name,
    note,
    updated_by,
    updated_at
  )
  values (
    p_site_id,
    p_itinerary_event_id,
    coalesce(nullif(btrim(p_payload->>'handoff_status'), ''), 'ready'),
    nullif(btrim(coalesce(p_payload->>'lead_name', '')), ''),
    nullif(btrim(coalesce(p_payload->>'support_name', '')), ''),
    nullif(btrim(coalesce(p_payload->>'note', '')), ''),
    auth.uid(),
    now()
  )
  on conflict (wedding_site_id, itinerary_event_id)
  do update set
    handoff_status = coalesce(nullif(btrim(p_payload->>'handoff_status'), ''), public.coordinator_event_handoffs.handoff_status),
    lead_name = case when p_payload ? 'lead_name' then nullif(btrim(coalesce(p_payload->>'lead_name', '')), '') else public.coordinator_event_handoffs.lead_name end,
    support_name = case when p_payload ? 'support_name' then nullif(btrim(coalesce(p_payload->>'support_name', '')), '') else public.coordinator_event_handoffs.support_name end,
    note = case when p_payload ? 'note' then nullif(btrim(coalesce(p_payload->>'note', '')), '') else public.coordinator_event_handoffs.note end,
    updated_by = auth.uid(),
    updated_at = now()
  returning * into v_result;

  return to_jsonb(v_result);
end;
$$;

grant execute on function public.coordinator_event_handoff_write(uuid, uuid, jsonb) to authenticated;

create or replace function public.coordinator_issue_log_write(
  p_site_id uuid default null,
  p_issue_id uuid default null,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.coordinator_issue_logs%rowtype;
  v_result public.coordinator_issue_logs%rowtype;
  v_site_id uuid;
  v_table_name text;
begin
  if auth.uid() is null then
    raise exception 'auth required' using errcode = '42501';
  end if;

  if p_issue_id is null then
    if p_site_id is null then
      raise exception 'site id required' using errcode = '23502';
    end if;
    v_site_id := p_site_id;
  else
    select * into v_existing
    from public.coordinator_issue_logs
    where id = p_issue_id;

    if not found then
      raise exception 'issue log not found' using errcode = 'P0002';
    end if;

    v_site_id := v_existing.wedding_site_id;
  end if;

  if not (
    public.dayof_has_site_role(v_site_id, ARRAY['owner','planner','coordinator'])
    or public.dayof_has_site_permission(v_site_id, 'coordinator')
    or public.dayof_has_site_permission(v_site_id, 'seating')
  ) then
    raise exception 'insufficient coordinator issue permission' using errcode = '42501';
  end if;

  if (p_payload ? 'guest_id') and nullif(p_payload->>'guest_id', '') is not null then
    if not exists (
      select 1
      from public.guests
      where id = (p_payload->>'guest_id')::uuid
        and wedding_site_id = v_site_id
    ) then
      raise exception 'guest not found for site' using errcode = 'P0002';
    end if;
  end if;

  if (p_payload ? 'itinerary_event_id') and nullif(p_payload->>'itinerary_event_id', '') is not null then
    if not exists (
      select 1
      from public.itinerary_events
      where id = (p_payload->>'itinerary_event_id')::uuid
        and wedding_site_id = v_site_id
    ) then
      raise exception 'itinerary event not found for site' using errcode = 'P0002';
    end if;
  end if;

  if (p_payload ? 'table_id') and nullif(p_payload->>'table_id', '') is not null then
    select st.table_name
    into v_table_name
    from public.seating_tables st
    join public.seating_events se on se.id = st.seating_event_id
    where st.id = (p_payload->>'table_id')::uuid
      and se.wedding_site_id = v_site_id;

    if v_table_name is null then
      raise exception 'seating table not found for site' using errcode = 'P0002';
    end if;
  else
    v_table_name := nullif(btrim(coalesce(p_payload->>'table_name', '')), '');
  end if;

  if p_issue_id is null then
    insert into public.coordinator_issue_logs (
      wedding_site_id,
      guest_id,
      itinerary_event_id,
      issue_type,
      status,
      title,
      note,
      assigned_to,
      replacement_name,
      replacement_party_size,
      table_id,
      table_name,
      metadata,
      created_by,
      updated_by,
      updated_at
    )
    values (
      v_site_id,
      nullif(p_payload->>'guest_id', '')::uuid,
      nullif(p_payload->>'itinerary_event_id', '')::uuid,
      coalesce(nullif(btrim(p_payload->>'issue_type'), ''), 'manager-decision'),
      coalesce(nullif(btrim(p_payload->>'status'), ''), 'open'),
      coalesce(nullif(btrim(p_payload->>'title'), ''), 'Door issue'),
      nullif(btrim(coalesce(p_payload->>'note', '')), ''),
      nullif(btrim(coalesce(p_payload->>'assigned_to', '')), ''),
      nullif(btrim(coalesce(p_payload->>'replacement_name', '')), ''),
      nullif(p_payload->>'replacement_party_size', '')::integer,
      nullif(p_payload->>'table_id', '')::uuid,
      v_table_name,
      coalesce(p_payload->'metadata', '{}'::jsonb),
      auth.uid(),
      auth.uid(),
      now()
    )
    returning * into v_result;

    return to_jsonb(v_result);
  end if;

  update public.coordinator_issue_logs
  set
    guest_id = case when p_payload ? 'guest_id' then nullif(p_payload->>'guest_id', '')::uuid else v_existing.guest_id end,
    itinerary_event_id = case when p_payload ? 'itinerary_event_id' then nullif(p_payload->>'itinerary_event_id', '')::uuid else v_existing.itinerary_event_id end,
    issue_type = case when p_payload ? 'issue_type' then coalesce(nullif(btrim(p_payload->>'issue_type'), ''), v_existing.issue_type) else v_existing.issue_type end,
    status = case when p_payload ? 'status' then coalesce(nullif(btrim(p_payload->>'status'), ''), v_existing.status) else v_existing.status end,
    title = case when p_payload ? 'title' then coalesce(nullif(btrim(p_payload->>'title'), ''), v_existing.title) else v_existing.title end,
    note = case when p_payload ? 'note' then nullif(btrim(coalesce(p_payload->>'note', '')), '') else v_existing.note end,
    assigned_to = case when p_payload ? 'assigned_to' then nullif(btrim(coalesce(p_payload->>'assigned_to', '')), '') else v_existing.assigned_to end,
    replacement_name = case when p_payload ? 'replacement_name' then nullif(btrim(coalesce(p_payload->>'replacement_name', '')), '') else v_existing.replacement_name end,
    replacement_party_size = case when p_payload ? 'replacement_party_size' then nullif(p_payload->>'replacement_party_size', '')::integer else v_existing.replacement_party_size end,
    table_id = case when p_payload ? 'table_id' then nullif(p_payload->>'table_id', '')::uuid else v_existing.table_id end,
    table_name = case when p_payload ? 'table_id' then v_table_name else case when p_payload ? 'table_name' then nullif(btrim(coalesce(p_payload->>'table_name', '')), '') else v_existing.table_name end end,
    metadata = case when p_payload ? 'metadata' then coalesce(p_payload->'metadata', v_existing.metadata) else v_existing.metadata end,
    updated_by = auth.uid(),
    updated_at = now()
  where id = p_issue_id
  returning * into v_result;

  return to_jsonb(v_result);
end;
$$;

grant execute on function public.coordinator_issue_log_write(uuid, uuid, jsonb) to authenticated;
