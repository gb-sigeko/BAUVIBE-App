-- CreateTable
CREATE TABLE "ProjectContact" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "contactPersonId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "isMainContact" BOOLEAN NOT NULL DEFAULT false,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "ProjectContact_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectContact_projectId_idx" ON "ProjectContact"("projectId");
CREATE INDEX "ProjectContact_contactPersonId_idx" ON "ProjectContact"("contactPersonId");

ALTER TABLE "ProjectContact" ADD CONSTRAINT "ProjectContact_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectContact" ADD CONSTRAINT "ProjectContact_contactPersonId_fkey" FOREIGN KEY ("contactPersonId") REFERENCES "ContactPerson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
