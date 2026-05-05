/*
  # Fix collaborator claim output-name ambiguity

  Keep output column names distinct from table columns so PL/pgSQL does not
  confuse returned fields with wedding_site_id/user_id columns at runtime.
*/

DROP FUNCTION IF EXISTS public.claim_collaborator_invite(text);

CREATE FUNCTION public.claim_collaborator_invite(p_invite_token text)
RETURNS TABLE (
  out_wedding_site_id uuid,
  out_role text,
  out_invite_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite public.wedding_site_collaborator_invites%ROWTYPE;
  v_auth_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT users.email
  INTO v_auth_email
  FROM auth.users AS users
  WHERE users.id = auth.uid();

  SELECT *
  INTO v_invite
  FROM public.wedding_site_collaborator_invites AS invite_row
  WHERE invite_row.invite_token = p_invite_token
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;

  IF v_invite.status = 'revoked' THEN
    RAISE EXCEPTION 'Invite revoked';
  END IF;

  IF v_invite.status = 'accepted' THEN
    RETURN QUERY SELECT v_invite.wedding_site_id, v_invite.role::text, v_invite.id;
    RETURN;
  END IF;

  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < now() THEN
    RAISE EXCEPTION 'Invite expired';
  END IF;

  IF lower(coalesce(v_invite.invite_email, '')) <> lower(coalesce(v_auth_email, '')) THEN
    RAISE EXCEPTION 'Invite email mismatch';
  END IF;

  INSERT INTO public.wedding_site_collaborators (
    wedding_site_id,
    user_id,
    role,
    invited_by,
    permissions
  ) VALUES (
    v_invite.wedding_site_id,
    auth.uid(),
    v_invite.role::public.collaborator_role,
    v_invite.invited_by,
    coalesce(v_invite.permissions, '[]'::jsonb)
  )
  ON CONFLICT (wedding_site_id, user_id)
  DO UPDATE SET
    role = EXCLUDED.role,
    permissions = EXCLUDED.permissions,
    updated_at = now();

  UPDATE public.wedding_site_collaborator_invites AS invite_row
  SET status = 'accepted',
      accepted_user_id = auth.uid(),
      accepted_at = now(),
      updated_at = now()
  WHERE invite_row.id = v_invite.id;

  RETURN QUERY SELECT v_invite.wedding_site_id, v_invite.role::text, v_invite.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_collaborator_invite(text) TO authenticated;
