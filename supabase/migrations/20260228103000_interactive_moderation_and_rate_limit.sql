-- Moderation support for interactive suggestions + stronger anti-spam helper indexes

ALTER TABLE public.interactive_suggestions
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_interactive_suggestions_visible
  ON public.interactive_suggestions(site_slug, prompt_key, is_hidden, created_at DESC);

DROP POLICY IF EXISTS "interactive_suggestions_authenticated_update" ON public.interactive_suggestions;
CREATE POLICY "interactive_suggestions_authenticated_update"
ON public.interactive_suggestions
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
