/*
  Planner-aware RBAC policy pass 2.
  Extends planner support to remaining identified policy groups.
*/

-- event invitations
DROP POLICY IF EXISTS "RBAC event invitations read" ON event_invitations;
CREATE POLICY "RBAC event invitations read"
  ON event_invitations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM itinerary_events ie
      WHERE ie.id = event_invitations.event_id
        AND public.dayof_has_site_role(ie.wedding_site_id, ARRAY['owner','planner','coordinator','viewer'])
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
        AND public.dayof_has_site_role(ie.wedding_site_id, ARRAY['owner','planner','coordinator'])
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM itinerary_events ie
      WHERE ie.id = event_invitations.event_id
        AND public.dayof_has_site_role(ie.wedding_site_id, ARRAY['owner','planner','coordinator'])
    )
  );
-- guest qna
DROP POLICY IF EXISTS "QNA read for site collaborators" ON guest_qna_items;
CREATE POLICY "QNA read for site collaborators"
  ON guest_qna_items FOR SELECT
  TO authenticated
  USING (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','planner','coordinator','viewer']));
DROP POLICY IF EXISTS "QNA write for owner and coordinator" ON guest_qna_items;
CREATE POLICY "QNA write for owner and coordinator"
  ON guest_qna_items FOR ALL
  TO authenticated
  USING (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','planner','coordinator']))
  WITH CHECK (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','planner','coordinator']));
-- rsvp waitlist
DROP POLICY IF EXISTS "Waitlist read for site collaborators" ON rsvp_waitlist_entries;
CREATE POLICY "Waitlist read for site collaborators"
  ON rsvp_waitlist_entries FOR SELECT
  TO authenticated
  USING (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','planner','coordinator','viewer']));
DROP POLICY IF EXISTS "Waitlist write owner coordinator" ON rsvp_waitlist_entries;
CREATE POLICY "Waitlist write owner coordinator"
  ON rsvp_waitlist_entries FOR ALL
  TO authenticated
  USING (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','planner','coordinator']))
  WITH CHECK (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','planner','coordinator']));
