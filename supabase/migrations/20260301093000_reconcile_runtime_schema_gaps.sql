-- Reconcile runtime schema gaps observed in live QA (safe, idempotent)

-- 1) wedding_sites compatibility columns used by frontend selects
ALTER TABLE public.wedding_sites
  ADD COLUMN IF NOT EXISTS active_template_id text,
  ADD COLUMN IF NOT EXISTS site_url text,
  ADD COLUMN IF NOT EXISTS venue_name text,
  ADD COLUMN IF NOT EXISTS venue_address text,
  ADD COLUMN IF NOT EXISTS wedding_data jsonb DEFAULT '{}'::jsonb;

UPDATE public.wedding_sites
SET active_template_id = COALESCE(active_template_id, template_id)
WHERE active_template_id IS NULL;

-- 2) itinerary_events table (if missing)
CREATE TABLE IF NOT EXISTS public.itinerary_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_site_id uuid NOT NULL REFERENCES public.wedding_sites(id) ON DELETE CASCADE,
  event_name text NOT NULL,
  description text NOT NULL DEFAULT '',
  event_date date,
  start_time time,
  end_time time,
  location_name text NOT NULL DEFAULT '',
  location_address text NOT NULL DEFAULT '',
  dress_code text,
  notes text,
  display_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'itinerary_events' AND column_name = 'display_order'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_itinerary_events_site_order ON public.itinerary_events(wedding_site_id, display_order)';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'itinerary_events' AND column_name = 'order_index'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_itinerary_events_site_order_index ON public.itinerary_events(wedding_site_id, order_index)';
  ELSE
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_itinerary_events_site_only ON public.itinerary_events(wedding_site_id)';
  END IF;
END $$;

ALTER TABLE public.itinerary_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY itinerary_events_owner_select
    ON public.itinerary_events FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.wedding_sites ws
        WHERE ws.id = itinerary_events.wedding_site_id
          AND ws.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY itinerary_events_owner_insert
    ON public.itinerary_events FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.wedding_sites ws
        WHERE ws.id = itinerary_events.wedding_site_id
          AND ws.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY itinerary_events_owner_update
    ON public.itinerary_events FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM public.wedding_sites ws
        WHERE ws.id = itinerary_events.wedding_site_id
          AND ws.user_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.wedding_sites ws
        WHERE ws.id = itinerary_events.wedding_site_id
          AND ws.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY itinerary_events_owner_delete
    ON public.itinerary_events FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM public.wedding_sites ws
        WHERE ws.id = itinerary_events.wedding_site_id
          AND ws.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) event_invitations table (if missing)
CREATE TABLE IF NOT EXISTS public.event_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.itinerary_events(id) ON DELETE CASCADE,
  guest_id uuid NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, guest_id)
);

CREATE INDEX IF NOT EXISTS idx_event_invitations_event_id ON public.event_invitations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_invitations_guest_id ON public.event_invitations(guest_id);

ALTER TABLE public.event_invitations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY event_invitations_owner_select
    ON public.event_invitations FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM public.itinerary_events ie
        JOIN public.wedding_sites ws ON ws.id = ie.wedding_site_id
        WHERE ie.id = event_invitations.event_id
          AND ws.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY event_invitations_owner_insert
    ON public.event_invitations FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1
        FROM public.itinerary_events ie
        JOIN public.wedding_sites ws ON ws.id = ie.wedding_site_id
        WHERE ie.id = event_invitations.event_id
          AND ws.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY event_invitations_owner_delete
    ON public.event_invitations FOR DELETE
    USING (
      EXISTS (
        SELECT 1
        FROM public.itinerary_events ie
        JOIN public.wedding_sites ws ON ws.id = ie.wedding_site_id
        WHERE ie.id = event_invitations.event_id
          AND ws.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4) sections table (if missing) used by builder/public render
CREATE TABLE IF NOT EXISTS public.sections (
  id text PRIMARY KEY,
  site_id uuid NOT NULL REFERENCES public.wedding_sites(id) ON DELETE CASCADE,
  type text NOT NULL,
  variant text NOT NULL DEFAULT 'default',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  "order" integer NOT NULL DEFAULT 0,
  visible boolean NOT NULL DEFAULT true,
  schema_version integer NOT NULL DEFAULT 1,
  style_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  bindings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sections_site_order ON public.sections(site_id, "order");

ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY sections_owner_select
    ON public.sections FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.wedding_sites ws
        WHERE ws.id = sections.site_id
          AND ws.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY sections_owner_insert
    ON public.sections FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.wedding_sites ws
        WHERE ws.id = sections.site_id
          AND ws.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY sections_owner_update
    ON public.sections FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM public.wedding_sites ws
        WHERE ws.id = sections.site_id
          AND ws.user_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.wedding_sites ws
        WHERE ws.id = sections.site_id
          AND ws.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY sections_owner_delete
    ON public.sections FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM public.wedding_sites ws
        WHERE ws.id = sections.site_id
          AND ws.user_id = auth.uid()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Public read for visible sections on published sites
DO $$ BEGIN
  CREATE POLICY sections_public_visible_read
    ON public.sections FOR SELECT
    USING (
      visible = true AND EXISTS (
        SELECT 1 FROM public.wedding_sites ws
        WHERE ws.id = sections.site_id
          AND ws.is_published = true
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
