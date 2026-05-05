create table if not exists public.guestbook_entries (
  id uuid primary key default gen_random_uuid(),
  wedding_site_id uuid not null references public.wedding_sites(id) on delete cascade,
  guest_name text,
  guest_email text,
  message text not null,
  is_hidden boolean not null default false,
  is_flagged boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_guestbook_entries_site_created
  on public.guestbook_entries(wedding_site_id, created_at desc);

alter table public.guestbook_entries enable row level security;

drop policy if exists "guestbook_entries_owner_select" on public.guestbook_entries;
create policy "guestbook_entries_owner_select"
on public.guestbook_entries for select
using (
  exists (
    select 1 from public.wedding_sites ws
    where ws.id = guestbook_entries.wedding_site_id
      and ws.user_id = auth.uid()
  )
);

drop policy if exists "guestbook_entries_owner_update" on public.guestbook_entries;
create policy "guestbook_entries_owner_update"
on public.guestbook_entries for update
using (
  exists (
    select 1 from public.wedding_sites ws
    where ws.id = guestbook_entries.wedding_site_id
      and ws.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.wedding_sites ws
    where ws.id = guestbook_entries.wedding_site_id
      and ws.user_id = auth.uid()
  )
);

grant select, update on public.guestbook_entries to authenticated;
