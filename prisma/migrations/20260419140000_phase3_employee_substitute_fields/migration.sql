-- CreateEnum
CREATE TYPE "EmployeeJobRole" AS ENUM ('SIKOGO', 'BUERO', 'GF', 'EXTERN');

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "qualifications" JSONB,
ADD COLUMN     "contactInfo" JSONB,
ADD COLUMN     "jobRole" "EmployeeJobRole";

-- AlterTable
ALTER TABLE "Substitution" ADD COLUMN     "priority" INTEGER;
