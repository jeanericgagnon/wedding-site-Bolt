DROP POLICY IF EXISTS "Public can read collaborator invite by token" ON wedding_site_collaborator_invites;

CREATE POLICY "Public can read collaborator invite by token"
ON wedding_site_collaborator_invites
FOR SELECT
USING (status IN ('pending', 'accepted') AND revoked_at IS NULL);
