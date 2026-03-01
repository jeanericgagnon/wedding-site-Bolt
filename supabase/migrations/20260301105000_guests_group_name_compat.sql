-- Compatibility: some environments are missing guests.group_name used by CSV import v2
ALTER TABLE public.guests
  ADD COLUMN IF NOT EXISTS group_name text;