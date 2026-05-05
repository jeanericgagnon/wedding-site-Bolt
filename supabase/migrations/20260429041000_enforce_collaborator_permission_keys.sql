/*
  Enforce collaborator permission keys at the database policy layer.

  Role still matters for labels and defaults, but write/read access now checks
  the concrete permissions copied from the accepted invite.
*/

UPDATE public.wedding_site_collaborators
SET permissions = CASE role::text
  WHEN 'planner' THEN '["guests","messages","planning","budget","vendors","seating","timeline","coordinator","photos","registry","settings"]'::jsonb
  WHEN 'coordinator' THEN '["guests","messages","planning","seating","timeline","coordinator","photos"]'::jsonb
  WHEN 'viewer' THEN '[]'::jsonb
  ELSE permissions
END
WHERE jsonb_typeof(permissions) = 'array'
  AND jsonb_array_length(permissions) = 0;

UPDATE public.wedding_site_collaborator_invites
SET permissions = CASE role
  WHEN 'planner' THEN '["guests","messages","planning","budget","vendors","seating","timeline","coordinator","photos","registry","settings"]'::jsonb
  WHEN 'coordinator' THEN '["guests","messages","planning","seating","timeline","coordinator","photos"]'::jsonb
  WHEN 'viewer' THEN '[]'::jsonb
  ELSE permissions
END
WHERE jsonb_typeof(permissions) = 'array'
  AND jsonb_array_length(permissions) = 0;

CREATE OR REPLACE FUNCTION public.dayof_has_site_permission(site_id uuid, permission_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.wedding_sites ws
      WHERE ws.id = site_id
        AND ws.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.wedding_site_collaborators wsc
      WHERE wsc.wedding_site_id = site_id
        AND wsc.user_id = auth.uid()
        AND wsc.permissions ? permission_key
    );
$$;

-- Guests / RSVP operations
DROP POLICY IF EXISTS "RBAC guests read" ON public.guests;
CREATE POLICY "RBAC guests read"
  ON public.guests FOR SELECT
  TO authenticated
  USING (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','planner','coordinator','viewer']) OR public.dayof_has_site_permission(wedding_site_id, 'guests'));
DROP POLICY IF EXISTS "RBAC guests write" ON public.guests;
CREATE POLICY "RBAC guests write"
  ON public.guests FOR ALL
  TO authenticated
  USING (public.dayof_has_site_permission(wedding_site_id, 'guests'))
  WITH CHECK (public.dayof_has_site_permission(wedding_site_id, 'guests'));

-- Messaging
DROP POLICY IF EXISTS "RBAC messages read" ON public.messages;
CREATE POLICY "RBAC messages read"
  ON public.messages FOR SELECT
  TO authenticated
  USING (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','planner','coordinator','viewer']) OR public.dayof_has_site_permission(wedding_site_id, 'messages'));
DROP POLICY IF EXISTS "RBAC messages write" ON public.messages;
CREATE POLICY "RBAC messages write"
  ON public.messages FOR ALL
  TO authenticated
  USING (public.dayof_has_site_permission(wedding_site_id, 'messages'))
  WITH CHECK (public.dayof_has_site_permission(wedding_site_id, 'messages'));

-- Timeline / itinerary
DROP POLICY IF EXISTS "RBAC itinerary events read" ON public.itinerary_events;
CREATE POLICY "RBAC itinerary events read"
  ON public.itinerary_events FOR SELECT
  TO authenticated
  USING (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','planner','coordinator','viewer']) OR public.dayof_has_site_permission(wedding_site_id, 'timeline'));
DROP POLICY IF EXISTS "RBAC itinerary events write" ON public.itinerary_events;
CREATE POLICY "RBAC itinerary events write"
  ON public.itinerary_events FOR ALL
  TO authenticated
  USING (public.dayof_has_site_permission(wedding_site_id, 'timeline'))
  WITH CHECK (public.dayof_has_site_permission(wedding_site_id, 'timeline'));

DROP POLICY IF EXISTS "RBAC event invitations read" ON public.event_invitations;
CREATE POLICY "RBAC event invitations read"
  ON public.event_invitations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.itinerary_events ie
      WHERE ie.id = event_invitations.event_id
        AND (
          public.dayof_has_site_role(ie.wedding_site_id, ARRAY['owner','planner','coordinator','viewer'])
          OR public.dayof_has_site_permission(ie.wedding_site_id, 'timeline')
        )
    )
  );
DROP POLICY IF EXISTS "RBAC event invitations write" ON public.event_invitations;
CREATE POLICY "RBAC event invitations write"
  ON public.event_invitations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.itinerary_events ie
      WHERE ie.id = event_invitations.event_id
        AND public.dayof_has_site_permission(ie.wedding_site_id, 'timeline')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.itinerary_events ie
      WHERE ie.id = event_invitations.event_id
        AND public.dayof_has_site_permission(ie.wedding_site_id, 'timeline')
    )
  );

-- Planning
DROP POLICY IF EXISTS "RBAC planning tasks read" ON public.planning_tasks;
CREATE POLICY "RBAC planning tasks read"
  ON public.planning_tasks FOR SELECT
  TO authenticated
  USING (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','planner','coordinator','viewer']) OR public.dayof_has_site_permission(wedding_site_id, 'planning'));
DROP POLICY IF EXISTS "RBAC planning tasks write" ON public.planning_tasks;
CREATE POLICY "RBAC planning tasks write"
  ON public.planning_tasks FOR ALL
  TO authenticated
  USING (public.dayof_has_site_permission(wedding_site_id, 'planning'))
  WITH CHECK (public.dayof_has_site_permission(wedding_site_id, 'planning'));

DROP POLICY IF EXISTS "RBAC planning vendors read" ON public.planning_vendors;
CREATE POLICY "RBAC planning vendors read"
  ON public.planning_vendors FOR SELECT
  TO authenticated
  USING (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','planner','coordinator','viewer']) OR public.dayof_has_site_permission(wedding_site_id, 'vendors'));
DROP POLICY IF EXISTS "RBAC planning vendors write" ON public.planning_vendors;
CREATE POLICY "RBAC planning vendors write"
  ON public.planning_vendors FOR ALL
  TO authenticated
  USING (public.dayof_has_site_permission(wedding_site_id, 'vendors'))
  WITH CHECK (public.dayof_has_site_permission(wedding_site_id, 'vendors'));

DROP POLICY IF EXISTS "RBAC planning budget read" ON public.planning_budget_items;
CREATE POLICY "RBAC planning budget read"
  ON public.planning_budget_items FOR SELECT
  TO authenticated
  USING (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','planner','coordinator','viewer']) OR public.dayof_has_site_permission(wedding_site_id, 'budget'));
DROP POLICY IF EXISTS "RBAC planning budget write" ON public.planning_budget_items;
CREATE POLICY "RBAC planning budget write"
  ON public.planning_budget_items FOR ALL
  TO authenticated
  USING (public.dayof_has_site_permission(wedding_site_id, 'budget'))
  WITH CHECK (public.dayof_has_site_permission(wedding_site_id, 'budget'));

-- Seating
DROP POLICY IF EXISTS "RBAC seating events read" ON public.seating_events;
CREATE POLICY "RBAC seating events read"
  ON public.seating_events FOR SELECT
  TO authenticated
  USING (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','planner','coordinator','viewer']) OR public.dayof_has_site_permission(wedding_site_id, 'seating'));
DROP POLICY IF EXISTS "RBAC seating events write" ON public.seating_events;
CREATE POLICY "RBAC seating events write"
  ON public.seating_events FOR ALL
  TO authenticated
  USING (public.dayof_has_site_permission(wedding_site_id, 'seating'))
  WITH CHECK (public.dayof_has_site_permission(wedding_site_id, 'seating'));

DROP POLICY IF EXISTS "RBAC seating tables read" ON public.seating_tables;
CREATE POLICY "RBAC seating tables read"
  ON public.seating_tables FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.seating_events se
      WHERE se.id = seating_tables.seating_event_id
        AND (
          public.dayof_has_site_role(se.wedding_site_id, ARRAY['owner','planner','coordinator','viewer'])
          OR public.dayof_has_site_permission(se.wedding_site_id, 'seating')
        )
    )
  );
DROP POLICY IF EXISTS "RBAC seating tables write" ON public.seating_tables;
CREATE POLICY "RBAC seating tables write"
  ON public.seating_tables FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.seating_events se
      WHERE se.id = seating_tables.seating_event_id
        AND public.dayof_has_site_permission(se.wedding_site_id, 'seating')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.seating_events se
      WHERE se.id = seating_tables.seating_event_id
        AND public.dayof_has_site_permission(se.wedding_site_id, 'seating')
    )
  );

DROP POLICY IF EXISTS "RBAC seating assignments read" ON public.seating_assignments;
CREATE POLICY "RBAC seating assignments read"
  ON public.seating_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.seating_events se
      WHERE se.id = seating_assignments.seating_event_id
        AND (
          public.dayof_has_site_role(se.wedding_site_id, ARRAY['owner','planner','coordinator','viewer'])
          OR public.dayof_has_site_permission(se.wedding_site_id, 'seating')
        )
    )
  );
DROP POLICY IF EXISTS "RBAC seating assignments write" ON public.seating_assignments;
CREATE POLICY "RBAC seating assignments write"
  ON public.seating_assignments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.seating_events se
      WHERE se.id = seating_assignments.seating_event_id
        AND public.dayof_has_site_permission(se.wedding_site_id, 'seating')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.seating_events se
      WHERE se.id = seating_assignments.seating_event_id
        AND public.dayof_has_site_permission(se.wedding_site_id, 'seating')
    )
  );

-- Coordinator Q&A / waitlist
DROP POLICY IF EXISTS "QNA read for site collaborators" ON public.guest_qna_items;
CREATE POLICY "QNA read for site collaborators"
  ON public.guest_qna_items FOR SELECT
  TO authenticated
  USING (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','planner','coordinator','viewer']) OR public.dayof_has_site_permission(wedding_site_id, 'coordinator'));
DROP POLICY IF EXISTS "QNA write for owner and coordinator" ON public.guest_qna_items;
CREATE POLICY "QNA write for owner and coordinator"
  ON public.guest_qna_items FOR ALL
  TO authenticated
  USING (public.dayof_has_site_permission(wedding_site_id, 'coordinator'))
  WITH CHECK (public.dayof_has_site_permission(wedding_site_id, 'coordinator'));

DROP POLICY IF EXISTS "Waitlist read for site collaborators" ON public.rsvp_waitlist_entries;
CREATE POLICY "Waitlist read for site collaborators"
  ON public.rsvp_waitlist_entries FOR SELECT
  TO authenticated
  USING (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','planner','coordinator','viewer']) OR public.dayof_has_site_permission(wedding_site_id, 'guests'));
DROP POLICY IF EXISTS "Waitlist write owner coordinator" ON public.rsvp_waitlist_entries;
CREATE POLICY "Waitlist write owner coordinator"
  ON public.rsvp_waitlist_entries FOR ALL
  TO authenticated
  USING (public.dayof_has_site_permission(wedding_site_id, 'guests'))
  WITH CHECK (public.dayof_has_site_permission(wedding_site_id, 'guests'));

-- Registry and vault/media
DROP POLICY IF EXISTS "RBAC registry items read" ON public.registry_items;
CREATE POLICY "RBAC registry items read"
  ON public.registry_items FOR SELECT
  TO authenticated
  USING (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','planner','coordinator','viewer']) OR public.dayof_has_site_permission(wedding_site_id, 'registry'));
DROP POLICY IF EXISTS "RBAC registry items write" ON public.registry_items;
CREATE POLICY "RBAC registry items write"
  ON public.registry_items FOR ALL
  TO authenticated
  USING (public.dayof_has_site_permission(wedding_site_id, 'registry'))
  WITH CHECK (public.dayof_has_site_permission(wedding_site_id, 'registry'));

DROP POLICY IF EXISTS "Vault entries read for site collaborators" ON public.vault_entries;
CREATE POLICY "Vault entries read for site collaborators"
  ON public.vault_entries FOR SELECT
  TO authenticated
  USING (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','planner','coordinator','viewer']) OR public.dayof_has_site_permission(wedding_site_id, 'photos'));
DROP POLICY IF EXISTS "Vault entries write for site collaborators" ON public.vault_entries;
CREATE POLICY "Vault entries write for site collaborators"
  ON public.vault_entries FOR ALL
  TO authenticated
  USING (public.dayof_has_site_permission(wedding_site_id, 'photos'))
  WITH CHECK (public.dayof_has_site_permission(wedding_site_id, 'photos'));
