DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'seating_assignments_seating_event_id_guest_id_key'
      AND conrelid = 'public.seating_assignments'::regclass
  ) THEN
    ALTER TABLE public.seating_assignments
      ADD CONSTRAINT seating_assignments_seating_event_id_guest_id_key
      UNIQUE (seating_event_id, guest_id);
  END IF;
END $$;
