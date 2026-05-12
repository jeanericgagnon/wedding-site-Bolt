create or replace function public.planning_task_write(
  p_wedding_site_id uuid default null,
  p_task_id uuid default null,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.planning_tasks;
  v_result public.planning_tasks;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_task_id is null then
    if not public.dayof_has_site_permission(p_wedding_site_id, 'planning') then
      raise exception 'Not authorized to manage planning tasks';
    end if;

    insert into public.planning_tasks (
      wedding_site_id,
      title,
      description,
      category,
      due_date,
      status,
      priority,
      owner_name,
      linked_event_id,
      linked_vendor_id,
      sort_order
    )
    values (
      p_wedding_site_id,
      coalesce(nullif(btrim(p_payload->>'title'), ''), 'Untitled task'),
      nullif(btrim(coalesce(p_payload->>'description', '')), ''),
      nullif(btrim(coalesce(p_payload->>'category', '')), ''),
      nullif(p_payload->>'due_date', '')::date,
      coalesce(nullif(btrim(p_payload->>'status'), ''), 'todo'),
      coalesce(nullif(btrim(p_payload->>'priority'), ''), 'medium'),
      coalesce(nullif(btrim(p_payload->>'owner_name'), ''), ''),
      nullif(p_payload->>'linked_event_id', '')::uuid,
      nullif(p_payload->>'linked_vendor_id', '')::uuid,
      coalesce((p_payload->>'sort_order')::integer, 0)
    )
    returning * into v_result;
  else
    select *
    into v_existing
    from public.planning_tasks
    where id = p_task_id;

    if not found then
      raise exception 'Planning task not found';
    end if;

    if not public.dayof_has_site_permission(v_existing.wedding_site_id, 'planning') then
      raise exception 'Not authorized to manage planning tasks';
    end if;

    update public.planning_tasks
    set
      title = case
        when p_payload ? 'title' then coalesce(nullif(btrim(p_payload->>'title'), ''), v_existing.title)
        else v_existing.title
      end,
      description = case
        when p_payload ? 'description' then nullif(btrim(coalesce(p_payload->>'description', '')), '')
        else v_existing.description
      end,
      category = case
        when p_payload ? 'category' then nullif(btrim(coalesce(p_payload->>'category', '')), '')
        else v_existing.category
      end,
      due_date = case
        when p_payload ? 'due_date' then nullif(p_payload->>'due_date', '')::date
        else v_existing.due_date
      end,
      status = case
        when p_payload ? 'status' then coalesce(nullif(btrim(p_payload->>'status'), ''), v_existing.status)
        else v_existing.status
      end,
      priority = case
        when p_payload ? 'priority' then coalesce(nullif(btrim(p_payload->>'priority'), ''), v_existing.priority)
        else v_existing.priority
      end,
      owner_name = case
        when p_payload ? 'owner_name' then coalesce(nullif(btrim(p_payload->>'owner_name'), ''), v_existing.owner_name)
        else v_existing.owner_name
      end,
      linked_event_id = case
        when p_payload ? 'linked_event_id' then nullif(p_payload->>'linked_event_id', '')::uuid
        else v_existing.linked_event_id
      end,
      linked_vendor_id = case
        when p_payload ? 'linked_vendor_id' then nullif(p_payload->>'linked_vendor_id', '')::uuid
        else v_existing.linked_vendor_id
      end,
      sort_order = case
        when p_payload ? 'sort_order' then coalesce((p_payload->>'sort_order')::integer, v_existing.sort_order)
        else v_existing.sort_order
      end,
      updated_at = now()
    where id = p_task_id
    returning * into v_result;
  end if;

  return to_jsonb(v_result);
end;
$$;

grant execute on function public.planning_task_write(uuid, uuid, jsonb) to authenticated;

create or replace function public.planning_task_delete(
  p_task_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_site_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select wedding_site_id into v_site_id
  from public.planning_tasks
  where id = p_task_id;

  if not found then
    raise exception 'Planning task not found';
  end if;

  if not public.dayof_has_site_permission(v_site_id, 'planning') then
    raise exception 'Not authorized to manage planning tasks';
  end if;

  delete from public.planning_tasks
  where id = p_task_id;
end;
$$;

grant execute on function public.planning_task_delete(uuid) to authenticated;

create or replace function public.seating_event_get_or_create(
  p_wedding_site_id uuid,
  p_itinerary_event_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result public.seating_events;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.dayof_has_site_permission(p_wedding_site_id, 'seating') then
    raise exception 'Not authorized to manage seating events';
  end if;

  if not exists (
    select 1
    from public.itinerary_events
    where id = p_itinerary_event_id
      and wedding_site_id = p_wedding_site_id
  ) then
    raise exception 'Itinerary event not found for site';
  end if;

  select *
  into v_result
  from public.seating_events
  where wedding_site_id = p_wedding_site_id
    and itinerary_event_id = p_itinerary_event_id;

  if not found then
    insert into public.seating_events (
      wedding_site_id,
      itinerary_event_id
    )
    values (
      p_wedding_site_id,
      p_itinerary_event_id
    )
    returning * into v_result;
  end if;

  return to_jsonb(v_result);
end;
$$;

grant execute on function public.seating_event_get_or_create(uuid, uuid) to authenticated;

create or replace function public.seating_event_update(
  p_seating_event_id uuid,
  p_default_table_capacity integer default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.seating_events;
  v_result public.seating_events;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select *
  into v_existing
  from public.seating_events
  where id = p_seating_event_id;

  if not found then
    raise exception 'Seating event not found';
  end if;

  if not public.dayof_has_site_permission(v_existing.wedding_site_id, 'seating') then
    raise exception 'Not authorized to manage seating events';
  end if;

  update public.seating_events
  set
    default_table_capacity = coalesce(p_default_table_capacity, v_existing.default_table_capacity),
    notes = case
      when p_notes is null then v_existing.notes
      else p_notes
    end,
    updated_at = now()
  where id = p_seating_event_id
  returning * into v_result;

  return to_jsonb(v_result);
end;
$$;

grant execute on function public.seating_event_update(uuid, integer, text) to authenticated;

create or replace function public.seating_table_write(
  p_seating_event_id uuid default null,
  p_table_id uuid default null,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.seating_events;
  v_existing public.seating_tables;
  v_result public.seating_tables;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_table_id is null then
    select *
    into v_event
    from public.seating_events
    where id = p_seating_event_id;

    if not found then
      raise exception 'Seating event not found';
    end if;

    if not public.dayof_has_site_permission(v_event.wedding_site_id, 'seating') then
      raise exception 'Not authorized to manage seating tables';
    end if;

    insert into public.seating_tables (
      seating_event_id,
      table_name,
      capacity,
      sort_order,
      notes,
      table_shape,
      layout_width,
      layout_height,
      layout_x,
      layout_y,
      rotation_deg
    )
    values (
      p_seating_event_id,
      coalesce(nullif(btrim(p_payload->>'table_name'), ''), 'Table'),
      coalesce((p_payload->>'capacity')::integer, 8),
      coalesce((p_payload->>'sort_order')::integer, 0),
      coalesce(p_payload->>'notes', ''),
      coalesce(nullif(btrim(p_payload->>'table_shape'), ''), 'round'),
      coalesce((p_payload->>'layout_width')::integer, 260),
      coalesce((p_payload->>'layout_height')::integer, 150),
      coalesce((p_payload->>'layout_x')::integer, 24),
      coalesce((p_payload->>'layout_y')::integer, 24),
      coalesce((p_payload->>'rotation_deg')::integer, 0)
    )
    returning * into v_result;
  else
    select *
    into v_existing
    from public.seating_tables
    where id = p_table_id;

    if not found then
      raise exception 'Seating table not found';
    end if;

    select *
    into v_event
    from public.seating_events
    where id = v_existing.seating_event_id;

    if not public.dayof_has_site_permission(v_event.wedding_site_id, 'seating') then
      raise exception 'Not authorized to manage seating tables';
    end if;

    update public.seating_tables
    set
      table_name = case
        when p_payload ? 'table_name' then coalesce(nullif(btrim(p_payload->>'table_name'), ''), v_existing.table_name)
        else v_existing.table_name
      end,
      capacity = case
        when p_payload ? 'capacity' then coalesce((p_payload->>'capacity')::integer, v_existing.capacity)
        else v_existing.capacity
      end,
      sort_order = case
        when p_payload ? 'sort_order' then coalesce((p_payload->>'sort_order')::integer, v_existing.sort_order)
        else v_existing.sort_order
      end,
      notes = case
        when p_payload ? 'notes' then coalesce(p_payload->>'notes', '')
        else v_existing.notes
      end,
      table_shape = case
        when p_payload ? 'table_shape' then coalesce(nullif(btrim(p_payload->>'table_shape'), ''), v_existing.table_shape)
        else v_existing.table_shape
      end,
      layout_width = case
        when p_payload ? 'layout_width' then coalesce((p_payload->>'layout_width')::integer, v_existing.layout_width)
        else v_existing.layout_width
      end,
      layout_height = case
        when p_payload ? 'layout_height' then coalesce((p_payload->>'layout_height')::integer, v_existing.layout_height)
        else v_existing.layout_height
      end,
      layout_x = case
        when p_payload ? 'layout_x' then coalesce((p_payload->>'layout_x')::integer, v_existing.layout_x)
        else v_existing.layout_x
      end,
      layout_y = case
        when p_payload ? 'layout_y' then coalesce((p_payload->>'layout_y')::integer, v_existing.layout_y)
        else v_existing.layout_y
      end,
      rotation_deg = case
        when p_payload ? 'rotation_deg' then coalesce((p_payload->>'rotation_deg')::integer, v_existing.rotation_deg)
        else v_existing.rotation_deg
      end,
      updated_at = now()
    where id = p_table_id
    returning * into v_result;
  end if;

  return to_jsonb(v_result);
end;
$$;

grant execute on function public.seating_table_write(uuid, uuid, jsonb) to authenticated;

create or replace function public.seating_table_delete(
  p_table_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_site_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select se.wedding_site_id
  into v_site_id
  from public.seating_tables st
  join public.seating_events se on se.id = st.seating_event_id
  where st.id = p_table_id;

  if not found then
    raise exception 'Seating table not found';
  end if;

  if not public.dayof_has_site_permission(v_site_id, 'seating') then
    raise exception 'Not authorized to manage seating tables';
  end if;

  delete from public.seating_tables
  where id = p_table_id;
end;
$$;

grant execute on function public.seating_table_delete(uuid) to authenticated;

create or replace function public.seating_table_bulk_create(
  p_seating_event_id uuid,
  p_tables jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_site_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if jsonb_typeof(p_tables) <> 'array' then
    raise exception 'Tables payload must be an array';
  end if;

  select wedding_site_id
  into v_site_id
  from public.seating_events
  where id = p_seating_event_id;

  if not found then
    raise exception 'Seating event not found';
  end if;

  if not public.dayof_has_site_permission(v_site_id, 'seating') then
    raise exception 'Not authorized to manage seating tables';
  end if;

  return coalesce((
    with inserted as (
      insert into public.seating_tables (
        seating_event_id,
        table_name,
        capacity,
        sort_order,
        notes,
        table_shape,
        layout_width,
        layout_height,
        layout_x,
        layout_y,
        rotation_deg
      )
      select
        p_seating_event_id,
        coalesce(nullif(btrim(item.elem->>'table_name'), ''), format('Table %s', item.ord)),
        coalesce((item.elem->>'capacity')::integer, 8),
        coalesce((item.elem->>'sort_order')::integer, item.ord - 1),
        coalesce(item.elem->>'notes', ''),
        coalesce(nullif(btrim(item.elem->>'table_shape'), ''), 'round'),
        coalesce((item.elem->>'layout_width')::integer, 260),
        coalesce((item.elem->>'layout_height')::integer, 150),
        coalesce((item.elem->>'layout_x')::integer, 24),
        coalesce((item.elem->>'layout_y')::integer, 24),
        coalesce((item.elem->>'rotation_deg')::integer, 0)
      from jsonb_array_elements(p_tables) with ordinality as item(elem, ord)
      returning *
    )
    select jsonb_agg(to_jsonb(inserted) order by inserted.sort_order, inserted.created_at)
    from inserted
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.seating_table_bulk_create(uuid, jsonb) to authenticated;
