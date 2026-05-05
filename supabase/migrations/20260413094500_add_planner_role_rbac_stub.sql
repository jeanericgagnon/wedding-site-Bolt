/*
  Planner-aware RBAC migration stub.
  Safe scaffold only — documents intended role expansion and policy targets.
  Do not treat this as final production RBAC until all affected tables/policies are fully updated and tested.
*/

-- 1) Expand collaborator role enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'collaborator_role'
      AND e.enumlabel = 'planner'
  ) THEN
    ALTER TYPE collaborator_role ADD VALUE 'planner';
  END IF;
END $$;
-- 2) Invite table role constraint target (stub note)
-- Recommended follow-up:
-- add CHECK (role IN ('owner','planner','coordinator','viewer'))
-- on wedding_site_collaborator_invites once flow is stable.

-- 3) Policy target examples (documentation stub)
-- Reads should generally become:
--   owner / planner / coordinator / viewer
-- Writes should follow collaborator-permission-matrix.md
--   guests: owner / planner / coordinator
--   messages: owner / planner
--   itinerary: owner / planner / coordinator
--   planning tasks: owner / planner / coordinator
--   vendors: owner / planner
--   budget: owner / planner
--   seating: owner / planner / coordinator

-- 4) Actual policy rewrites intentionally deferred to the next migration pass
-- after per-table verification.;
