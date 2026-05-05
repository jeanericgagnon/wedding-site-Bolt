/*
  Let paid-site collaborators pass the existing guest payment gate.

  The permission-key policy decides whether the user can write guests. This
  restrictive payment policy should only ensure the wedding site itself is
  active, not require the current user to be the couple owner.
*/

CREATE OR REPLACE FUNCTION public.dayof_site_payment_active_for_access(site_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.wedding_sites ws
      WHERE ws.id = site_id
        AND (
          COALESCE(ws.payment_status, 'active') = 'active'
          OR ws.user_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.wedding_site_collaborators wsc
            WHERE wsc.wedding_site_id = ws.id
              AND wsc.user_id = auth.uid()
          )
        )
    );
$$;

DROP POLICY IF EXISTS "Paid access required" ON public.guests;
CREATE POLICY "Paid access required"
  ON public.guests
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (public.dayof_site_payment_active_for_access(wedding_site_id))
  WITH CHECK (public.dayof_site_payment_active_for_access(wedding_site_id));
