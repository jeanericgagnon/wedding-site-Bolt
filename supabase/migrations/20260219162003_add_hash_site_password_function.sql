/*
  # Add hash_site_password Postgres function

  ## Purpose
  - Allows the dashboard to hash a plain-text site password using bcrypt before storing it.
  - Keeps bcrypt logic server-side so the raw password never needs to travel further than the
    edge or the DB function call.

  ## Security
  - Function is `SECURITY DEFINER` — executes with definer rights.
  - Only authenticated users (couple owners) should call this; enforced by RLS on wedding_sites update.
  - Uses pgcrypto gen_salt with cost factor 12.
*/

CREATE OR REPLACE FUNCTION public.hash_site_password(p_password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN crypt(p_password, gen_salt('bf', 12));
END;
$$;

GRANT EXECUTE ON FUNCTION public.hash_site_password(text) TO authenticated;
