/*
  Backend-enforced RBAC foundation for wedding site collaboration.
  - owner (wedding_sites.user_id)
  - coordinator (editable operations)
  - viewer (read-only)
  - admin_users bypass remains supported
*/

DO $$ BEGIN
  CREATE TYPE collaborator_role AS ENUM ('owner', 'coordinator', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS wedding_site_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_site_id uuid NOT NULL REFERENCES wedding_sites(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role collaborator_role NOT NULL DEFAULT 'viewer',
  invited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (wedding_site_id, user_id)
);

ALTER TABLE wedding_site_collaborators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Collaborators can read own rows" ON wedding_site_collaborators;
CREATE POLICY "Collaborators can read own rows"
  ON wedding_site_collaborators FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Owners/admins can manage collaborators" ON wedding_site_collaborators;
CREATE POLICY "Owners/admins can manage collaborators"
  ON wedding_site_collaborators FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM wedding_sites ws
      WHERE ws.id = wedding_site_collaborators.wedding_site_id
        AND ws.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM wedding_sites ws
      WHERE ws.id = wedding_site_collaborators.wedding_site_id
        AND ws.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.dayof_role_for_site(site_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid()) THEN 'owner'
      WHEN EXISTS (SELECT 1 FROM wedding_sites ws WHERE ws.id = site_id AND ws.user_id = auth.uid()) THEN 'owner'
      ELSE COALESCE(
        (SELECT wsc.role::text
         FROM wedding_site_collaborators wsc
         WHERE wsc.wedding_site_id = site_id
           AND wsc.user_id = auth.uid()
         LIMIT 1),
        'none'
      )
    END;
$$;

CREATE OR REPLACE FUNCTION public.dayof_has_site_role(site_id uuid, allowed text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.dayof_role_for_site(site_id) = ANY (allowed), false);
$$;

-- guests
DROP POLICY IF EXISTS "RBAC guests read" ON guests;
CREATE POLICY "RBAC guests read"
  ON guests FOR SELECT
  TO authenticated
  USING (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','coordinator','viewer']));

DROP POLICY IF EXISTS "RBAC guests write" ON guests;
CREATE POLICY "RBAC guests write"
  ON guests FOR ALL
  TO authenticated
  USING (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','coordinator']))
  WITH CHECK (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','coordinator']));

-- messages
DROP POLICY IF EXISTS "RBAC messages read" ON messages;
CREATE POLICY "RBAC messages read"
  ON messages FOR SELECT
  TO authenticated
  USING (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','coordinator','viewer']));

DROP POLICY IF EXISTS "RBAC messages write" ON messages;
CREATE POLICY "RBAC messages write"
  ON messages FOR ALL
  TO authenticated
  USING (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','coordinator']))
  WITH CHECK (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','coordinator']));

-- itinerary + invitations
DROP POLICY IF EXISTS "RBAC itinerary events read" ON itinerary_events;
CREATE POLICY "RBAC itinerary events read"
  ON itinerary_events FOR SELECT
  TO authenticated
  USING (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','coordinator','viewer']));

DROP POLICY IF EXISTS "RBAC itinerary events write" ON itinerary_events;
CREATE POLICY "RBAC itinerary events write"
  ON itinerary_events FOR ALL
  TO authenticated
  USING (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','coordinator']))
  WITH CHECK (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','coordinator']));

DROP POLICY IF EXISTS "RBAC event invitations read" ON event_invitations;
CREATE POLICY "RBAC event invitations read"
  ON event_invitations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_events ie
      WHERE ie.id = event_invitations.event_id
        AND public.dayof_has_site_role(ie.wedding_site_id, ARRAY['owner','coordinator','viewer'])
    )
  );

DROP POLICY IF EXISTS "RBAC event invitations write" ON event_invitations;
CREATE POLICY "RBAC event invitations write"
  ON event_invitations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_events ie
      WHERE ie.id = event_invitations.event_id
        AND public.dayof_has_site_role(ie.wedding_site_id, ARRAY['owner','coordinator'])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM itinerary_events ie
      WHERE ie.id = event_invitations.event_id
        AND public.dayof_has_site_role(ie.wedding_site_id, ARRAY['owner','coordinator'])
    )
  );

-- planning tables
DROP POLICY IF EXISTS "RBAC planning tasks read" ON planning_tasks;
CREATE POLICY "RBAC planning tasks read"
  ON planning_tasks FOR SELECT
  TO authenticated
  USING (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','coordinator','viewer']));

DROP POLICY IF EXISTS "RBAC planning tasks write" ON planning_tasks;
CREATE POLICY "RBAC planning tasks write"
  ON planning_tasks FOR ALL
  TO authenticated
  USING (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','coordinator']))
  WITH CHECK (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','coordinator']));

DROP POLICY IF EXISTS "RBAC planning vendors read" ON planning_vendors;
CREATE POLICY "RBAC planning vendors read"
  ON planning_vendors FOR SELECT
  TO authenticated
  USING (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','coordinator','viewer']));

DROP POLICY IF EXISTS "RBAC planning vendors write" ON planning_vendors;
CREATE POLICY "RBAC planning vendors write"
  ON planning_vendors FOR ALL
  TO authenticated
  USING (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','coordinator']))
  WITH CHECK (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','coordinator']));

DROP POLICY IF EXISTS "RBAC planning budget read" ON planning_budget_items;
CREATE POLICY "RBAC planning budget read"
  ON planning_budget_items FOR SELECT
  TO authenticated
  USING (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','coordinator','viewer']));

DROP POLICY IF EXISTS "RBAC planning budget write" ON planning_budget_items;
CREATE POLICY "RBAC planning budget write"
  ON planning_budget_items FOR ALL
  TO authenticated
  USING (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','coordinator']))
  WITH CHECK (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','coordinator']));
