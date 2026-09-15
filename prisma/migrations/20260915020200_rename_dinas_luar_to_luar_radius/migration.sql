-- `WorkMode.DINAS_LUAR` (out-of-radius attendance claim) is being renamed to
-- `LUAR_RADIUS` so it stops colliding with the unrelated `FieldAssignment`
-- ("Dinas Luar") feature, which is a pre-approved assignment, not a GPS claim.
ALTER TYPE "WorkMode" RENAME VALUE 'DINAS_LUAR' TO 'LUAR_RADIUS';
