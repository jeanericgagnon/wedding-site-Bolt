alter table public.itinerary_events
  add column if not exists title text not null default 'Event';

alter table public.itinerary_events
  add column if not exists location_name text not null default '';

alter table public.itinerary_events
  add column if not exists location_address text;

alter table public.itinerary_events
  add column if not exists notes text;
