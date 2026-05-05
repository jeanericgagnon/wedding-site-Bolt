/*
  Collaborator invite table stub.
  Safe scaffold only — no live accept/revoke functions wired yet.
*/

CREATE TABLE IF NOT EXISTS wedding_site_collaborator_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_site_id uuid NOT NULL REFERENCES wedding_sites(id) ON DELETE CASCADE,
  invite_email text NOT NULL,
  invite_name text,
  role text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  invite_token text NOT NULL UNIQUE,
  invited_by uuid NOT NULL,
  accepted_user_id uuid,
  invited_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_collaborator_invites_site_id
  ON wedding_site_collaborator_invites (wedding_site_id);
CREATE INDEX IF NOT EXISTS idx_collaborator_invites_email
  ON wedding_site_collaborator_invites (invite_email);
ALTER TABLE wedding_site_collaborator_invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owners/admins can read collaborator invites" ON wedding_site_collaborator_invites;
CREATE POLICY "Owners/admins can read collaborator invites"
  ON wedding_site_collaborator_invites FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM wedding_sites ws
      WHERE ws.id = wedding_site_collaborator_invites.wedding_site_id
        AND ws.user_id = auth.uid()
    )
  );
DROP POLICY IF EXISTS "Owners/admins can manage collaborator invites" ON wedding_site_collaborator_invites;
CREATE POLICY "Owners/admins can manage collaborator invites"
  ON wedding_site_collaborator_invites FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM wedding_sites ws
      WHERE ws.id = wedding_site_collaborator_invites.wedding_site_id
        AND ws.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM wedding_sites ws
      WHERE ws.id = wedding_site_collaborator_invites.wedding_site_id
        AND ws.user_id = auth.uid()
    )
  );
