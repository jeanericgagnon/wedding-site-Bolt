-- Relax guest_audit_logs -> guests FK to allow logging deletes without FK violations.
-- On delete, audit rows intentionally outlive guest rows for history purposes.
ALTER TABLE public.guest_audit_logs
  DROP CONSTRAINT IF EXISTS guest_audit_logs_guest_id_fkey;