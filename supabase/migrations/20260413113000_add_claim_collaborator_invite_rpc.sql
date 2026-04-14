CREATE OR REPLACE FUNCTION public.claim_collaborator_invite(p_invite_token text)
RETURNS TABLE (
  wedding_site_id uuid,
  role text,
  invite_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite wedding_site_collaborator_invites%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT *
  INTO v_invite
  FROM wedding_site_collaborator_invites
  WHERE invite_token = p_invite_token
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;

  IF v_invite.status = 'revoked' THEN
    RAISE EXCEPTION 'Invite revoked';
  END IF;

  IF v_invite.status = 'accepted' THEN
    RETURN QUERY
    SELECT v_invite.wedding_site_id, v_invite.role::text, v_invite.id;
    RETURN;
  END IF;

  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < now() THEN
    RAISE EXCEPTION 'Invite expired';
  END IF;

  IF lower(coalesce(v_invite.invite_email, '')) <> lower(coalesce((auth.jwt() ->> 'email')::text, '')) THEN
    RAISE EXCEPTION 'Invite email mismatch';
  END IF;

  INSERT INTO wedding_site_collaborators (wedding_site_id, user_id, role, invited_by, permissions)
  VALUES (v_invite.wedding_site_id, auth.uid(), v_invite.role::collaborator_role, v_invite.invited_by, COALESCE(v_invite.permissions, '[]'::jsonb))
  ON CONFLICT (wedding_site_id, user_id)
  DO UPDATE SET role = EXCLUDED.role, permissions = EXCLUDED.permissions, updated_at = now();

  UPDATE wedding_site_collaborator_invites
  SET status = 'accepted',
      accepted_user_id = auth.uid(),
      accepted_at = now(),
      updated_at = now()
  WHERE id = v_invite.id;

  RETURN QUERY
  SELECT v_invite.wedding_site_id, v_invite.role::text, v_invite.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_collaborator_invite(text) TO authenticated;
