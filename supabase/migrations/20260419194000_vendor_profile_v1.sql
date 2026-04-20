create table if not exists public.vendor_profiles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  vendor_name text not null,
  descriptor text,
  about text not null,
  hero_image_url text,
  image_urls jsonb not null default '[]'::jsonb,
  instagram_url text,
  website_url text,
  contact_email text,
  source_payload jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vendor_profile_inquiries (
  id uuid primary key default gen_random_uuid(),
  vendor_profile_id uuid not null references public.vendor_profiles(id) on delete cascade,
  name text not null,
  email text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists vendor_profiles_slug_idx on public.vendor_profiles(slug);
create index if not exists vendor_profile_inquiries_vendor_profile_id_idx on public.vendor_profile_inquiries(vendor_profile_id);

create or replace function public.set_vendor_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_vendor_profiles_updated_at on public.vendor_profiles;
create trigger set_vendor_profiles_updated_at
before update on public.vendor_profiles
for each row
execute function public.set_vendor_profiles_updated_at();

alter table public.vendor_profiles enable row level security;
alter table public.vendor_profile_inquiries enable row level security;

drop policy if exists "vendor profiles public read" on public.vendor_profiles;
create policy "vendor profiles public read"
on public.vendor_profiles
for select
using (true);

drop policy if exists "vendor profiles auth write" on public.vendor_profiles;
create policy "vendor profiles auth write"
on public.vendor_profiles
for all
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

drop policy if exists "vendor inquiries public create" on public.vendor_profile_inquiries;
create policy "vendor inquiries public create"
on public.vendor_profile_inquiries
for insert
with check (true);

drop policy if exists "vendor inquiries auth read" on public.vendor_profile_inquiries;
create policy "vendor inquiries auth read"
on public.vendor_profile_inquiries
for select
using (auth.role() = 'authenticated');
