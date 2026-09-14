-- Backfill any existing WFH claims to DINAS_LUAR before dropping the enum value.
-- WFH is no longer an allowed work mode.
UPDATE "Attendance" SET "workMode" = 'DINAS_LUAR' WHERE "workMode" = 'WFH';
UPDATE "Attendance" SET "approvedMode" = 'DINAS_LUAR' WHERE "approvedMode" = 'WFH';

-- Recreate the WorkMode enum without WFH (Postgres has no ALTER TYPE ... DROP VALUE).
ALTER TYPE "WorkMode" RENAME TO "WorkMode_old";
CREATE TYPE "WorkMode" AS ENUM ('HADIR_DIKANTOR', 'DINAS_LUAR', 'SAKIT', 'IZIN', 'CUTI');

ALTER TABLE "Attendance" ALTER COLUMN "workMode" DROP DEFAULT;
ALTER TABLE "Attendance" ALTER COLUMN "workMode" TYPE "WorkMode" USING ("workMode"::text::"WorkMode");
ALTER TABLE "Attendance" ALTER COLUMN "workMode" SET DEFAULT 'HADIR_DIKANTOR';
ALTER TABLE "Attendance" ALTER COLUMN "approvedMode" TYPE "WorkMode" USING ("approvedMode"::text::"WorkMode");

DROP TYPE "WorkMode_old";
