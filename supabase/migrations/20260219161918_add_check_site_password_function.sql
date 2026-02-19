/*
  # Add check_site_password Postgres function

  ## Purpose
  - Allows the public site renderer to verify a visitor-supplied password against the
    stored bcrypt hash without exposing the hash to the client.
  - Uses `extensions.crypt` (pgcrypto) for secure constant-time comparison.

  ## Security
  - Function is `SECURITY DEFINER` so it can read `site_password_hash` even when RLS
    restricts anonymous access.
  - Returns boolean only — hash is never returned to the caller.
  - Lookup is by `site_slug` so the caller never needs a site ID.
*/

CREATE OR REPLACE FUNCTION public.check_site_password(p_slug text, p_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash text;
BEGIN
  SELECT site_password_hash
  INTO v_hash
  FROM public.wedding_sites
  WHERE site_slug = p_slug
  LIMIT 1;

  IF v_hash IS NULL THEN
    RETURN false;
  END IF;

  -- Use pgcrypto crypt() for bcrypt comparison
  RETURN v_hash = crypt(p_password, v_hash);
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_site_password(text, text) TO anon, authenticated;
