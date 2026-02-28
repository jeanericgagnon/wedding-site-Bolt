-- Ensure media-related storage buckets exist (idempotent)
-- Fixes runtime upload failures like: "Bucket not found"

-- Buckets commonly used across builder/photo flows
insert into storage.buckets (id, name, public)
values
  ('site-media', 'site-media', false),
  ('builder-media', 'builder-media', false),
  ('photos', 'photos', false),
  ('photo-uploads', 'photo-uploads', false),
  ('wedding-media', 'wedding-media', false)
on conflict (id) do nothing;

-- Authenticated users can read their app media buckets
DROP POLICY IF EXISTS "authenticated can read site media" ON storage.objects;
create policy "authenticated can read site media"
on storage.objects
for select
using (
  bucket_id in ('site-media', 'builder-media', 'photos', 'photo-uploads', 'wedding-media')
  and auth.role() = 'authenticated'
);

-- Authenticated users can upload to app media buckets
DROP POLICY IF EXISTS "authenticated can upload site media" ON storage.objects;
create policy "authenticated can upload site media"
on storage.objects
for insert
with check (
  bucket_id in ('site-media', 'builder-media', 'photos', 'photo-uploads', 'wedding-media')
  and auth.role() = 'authenticated'
);

-- Authenticated users can update their uploaded media in app buckets
DROP POLICY IF EXISTS "authenticated can update site media" ON storage.objects;
create policy "authenticated can update site media"
on storage.objects
for update
using (
  bucket_id in ('site-media', 'builder-media', 'photos', 'photo-uploads', 'wedding-media')
  and auth.role() = 'authenticated'
)
with check (
  bucket_id in ('site-media', 'builder-media', 'photos', 'photo-uploads', 'wedding-media')
  and auth.role() = 'authenticated'
);

-- Authenticated users can delete from app media buckets (optional but useful for builder replacement flows)
DROP POLICY IF EXISTS "authenticated can delete site media" ON storage.objects;
create policy "authenticated can delete site media"
on storage.objects
for delete
using (
  bucket_id in ('site-media', 'builder-media', 'photos', 'photo-uploads', 'wedding-media')
  and auth.role() = 'authenticated'
);
