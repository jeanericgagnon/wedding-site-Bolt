/*
  Planner-aware RBAC policy pass 1.
  First concrete rewrite pass for planner role support.
  Safe but real: updates policy arrays on already-identified tables.
*/

-- guests
DROP POLICY IF EXISTS "RBAC guests read" ON guests;
CREATE POLICY "RBAC guests read"
  ON guests FOR SELECT
  TO authenticated
  USING (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','planner','coordinator','viewer']));
DROP POLICY IF EXISTS "RBAC guests write" ON guests;
CREATE POLICY "RBAC guests write"
  ON guests FOR ALL
  TO authenticated
  USING (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','planner','coordinator']))
  WITH CHECK (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','planner','coordinator']));
-- messages
DROP POLICY IF EXISTS "RBAC messages read" ON messages;
CREATE POLICY "RBAC messages read"
  ON messages FOR SELECT
  TO authenticated
  USING (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','planner','coordinator','viewer']));
DROP POLICY IF EXISTS "RBAC messages write" ON messages;
CREATE POLICY "RBAC messages write"
  ON messages FOR ALL
  TO authenticated
  USING (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','planner']))
  WITH CHECK (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','planner']));
-- itinerary events
DROP POLICY IF EXISTS "RBAC itinerary events read" ON itinerary_events;
CREATE POLICY "RBAC itinerary events read"
  ON itinerary_events FOR SELECT
  TO authenticated
  USING (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','planner','coordinator','viewer']));
DROP POLICY IF EXISTS "RBAC itinerary events write" ON itinerary_events;
CREATE POLICY "RBAC itinerary events write"
  ON itinerary_events FOR ALL
  TO authenticated
  USING (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','planner','coordinator']))
  WITH CHECK (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','planner','coordinator']));
-- planning tasks
DROP POLICY IF EXISTS "RBAC planning tasks read" ON planning_tasks;
CREATE POLICY "RBAC planning tasks read"
  ON planning_tasks FOR SELECT
  TO authenticated
  USING (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','planner','coordinator','viewer']));
DROP POLICY IF EXISTS "RBAC planning tasks write" ON planning_tasks;
CREATE POLICY "RBAC planning tasks write"
  ON planning_tasks FOR ALL
  TO authenticated
  USING (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','planner','coordinator']))
  WITH CHECK (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','planner','coordinator']));
-- vendors
DROP POLICY IF EXISTS "RBAC planning vendors read" ON planning_vendors;
CREATE POLICY "RBAC planning vendors read"
  ON planning_vendors FOR SELECT
  TO authenticated
  USING (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','planner','coordinator','viewer']));
DROP POLICY IF EXISTS "RBAC planning vendors write" ON planning_vendors;
CREATE POLICY "RBAC planning vendors write"
  ON planning_vendors FOR ALL
  TO authenticated
  USING (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','planner']))
  WITH CHECK (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','planner']));
-- budget
DROP POLICY IF EXISTS "RBAC planning budget read" ON planning_budget_items;
CREATE POLICY "RBAC planning budget read"
  ON planning_budget_items FOR SELECT
  TO authenticated
  USING (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','planner','coordinator','viewer']));
DROP POLICY IF EXISTS "RBAC planning budget write" ON planning_budget_items;
CREATE POLICY "RBAC planning budget write"
  ON planning_budget_items FOR ALL
  TO authenticated
  USING (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','planner']))
  WITH CHECK (public.dayof_has_site_role(wedding_site_id, ARRAY['owner','planner']));
