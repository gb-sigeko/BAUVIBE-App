-- AlterTable
ALTER TABLE "Communication" ADD COLUMN "erledigt" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Communication_followUp_erledigt_idx" ON "Communication"("followUp", "erledigt");
