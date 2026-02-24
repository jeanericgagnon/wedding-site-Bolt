-- Guest audit trail
create table if not exists guest_audit_logs (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references guests(id) on delete cascade,
  wedding_site_id uuid not null references wedding_sites(id) on delete cascade,
  action text not null check (action in ('insert','update','delete')),
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now(),
  old_data jsonb,
  new_data jsonb
);

create index if not exists guest_audit_logs_guest_changed_idx on guest_audit_logs(guest_id, changed_at desc);
create index if not exists guest_audit_logs_site_changed_idx on guest_audit_logs(wedding_site_id, changed_at desc);

alter table guest_audit_logs enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='guest_audit_logs' and policyname='Users can view audit logs for own site'
  ) then
    create policy "Users can view audit logs for own site"
      on guest_audit_logs
      for select
      to authenticated
      using (
        exists (
          select 1 from wedding_sites ws
          where ws.id = guest_audit_logs.wedding_site_id
            and ws.user_id = auth.uid()
        )
      );
  end if;
end $$;

create or replace function public.log_guest_audit_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (TG_OP = 'INSERT') then
    insert into guest_audit_logs (guest_id, wedding_site_id, action, changed_by, old_data, new_data)
    values (NEW.id, NEW.wedding_site_id, 'insert', auth.uid(), null, to_jsonb(NEW));
    return NEW;
  elsif (TG_OP = 'UPDATE') then
    if to_jsonb(NEW) is distinct from to_jsonb(OLD) then
      insert into guest_audit_logs (guest_id, wedding_site_id, action, changed_by, old_data, new_data)
      values (NEW.id, NEW.wedding_site_id, 'update', auth.uid(), to_jsonb(OLD), to_jsonb(NEW));
    end if;
    return NEW;
  elsif (TG_OP = 'DELETE') then
    insert into guest_audit_logs (guest_id, wedding_site_id, action, changed_by, old_data, new_data)
    values (OLD.id, OLD.wedding_site_id, 'delete', auth.uid(), to_jsonb(OLD), null);
    return OLD;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_guest_audit_log on guests;
create trigger trg_guest_audit_log
after insert or update or delete on guests
for each row execute function public.log_guest_audit_change();