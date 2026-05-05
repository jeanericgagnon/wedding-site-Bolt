ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS sending_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS sending_finished_at timestamptz;
