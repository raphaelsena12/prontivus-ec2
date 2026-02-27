-- CreateTable
CREATE TABLE "medicos_certificados_digitais" (
    "id" TEXT NOT NULL,
    "clinicaId" TEXT NOT NULL,
    "medicoId" TEXT NOT NULL,
    "pfxS3Key" TEXT NOT NULL,
    "pfxMimeType" TEXT NOT NULL,
    "pfxTamanho" INTEGER NOT NULL,
    "senhaEnc" TEXT NOT NULL,
    "validTo" TIMESTAMP(3),
    "subject" TEXT,
    "issuer" TEXT,
    "serialNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medicos_certificados_digitais_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "medicos_certificados_digitais_medicoId_key" ON "medicos_certificados_digitais"("medicoId");

-- CreateIndex
CREATE INDEX "medicos_certificados_digitais_clinicaId_idx" ON "medicos_certificados_digitais"("clinicaId");

-- AddForeignKey
ALTER TABLE "medicos_certificados_digitais" ADD CONSTRAINT "medicos_certificados_digitais_clinicaId_fkey" FOREIGN KEY ("clinicaId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicos_certificados_digitais" ADD CONSTRAINT "medicos_certificados_digitais_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "medicos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

