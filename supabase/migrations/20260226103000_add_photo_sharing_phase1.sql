-- Phase 1: guest photo sharing albums + uploads

create extension if not exists pgcrypto;

create table if not exists public.photo_albums (
  id uuid primary key default gen_random_uuid(),
  wedding_site_id uuid not null references public.wedding_sites(id) on delete cascade,
  itinerary_event_id uuid null references public.itinerary_events(id) on delete set null,
  name text not null check (char_length(trim(name)) > 0),
  slug text not null,
  drive_folder_id text not null,
  drive_folder_url text,
  upload_token_hash text not null,
  is_active boolean not null default true,
  opens_at timestamptz,
  closes_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (upload_token_hash)
);

create unique index if not exists idx_photo_albums_site_slug_unique
  on public.photo_albums (wedding_site_id, slug);

create index if not exists idx_photo_albums_site on public.photo_albums (wedding_site_id);
create index if not exists idx_photo_albums_event on public.photo_albums (itinerary_event_id);

create table if not exists public.photo_uploads (
  id uuid primary key default gen_random_uuid(),
  photo_album_id uuid not null references public.photo_albums(id) on delete cascade,
  wedding_site_id uuid not null references public.wedding_sites(id) on delete cascade,
  guest_name text,
  note text,
  original_filename text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  drive_file_id text not null,
  drive_web_view_link text,
  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_photo_uploads_album_uploaded
  on public.photo_uploads (photo_album_id, uploaded_at desc);

create index if not exists idx_photo_uploads_site_uploaded
  on public.photo_uploads (wedding_site_id, uploaded_at desc);

-- update timestamp trigger
create or replace function public.update_photo_albums_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_photo_albums_updated_at on public.photo_albums;
create trigger trg_photo_albums_updated_at
before update on public.photo_albums
for each row execute function public.update_photo_albums_updated_at();

-- RLS
alter table public.photo_albums enable row level security;
alter table public.photo_uploads enable row level security;

-- owner CRUD on albums
create policy "photo_albums_owner_select"
on public.photo_albums for select
to authenticated
using (
  exists (
    select 1 from public.wedding_sites ws
    where ws.id = photo_albums.wedding_site_id and ws.user_id = auth.uid()
  )
);

create policy "photo_albums_owner_insert"
on public.photo_albums for insert
to authenticated
with check (
  exists (
    select 1 from public.wedding_sites ws
    where ws.id = photo_albums.wedding_site_id and ws.user_id = auth.uid()
  ) and created_by = auth.uid()
);

create policy "photo_albums_owner_update"
on public.photo_albums for update
to authenticated
using (
  exists (
    select 1 from public.wedding_sites ws
    where ws.id = photo_albums.wedding_site_id and ws.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.wedding_sites ws
    where ws.id = photo_albums.wedding_site_id and ws.user_id = auth.uid()
  )
);

create policy "photo_albums_owner_delete"
on public.photo_albums for delete
to authenticated
using (
  exists (
    select 1 from public.wedding_sites ws
    where ws.id = photo_albums.wedding_site_id and ws.user_id = auth.uid()
  )
);

-- owner CRUD on uploads
create policy "photo_uploads_owner_select"
on public.photo_uploads for select
to authenticated
using (
  exists (
    select 1 from public.wedding_sites ws
    where ws.id = photo_uploads.wedding_site_id and ws.user_id = auth.uid()
  )
);

create policy "photo_uploads_owner_insert"
on public.photo_uploads for insert
to authenticated
with check (
  exists (
    select 1 from public.wedding_sites ws
    where ws.id = photo_uploads.wedding_site_id and ws.user_id = auth.uid()
  )
);

create policy "photo_uploads_owner_update"
on public.photo_uploads for update
to authenticated
using (
  exists (
    select 1 from public.wedding_sites ws
    where ws.id = photo_uploads.wedding_site_id and ws.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.wedding_sites ws
    where ws.id = photo_uploads.wedding_site_id and ws.user_id = auth.uid()
  )
);

create policy "photo_uploads_owner_delete"
on public.photo_uploads for delete
to authenticated
using (
  exists (
    select 1 from public.wedding_sites ws
    where ws.id = photo_uploads.wedding_site_id and ws.user_id = auth.uid()
  )
);
