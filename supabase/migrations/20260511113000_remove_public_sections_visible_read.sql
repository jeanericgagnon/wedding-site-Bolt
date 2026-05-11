-- Public sections must only be exposed through the gated public-site-access resolver.
DROP POLICY IF EXISTS sections_public_visible_read ON public.sections;
