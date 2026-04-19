-- CreateTable
CREATE TABLE "Tour" (
    "id" TEXT NOT NULL,
    "isoYear" INTEGER NOT NULL,
    "isoWeek" INTEGER NOT NULL,
    "date" TIMESTAMP(3),
    "employeeId" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "sortOrder" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'geplant',
    "conflictFlag" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tour_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Tour_isoYear_isoWeek_idx" ON "Tour"("isoYear", "isoWeek");

-- CreateIndex
CREATE INDEX "Tour_employeeId_isoYear_isoWeek_idx" ON "Tour"("employeeId", "isoYear", "isoWeek");

-- AddForeignKey
ALTER TABLE "Tour" ADD CONSTRAINT "Tour_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanungEntry" ADD CONSTRAINT "PlanungEntry_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "Tour"("id") ON DELETE SET NULL ON UPDATE CASCADE;
