-- Hardening: upload rate limit log

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'photo_albums'
  ) THEN
    EXECUTE '
      CREATE TABLE IF NOT EXISTS public.photo_upload_attempts (
        id uuid primary key default gen_random_uuid(),
        photo_album_id uuid not null references public.photo_albums(id) on delete cascade,
        token_hash text not null,
        requester_ip text,
        attempted_at timestamptz not null default now(),
        file_count int not null default 0,
        total_bytes bigint not null default 0
      )
    ';

    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_photo_upload_attempts_album_time ON public.photo_upload_attempts(photo_album_id, attempted_at desc)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_photo_upload_attempts_ip_time ON public.photo_upload_attempts(requester_ip, attempted_at desc) WHERE requester_ip is not null';
    EXECUTE 'ALTER TABLE public.photo_upload_attempts ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "photo_upload_attempts_owner_select" ON public.photo_upload_attempts';
    EXECUTE '
      CREATE POLICY "photo_upload_attempts_owner_select"
      ON public.photo_upload_attempts
      FOR SELECT
      TO authenticated
      USING (
        exists (
          select 1
          from public.photo_albums pa
          join public.wedding_sites ws on ws.id = pa.wedding_site_id
          where pa.id = photo_upload_attempts.photo_album_id
            and ws.user_id = auth.uid()
        )
      )
    ';
  END IF;
END $$;
