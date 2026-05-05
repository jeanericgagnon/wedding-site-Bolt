-- Normalize mistakenly persisted signed Supabase storage URLs into durable public URLs.
-- Root cause: builder media list path replaced canonical URLs with temporary signed URLs,
-- and those signed URLs were later persisted into section/site payloads.

begin;
-- wedding_sites JSON payloads
update public.wedding_sites
set
  site_json = regexp_replace(
    site_json::text,
    'https://[^"\s]*/storage/v1/object/sign/wedding-media/([^"?]+)\?token=[^"\s]+',
    'https://atuzuobpprjstfmdnwso.supabase.co/storage/v1/object/public/wedding-media/\1',
    'g'
  )::jsonb,
  wedding_data = regexp_replace(
    wedding_data::text,
    'https://[^"\s]*/storage/v1/object/sign/wedding-media/([^"?]+)\?token=[^"\s]+',
    'https://atuzuobpprjstfmdnwso.supabase.co/storage/v1/object/public/wedding-media/\1',
    'g'
  )::jsonb,
  updated_at = now()
where
  coalesce(site_json::text, '') like '%/storage/v1/object/sign/wedding-media/%'
  or coalesce(wedding_data::text, '') like '%/storage/v1/object/sign/wedding-media/%';
-- sections payloads
update public.sections
set
  data = regexp_replace(
    data::text,
    'https://[^"\s]*/storage/v1/object/sign/wedding-media/([^"?]+)\?token=[^"\s]+',
    'https://atuzuobpprjstfmdnwso.supabase.co/storage/v1/object/public/wedding-media/\1',
    'g'
  )::jsonb,
  updated_at = now()
where coalesce(data::text, '') like '%/storage/v1/object/sign/wedding-media/%';
-- media library table canonical URL fields
update public.builder_media_assets
set
  url = regexp_replace(
    url,
    'https://[^"\s]*/storage/v1/object/sign/wedding-media/([^"?]+)\?token=[^"\s]+',
    'https://atuzuobpprjstfmdnwso.supabase.co/storage/v1/object/public/wedding-media/\1',
    'g'
  ),
  thumbnail_url = regexp_replace(
    thumbnail_url,
    'https://[^"\s]*/storage/v1/object/sign/wedding-media/([^"?]+)\?token=[^"\s]+',
    'https://atuzuobpprjstfmdnwso.supabase.co/storage/v1/object/public/wedding-media/\1',
    'g'
  ),
  updated_at = now()
where
  coalesce(url, '') like '%/storage/v1/object/sign/wedding-media/%'
  or coalesce(thumbnail_url, '') like '%/storage/v1/object/sign/wedding-media/%';
commit;
