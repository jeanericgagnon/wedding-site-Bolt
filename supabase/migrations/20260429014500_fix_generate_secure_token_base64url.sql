/*
  # Fix generate_secure_token encoding

  Supabase Postgres supports `encode(..., 'base64')`, not `base64url`.
  Convert standard base64 to URL-safe output and remove padding.
*/

CREATE OR REPLACE FUNCTION public.generate_secure_token(byte_length int DEFAULT 32)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT translate(rtrim(encode(extensions.gen_random_bytes(byte_length), 'base64'), '='), '+/', '-_');
$$;

GRANT EXECUTE ON FUNCTION public.generate_secure_token(int) TO anon, authenticated, service_role;
