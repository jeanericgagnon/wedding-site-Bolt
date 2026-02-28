-- Interactive polls/quizzes/suggestions for public site sections

CREATE TABLE IF NOT EXISTS public.interactive_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_slug text NOT NULL,
  widget_kind text NOT NULL CHECK (widget_kind IN ('poll', 'quiz')),
  widget_id text NOT NULL,
  option_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.interactive_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_slug text NOT NULL,
  prompt_key text NOT NULL,
  suggestion_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interactive_votes_lookup
  ON public.interactive_votes(site_slug, widget_kind, widget_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_interactive_suggestions_lookup
  ON public.interactive_suggestions(site_slug, prompt_key, created_at DESC);

ALTER TABLE public.interactive_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interactive_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "interactive_votes_public_select" ON public.interactive_votes;
CREATE POLICY "interactive_votes_public_select"
ON public.interactive_votes
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "interactive_votes_public_insert" ON public.interactive_votes;
CREATE POLICY "interactive_votes_public_insert"
ON public.interactive_votes
FOR INSERT
TO anon, authenticated
WITH CHECK (
  char_length(site_slug) BETWEEN 1 AND 128
  AND char_length(widget_id) BETWEEN 1 AND 128
  AND char_length(option_id) BETWEEN 1 AND 128
);

DROP POLICY IF EXISTS "interactive_suggestions_public_select" ON public.interactive_suggestions;
CREATE POLICY "interactive_suggestions_public_select"
ON public.interactive_suggestions
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "interactive_suggestions_public_insert" ON public.interactive_suggestions;
CREATE POLICY "interactive_suggestions_public_insert"
ON public.interactive_suggestions
FOR INSERT
TO anon, authenticated
WITH CHECK (
  char_length(site_slug) BETWEEN 1 AND 128
  AND char_length(prompt_key) BETWEEN 1 AND 128
  AND char_length(suggestion_text) BETWEEN 1 AND 280
);
