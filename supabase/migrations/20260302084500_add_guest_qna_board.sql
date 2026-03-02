/*
  Guest Q&A board storage
*/

CREATE TABLE IF NOT EXISTS guest_qna_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_site_id uuid NOT NULL REFERENCES wedding_sites(id) ON DELETE CASCADE,
  guest_id uuid REFERENCES guests(id) ON DELETE SET NULL,
  question text NOT NULL,
  answer text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'answered')),
  source text NOT NULL DEFAULT 'web' CHECK (source IN ('web', 'sms', 'manual')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE guest_qna_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "QNA read for site collaborators" ON guest_qna_items;
CREATE POLICY "QNA read for site collaborators"
  ON guest_qna_items FOR SELECT
  TO authenticated
  USING (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','coordinator','viewer']));

DROP POLICY IF EXISTS "QNA write for owner and coordinator" ON guest_qna_items;
CREATE POLICY "QNA write for owner and coordinator"
  ON guest_qna_items FOR ALL
  TO authenticated
  USING (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','coordinator']))
  WITH CHECK (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','coordinator']));

CREATE INDEX IF NOT EXISTS idx_guest_qna_site_created ON guest_qna_items(wedding_site_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guest_qna_site_status ON guest_qna_items(wedding_site_id, status);
