CREATE TABLE IF NOT EXISTS public.site_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_site_id uuid NOT NULL REFERENCES public.wedding_sites(id) ON DELETE CASCADE,
  language text NOT NULL CHECK (language IN ('es')),
  source_hash text NOT NULL,
  status text NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'failed')),
  translated_site_json jsonb,
  translated_published_json jsonb,
  translated_wedding_data jsonb,
  translated_layout_config jsonb,
  translated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (wedding_site_id, language)
);

ALTER TABLE public.site_translations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site translations owner read" ON public.site_translations;
CREATE POLICY "site translations owner read"
  ON public.site_translations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.wedding_sites ws
      WHERE ws.id = site_translations.wedding_site_id
        AND ws.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "site translations public published read" ON public.site_translations;
CREATE POLICY "site translations public published read"
  ON public.site_translations FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.wedding_sites ws
      WHERE ws.id = site_translations.wedding_site_id
        AND ws.is_published = true
    )
  );

DROP POLICY IF EXISTS "site translations service manage" ON public.site_translations;
CREATE POLICY "site translations service manage"
  ON public.site_translations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_site_translations_site_language
  ON public.site_translations(wedding_site_id, language);
