ALTER TABLE "students"
  ALTER COLUMN "departmentId" DROP NOT NULL,
  ALTER COLUMN "departmentId" DROP DEFAULT;

ALTER TABLE "teachers"
  ALTER COLUMN "departmentId" DROP NOT NULL,
  ALTER COLUMN "departmentId" DROP DEFAULT;

ALTER TABLE "courses"
  ALTER COLUMN "teacherId" DROP NOT NULL,
  ALTER COLUMN "teacherId" DROP DEFAULT,
  ALTER COLUMN "departmentId" DROP NOT NULL,
  ALTER COLUMN "departmentId" DROP DEFAULT;

UPDATE "students" SET "departmentId" = NULL WHERE "departmentId" = '';
UPDATE "teachers" SET "departmentId" = NULL WHERE "departmentId" = '';
UPDATE "courses" SET "teacherId" = NULL WHERE "teacherId" = '';
UPDATE "courses" SET "departmentId" = NULL WHERE "departmentId" = '';
