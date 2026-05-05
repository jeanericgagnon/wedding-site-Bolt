CREATE TABLE IF NOT EXISTS public.guest_prospect_optins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_site_id uuid NOT NULL REFERENCES public.wedding_sites(id) ON DELETE CASCADE,
  site_slug text NOT NULL,
  guest_name text,
  email text,
  phone text,
  source text NOT NULL DEFAULT 'guest_recap',
  wants_photo_updates boolean NOT NULL DEFAULT true,
  wants_own_event_info boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_guest_prospect_optins_site
  ON public.guest_prospect_optins(wedding_site_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_guest_prospect_optins_email
  ON public.guest_prospect_optins(lower(email))
  WHERE email IS NOT NULL;

ALTER TABLE public.guest_prospect_optins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "guest_prospect_optins_owner_select" ON public.guest_prospect_optins;
CREATE POLICY "guest_prospect_optins_owner_select"
ON public.guest_prospect_optins FOR SELECT
TO authenticated
USING (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','coordinator','viewer']));
