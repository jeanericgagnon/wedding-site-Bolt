alter table public.planning_vendors
  add column if not exists internal_rating smallint,
  add column if not exists rating_status text,
  add column if not exists rating_notes text;

alter table public.vendor_profile_inquiries
  add column if not exists wedding_date text,
  add column if not exists venue_name text,
  add column if not exists venue_location text;

create index if not exists planning_vendors_internal_rating_idx
  on public.planning_vendors(wedding_site_id, internal_rating);
