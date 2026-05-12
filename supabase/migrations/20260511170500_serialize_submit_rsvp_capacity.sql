create or replace function public.apply_public_rsvp_capacity_decision(
  p_wedding_site_id uuid,
  p_guest_id uuid,
  p_attending boolean,
  p_already_confirmed boolean,
  p_responded_at timestamptz default now()
) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_site wedding_sites%rowtype;
  v_confirmed_count integer := 0;
  v_waitlisted boolean := false;
  v_blocked boolean := false;
  v_guest_status text := 'pending';
begin
  select *
  into v_site
  from wedding_sites
  where id = p_wedding_site_id
  for update;

  if not found then
    raise exception 'wedding site not found';
  end if;

  if not p_attending then
    update guests
    set rsvp_status = 'declined',
        rsvp_received_at = p_responded_at
    where id = p_guest_id
      and wedding_site_id = p_wedding_site_id;

    update rsvp_waitlist_entries
    set status = 'removed',
        updated_at = p_responded_at
    where wedding_site_id = p_wedding_site_id
      and guest_id = p_guest_id
      and status = 'waiting';

    v_guest_status := 'declined';
  elsif coalesce(v_site.rsvp_capacity_limit, 0) <= 0 then
    update guests
    set rsvp_status = 'confirmed',
        rsvp_received_at = p_responded_at
    where id = p_guest_id
      and wedding_site_id = p_wedding_site_id;

    update rsvp_waitlist_entries
    set status = 'removed',
        updated_at = p_responded_at
    where wedding_site_id = p_wedding_site_id
      and guest_id = p_guest_id
      and status = 'waiting';

    v_guest_status := 'confirmed';
  else
    select count(*)
    into v_confirmed_count
    from guests
    where wedding_site_id = p_wedding_site_id
      and rsvp_status = 'confirmed'
      and (not p_already_confirmed or id <> p_guest_id);

    if v_confirmed_count >= v_site.rsvp_capacity_limit then
      if coalesce(v_site.rsvp_waitlist_enabled, false) then
        insert into rsvp_waitlist_entries (
          wedding_site_id,
          guest_id,
          status,
          source,
          updated_at
        ) values (
          p_wedding_site_id,
          p_guest_id,
          'waiting',
          'web',
          p_responded_at
        )
        on conflict (wedding_site_id, guest_id)
        do update
          set status = 'waiting',
              source = 'web',
              updated_at = excluded.updated_at;

        update guests
        set rsvp_status = 'pending',
            rsvp_received_at = p_responded_at
        where id = p_guest_id
          and wedding_site_id = p_wedding_site_id;

        v_waitlisted := true;
        v_guest_status := 'pending';
      else
        v_blocked := true;
      end if;
    else
      update guests
      set rsvp_status = 'confirmed',
          rsvp_received_at = p_responded_at
      where id = p_guest_id
        and wedding_site_id = p_wedding_site_id;

      update rsvp_waitlist_entries
      set status = 'removed',
          updated_at = p_responded_at
      where wedding_site_id = p_wedding_site_id
        and guest_id = p_guest_id
        and status = 'waiting';

      v_guest_status := 'confirmed';
    end if;
  end if;

  update wedding_sites
  set rsvp_waitlist_count = (
    select count(*)
    from rsvp_waitlist_entries
    where wedding_site_id = p_wedding_site_id
      and status = 'waiting'
  )
  where id = p_wedding_site_id;

  return jsonb_build_object(
    'waitlisted', v_waitlisted,
    'blocked', v_blocked,
    'guest_status', v_guest_status
  );
end;
$$;

grant execute on function public.apply_public_rsvp_capacity_decision(uuid, uuid, boolean, boolean, timestamptz) to service_role;
