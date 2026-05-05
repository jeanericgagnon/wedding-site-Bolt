/*
  # Restore wedding-media public serving

  The builder stores durable wedding-media object URLs in published site JSON.
  The bucket was originally created as public so those URLs can render for guests
  and in the owner builder preview. Ensure the live bucket matches that contract.
*/

update storage.buckets
set public = true
where id = 'wedding-media';

drop policy if exists "Public can read wedding media" on storage.objects;
create policy "Public can read wedding media"
on storage.objects
for select
to public
using (bucket_id = 'wedding-media');
