-- Simplify approval flow: admin no longer approves izin/cuti/sakit/lembur.
-- Existing PENDING rows at the old ADMIN stage move to SUPERVISOR (the new
-- first stage for employee/admin submitters); already-decided rows move to
-- DONE, since stage only matters while a request is still PENDING.
UPDATE "LeaveRequest" SET "stage" = 'SUPERVISOR' WHERE "stage" = 'ADMIN' AND "status" = 'PENDING';
UPDATE "LeaveRequest" SET "stage" = 'DONE' WHERE "stage" = 'ADMIN' AND "status" IN ('APPROVED', 'REJECTED');

UPDATE "Overtime" SET "stage" = 'SUPERVISOR' WHERE "stage" = 'ADMIN' AND "status" = 'PENDING';
UPDATE "Overtime" SET "stage" = 'DONE' WHERE "stage" = 'ADMIN' AND "status" IN ('APPROVED', 'REJECTED');

-- AlterEnum
BEGIN;
CREATE TYPE "LeaveStage_new" AS ENUM ('SUPERVISOR', 'MANAGER', 'DONE');
ALTER TABLE "public"."LeaveRequest" ALTER COLUMN "stage" DROP DEFAULT;
ALTER TABLE "LeaveRequest" ALTER COLUMN "stage" TYPE "LeaveStage_new" USING ("stage"::text::"LeaveStage_new");
ALTER TYPE "LeaveStage" RENAME TO "LeaveStage_old";
ALTER TYPE "LeaveStage_new" RENAME TO "LeaveStage";
DROP TYPE "public"."LeaveStage_old";
ALTER TABLE "LeaveRequest" ALTER COLUMN "stage" SET DEFAULT 'SUPERVISOR';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "OvertimeStage_new" AS ENUM ('SUPERVISOR', 'MANAGER', 'DONE');
ALTER TABLE "public"."Overtime" ALTER COLUMN "stage" DROP DEFAULT;
ALTER TABLE "Overtime" ALTER COLUMN "stage" TYPE "OvertimeStage_new" USING ("stage"::text::"OvertimeStage_new");
ALTER TYPE "OvertimeStage" RENAME TO "OvertimeStage_old";
ALTER TYPE "OvertimeStage_new" RENAME TO "OvertimeStage";
DROP TYPE "public"."OvertimeStage_old";
ALTER TABLE "Overtime" ALTER COLUMN "stage" SET DEFAULT 'SUPERVISOR';
COMMIT;
