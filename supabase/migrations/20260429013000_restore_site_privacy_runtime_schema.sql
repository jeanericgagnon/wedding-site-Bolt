/*
  # Restore site privacy runtime schema

  Production migration history can show the original privacy migration as applied even
  when the runtime columns are absent. This forward-only repair keeps the dashboard,
  public site access checks, and invite-only token generation aligned with the code.
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'wedding_sites'
      AND column_name = 'privacy_mode'
  ) THEN
    ALTER TABLE public.wedding_sites
      ADD COLUMN privacy_mode text NOT NULL DEFAULT 'public';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.wedding_sites'::regclass
      AND conname = 'wedding_sites_privacy_mode_check'
  ) THEN
    ALTER TABLE public.wedding_sites
      ADD CONSTRAINT wedding_sites_privacy_mode_check
      CHECK (privacy_mode IN ('public', 'password_protected', 'invite_only'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'wedding_sites'
      AND column_name = 'site_password_hash'
  ) THEN
    ALTER TABLE public.wedding_sites ADD COLUMN site_password_hash text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'wedding_sites'
      AND column_name = 'hide_from_search'
  ) THEN
    ALTER TABLE public.wedding_sites ADD COLUMN hide_from_search boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'wedding_sites'
      AND column_name = 'default_language'
  ) THEN
    ALTER TABLE public.wedding_sites ADD COLUMN default_language text NOT NULL DEFAULT 'en';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'wedding_sites'
      AND column_name = 'guest_access_token'
  ) THEN
    ALTER TABLE public.wedding_sites ADD COLUMN guest_access_token text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'wedding_sites'
      AND column_name = 'notification_prefs'
  ) THEN
    ALTER TABLE public.wedding_sites
      ADD COLUMN notification_prefs jsonb DEFAULT '{"rsvp": true, "photos": true, "digest": false, "updates": false}'::jsonb;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS wedding_sites_guest_access_token_key
  ON public.wedding_sites (guest_access_token)
  WHERE guest_access_token IS NOT NULL;

CREATE OR REPLACE FUNCTION public.generate_secure_token(byte_length int DEFAULT 32)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT encode(extensions.gen_random_bytes(byte_length), 'base64url');
$$;

GRANT EXECUTE ON FUNCTION public.generate_secure_token(int) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.check_site_password(p_slug text, p_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
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

  RETURN v_hash = extensions.crypt(p_password, v_hash);
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_site_password(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.hash_site_password(p_password text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN extensions.crypt(p_password, extensions.gen_salt('bf', 12));
END;
$$;

GRANT EXECUTE ON FUNCTION public.hash_site_password(text) TO authenticated;
