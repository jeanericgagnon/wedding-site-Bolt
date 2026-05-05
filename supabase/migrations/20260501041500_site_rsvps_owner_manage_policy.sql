-- Let site owners and permitted collaborators clean up public-site RSVP widget
-- replies. Public guests can still only insert rows for published sites.

DROP POLICY IF EXISTS "Site team can delete site RSVPs" ON public.site_rsvps;
CREATE POLICY "Site team can delete site RSVPs"
  ON public.site_rsvps
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.wedding_sites ws
      WHERE ws.id = site_rsvps.wedding_site_id
        AND ws.user_id = auth.uid()
    )
    OR public.dayof_has_site_role(site_rsvps.wedding_site_id, ARRAY['owner','coordinator','planner'])
  );
