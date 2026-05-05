create table if not exists public.seating_layout_versions (
  id uuid primary key default gen_random_uuid(),
  wedding_site_id uuid not null references public.wedding_sites(id) on delete cascade,
  seating_event_id uuid not null references public.seating_events(id) on delete cascade,
  itinerary_event_id uuid references public.itinerary_events(id) on delete set null,
  label text not null,
  tables jsonb not null default '[]'::jsonb,
  assignments jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  restored_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_seating_layout_versions_event_created
  on public.seating_layout_versions(seating_event_id, created_at desc);

alter table public.seating_layout_versions enable row level security;

drop policy if exists "seating_layout_versions_read" on public.seating_layout_versions;
create policy "seating_layout_versions_read"
on public.seating_layout_versions for select
using (
  public.dayof_has_site_role(wedding_site_id, ARRAY['owner','planner','coordinator','viewer'])
  or public.dayof_has_site_permission(wedding_site_id, 'seating')
);

drop policy if exists "seating_layout_versions_write" on public.seating_layout_versions;
create policy "seating_layout_versions_write"
on public.seating_layout_versions for all
using (public.dayof_has_site_permission(wedding_site_id, 'seating'))
with check (public.dayof_has_site_permission(wedding_site_id, 'seating'));

grant select, insert, update, delete on public.seating_layout_versions to authenticated;

create table if not exists public.guest_hub_settings (
  wedding_site_id uuid primary key references public.wedding_sites(id) on delete cascade,
  rsvp_enabled boolean not null default true,
  photos_enabled boolean not null default true,
  guestbook_enabled boolean not null default true,
  registry_enabled boolean not null default true,
  schedule_enabled boolean not null default true,
  travel_enabled boolean not null default true,
  custom_message text,
  language_default text not null default 'en',
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.guest_hub_settings enable row level security;

drop policy if exists "guest_hub_settings_owner_read" on public.guest_hub_settings;
create policy "guest_hub_settings_owner_read"
on public.guest_hub_settings for select
using (
  public.dayof_has_site_role(wedding_site_id, ARRAY['owner','planner','coordinator','viewer'])
  or public.dayof_has_site_permission(wedding_site_id, 'settings')
  or public.dayof_has_site_permission(wedding_site_id, 'photos')
);

drop policy if exists "guest_hub_settings_owner_write" on public.guest_hub_settings;
create policy "guest_hub_settings_owner_write"
on public.guest_hub_settings for all
using (
  public.dayof_has_site_permission(wedding_site_id, 'settings')
  or public.dayof_has_site_permission(wedding_site_id, 'photos')
)
with check (
  public.dayof_has_site_permission(wedding_site_id, 'settings')
  or public.dayof_has_site_permission(wedding_site_id, 'photos')
);

grant select, insert, update on public.guest_hub_settings to authenticated;

create table if not exists public.guest_hub_events (
  id uuid primary key default gen_random_uuid(),
  wedding_site_id uuid not null references public.wedding_sites(id) on delete cascade,
  site_slug text not null,
  event_type text not null,
  target text,
  user_agent text,
  referrer text,
  created_at timestamptz not null default now()
);

create index if not exists idx_guest_hub_events_site_created
  on public.guest_hub_events(wedding_site_id, created_at desc);

alter table public.guest_hub_events enable row level security;

drop policy if exists "guest_hub_events_owner_read" on public.guest_hub_events;
create policy "guest_hub_events_owner_read"
on public.guest_hub_events for select
using (
  public.dayof_has_site_role(wedding_site_id, ARRAY['owner','planner','coordinator','viewer'])
  or public.dayof_has_site_permission(wedding_site_id, 'photos')
);

grant select on public.guest_hub_events to authenticated;

alter table public.guestbook_entries
  add column if not exists moderated_at timestamptz,
  add column if not exists moderated_by uuid references auth.users(id) on delete set null;

drop policy if exists "guestbook_entries_owner_delete" on public.guestbook_entries;
create policy "guestbook_entries_owner_delete"
on public.guestbook_entries for delete
using (
  public.dayof_has_site_role(wedding_site_id, ARRAY['owner','planner','coordinator'])
  or public.dayof_has_site_permission(wedding_site_id, 'photos')
);

grant delete on public.guestbook_entries to authenticated;
