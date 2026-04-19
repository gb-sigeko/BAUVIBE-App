-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('entwurf', 'freigegeben', 'versendet', 'abgelehnt');

-- CreateEnum
CREATE TYPE "VKStatus" AS ENUM ('entwurf', 'pdf_erzeugt', 'versendet');

-- AlterTable
ALTER TABLE "Inspection" ADD COLUMN     "protokollPdf" TEXT,
ADD COLUMN     "textbausteine" JSONB,
ADD COLUMN     "uebersichtFoto" TEXT,
ADD COLUMN     "versendetAm" TIMESTAMP(3),
ADD COLUMN     "verteiler" JSONB NOT NULL DEFAULT '[]';

-- CreateTable
CREATE TABLE "Mangel" (
    "id" TEXT NOT NULL,
    "begehungId" TEXT NOT NULL,
    "fotoUrl" TEXT NOT NULL,
    "beschreibung" TEXT NOT NULL,
    "regel" TEXT,
    "textbausteinId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mangel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "emailInput" TEXT NOT NULL,
    "kalkulation" JSONB NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'entwurf',
    "freigegebenVonId" TEXT,
    "freigabeAm" TIMESTAMP(3),
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vorankuendigung" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "pdfFormular" TEXT NOT NULL,
    "arbeitsschutzAntworten" JSONB NOT NULL,
    "status" "VKStatus" NOT NULL DEFAULT 'entwurf',
    "generiertesPdf" TEXT,
    "versendetAm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vorankuendigung_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Textbaustein" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kategorie" TEXT NOT NULL,
    "inhalt" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Textbaustein_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Telefonnotiz" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "notiz" TEXT NOT NULL,
    "erfasstVon" TEXT NOT NULL,
    "erfasstAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "erledigt" BOOLEAN NOT NULL DEFAULT false,
    "followUp" TIMESTAMP(3),

    CONSTRAINT "Telefonnotiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VorOrtRueckmeldung" (
    "id" TEXT NOT NULL,
    "planungId" TEXT NOT NULL,
    "aushangOk" BOOLEAN,
    "werbungOk" BOOLEAN,
    "unterbrechung" TEXT,
    "rueckmeldung" TEXT NOT NULL,
    "gemeldetAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VorOrtRueckmeldung_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Mangel" ADD CONSTRAINT "Mangel_begehungId_fkey" FOREIGN KEY ("begehungId") REFERENCES "Inspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mangel" ADD CONSTRAINT "Mangel_textbausteinId_fkey" FOREIGN KEY ("textbausteinId") REFERENCES "Textbaustein"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_freigegebenVonId_fkey" FOREIGN KEY ("freigegebenVonId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vorankuendigung" ADD CONSTRAINT "Vorankuendigung_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Telefonnotiz" ADD CONSTRAINT "Telefonnotiz_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VorOrtRueckmeldung" ADD CONSTRAINT "VorOrtRueckmeldung_planungId_fkey" FOREIGN KEY ("planungId") REFERENCES "PlanungEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
