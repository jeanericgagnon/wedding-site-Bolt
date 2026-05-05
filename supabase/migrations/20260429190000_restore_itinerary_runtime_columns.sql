-- Restore itinerary columns the app and older migrations expect.
-- Production was missing these after schema drift, which made full event payload
-- inserts fall back through client-side drift handling.

ALTER TABLE public.itinerary_events
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;

ALTER TABLE public.itinerary_events
  ADD COLUMN IF NOT EXISTS is_visible boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_itinerary_events_site_order
  ON public.itinerary_events(wedding_site_id, display_order);
